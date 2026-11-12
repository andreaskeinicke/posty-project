const dns = require('dns').promises;
const net = require('net');

// Registries that run RDAP but are missing from the IANA bootstrap file.
// .io and .me are operated by Identity Digital (their WHOIS hosts are aliases
// of whois.identitydigital.services).
const RDAP_OVERRIDES = {
  io: 'https://rdap.identitydigital.services/rdap/',
  me: 'https://rdap.identitydigital.services/rdap/'
};
const whois = require('whois-json');
const NodeCache = require('node-cache');
const cloudflareService = require('./cloudflareService');

/**
 * Domain Availability Checker Service
 * Primary: Cloudflare Registrar API (FREE, accurate, includes pricing)
 * Fallback: DNS + WHOIS (when Cloudflare is not configured)
 *
 * Implements caching to avoid rate limits
 */
class DomainAvailabilityService {
  constructor() {
    // Cache results for 24 hours (86400 seconds)
    this.cache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });
    this.checkInProgress = new Map(); // Prevent duplicate simultaneous checks

    // Log which service is configured
    if (cloudflareService.isReady()) {
      console.log('✓ Domain checking: Using Cloudflare Registrar API (FREE)');
    } else {
      console.log('⚠️  Domain checking: Using DNS/WHOIS fallback');
      console.log('   Configure Cloudflare for better accuracy and pricing data');
    }
  }

  /**
   * Check if a domain is available
   * @param {string} domain - Full domain name (e.g., "example.com")
   * @returns {Promise<Object>} - { domain, available, status, checkedAt }
   */
  async checkDomain(domain) {
    const normalizedDomain = domain.toLowerCase().trim();

    // Check cache first
    const cached = this.cache.get(normalizedDomain);
    if (cached) {
      console.log(`📦 Cache hit for ${normalizedDomain}`);
      return cached;
    }

    // Check if already being checked (prevent duplicates)
    if (this.checkInProgress.has(normalizedDomain)) {
      console.log(`⏳ Check already in progress for ${normalizedDomain}`);
      return await this.checkInProgress.get(normalizedDomain);
    }

    // Start new check
    const checkPromise = this._performCheck(normalizedDomain);
    this.checkInProgress.set(normalizedDomain, checkPromise);

    try {
      const result = await checkPromise;
      // Only cache verified answers. An 'unknown' or 'error' is usually a
      // lookup outage; caching it would hide the domain for 24 hours.
      if (result.status === 'available' || result.status === 'taken') {
        this.cache.set(normalizedDomain, result);
      }
      return result;
    } finally {
      this.checkInProgress.delete(normalizedDomain);
    }
  }

  /**
   * Perform the actual domain check.
   * Strategy: DNS NS lookup (fast negative) → registry RDAP → registry WHOIS.
   * RDAP 404 = unregistered = available. RDAP 200 = registered = taken.
   */
  async _performCheck(domain) {
    console.log(`🔍 Checking availability for ${domain}`);

    const result = {
      domain,
      available: false,
      status: 'taken', // 'available', 'taken', 'premium', 'error'
      price: this._estimatePrice(domain),
      checkedAt: new Date().toISOString(),
      method: 'unknown'
    };

    try {
      // Step 1: registered domains virtually always have NS records
      const hasNameservers = await this._hasNameservers(domain);
      if (hasNameservers) {
        result.status = 'taken';
        result.method = 'dns';
        console.log(`✓ ${domain}: taken (dns)`);
        return result;
      }

      // Step 2: authoritative check against the registry.
      // RDAP first; WHOIS for TLDs without RDAP (.dk, .eu, .de ...) or when
      // RDAP is unreachable.
      let verdict = await this._checkRDAP(domain);
      result.method = 'rdap';
      if (verdict === 'unknown') {
        verdict = await this._checkRegistryWhois(domain);
        result.method = 'whois';
      }
      if (verdict === 'available') {
        result.available = true;
        result.status = 'available';
      } else if (verdict === 'taken') {
        result.status = 'taken';
      } else {
        // No registry answer — no NS records is a decent signal,
        // but don't promise availability we can't verify
        result.status = 'unknown';
        result.method = 'dns-only';
      }
    } catch (error) {
      console.error(`Error checking ${domain}:`, error.message);
      result.status = 'error';
      result.error = error.message;
      result.method = 'error';
    }

    console.log(`✓ ${domain}: ${result.status} (${result.method})`);
    return result;
  }

  /**
   * Load the IANA RDAP bootstrap (TLD -> registry RDAP base URL). Cached for
   * 24h; on failure the previous copy (or an empty map) is used and the load
   * is retried after a minute.
   */
  async _rdapBootstrap() {
    const now = Date.now();
    if (this._bootstrap && now < this._bootstrapExpires) return this._bootstrap;
    if (!this._bootstrapLoading) {
      this._bootstrapLoading = (async () => {
        try {
          const response = await fetch('https://data.iana.org/rdap/dns.json', {
            signal: AbortSignal.timeout(8000)
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          const map = new Map();
          for (const [tlds, urls] of data.services || []) {
            const base = (urls || []).find(u => u.startsWith('https://')) || (urls || [])[0];
            if (!base) continue;
            for (const tld of tlds) map.set(tld.toLowerCase(), base.endsWith('/') ? base : `${base}/`);
          }
          this._bootstrap = map;
          this._bootstrapExpires = Date.now() + 24 * 60 * 60 * 1000;
        } catch (error) {
          console.warn(`RDAP bootstrap load failed: ${error.message}`);
          this._bootstrap = this._bootstrap || new Map();
          this._bootstrapExpires = Date.now() + 60 * 1000;
        } finally {
          this._bootstrapLoading = null;
        }
        return this._bootstrap;
      })();
    }
    return this._bootstrapLoading;
  }

  /**
   * RDAP lookup straight at the registry's own server (from the IANA
   * bootstrap). rdap.org is not used: it rejects requests from cloud hosts.
   * @returns {'available'|'taken'|'unknown'}
   */
  async _checkRDAP(domain) {
    try {
      const tld = domain.slice(domain.lastIndexOf('.') + 1);
      const base = (await this._rdapBootstrap()).get(tld) || RDAP_OVERRIDES[tld];
      if (!base) return 'unknown'; // TLD has no RDAP service
      const response = await fetch(`${base}domain/${encodeURIComponent(domain)}`, {
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/rdap+json' }
      });
      if (response.status === 404) return 'available';
      if (response.ok) return 'taken';
      console.warn(`RDAP ${response.status} for ${domain}`);
      return 'unknown';
    } catch (error) {
      console.warn(`RDAP check failed for ${domain}: ${error.message}`);
      return 'unknown';
    }
  }

  /** Raw WHOIS query (port 43). Resolves with the response text. */
  _whoisQuery(server, query, timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
      let data = '';
      const socket = net.createConnection({ host: server, port: 43 });
      socket.setTimeout(timeoutMs);
      socket.on('connect', () => socket.write(`${query}\r\n`));
      socket.on('data', chunk => { data += chunk.toString('utf8'); });
      socket.on('end', () => resolve(data));
      socket.on('timeout', () => socket.destroy(new Error('WHOIS timeout')));
      socket.on('error', reject);
    });
  }

  /** Find the registry WHOIS server for a TLD via whois.iana.org (cached). */
  async _whoisServerFor(tld) {
    this._whoisServers = this._whoisServers || new Map();
    if (this._whoisServers.has(tld)) return this._whoisServers.get(tld);
    const answer = await this._whoisQuery('whois.iana.org', tld);
    const match = answer.match(/^whois:\s*(\S+)/im);
    const server = match ? match[1] : null;
    this._whoisServers.set(tld, server);
    return server;
  }

  /**
   * Interpret a registry WHOIS response.
   * @returns {'available'|'taken'|'unknown'}
   */
  _parseWhois(text) {
    const body = (text || '').toLowerCase();
    if (!body.trim()) return 'unknown';
    const rateLimited = ['limit exceeded', 'quota exceeded', 'too many', 'try again later', 'access denied'];
    if (rateLimited.some(marker => body.includes(marker))) return 'unknown';
    const free = [
      'no entries found', 'no match', 'not found', 'no data found',
      'status: available', 'status: free', 'is available for', 'no object found',
      'domain not registered', 'not registered', 'no such domain'
    ];
    if (free.some(marker => body.includes(marker))) return 'available';
    const registered = [
      'domain:', 'domain name:', 'registrar:', 'registered:', 'creation date', 'status: active',
      'status: connect', 'name server', 'nserver'
    ];
    if (registered.some(marker => body.includes(marker))) return 'taken';
    return 'unknown';
  }

  /**
   * Registry WHOIS check, for TLDs without RDAP or when RDAP is down.
   * @returns {'available'|'taken'|'unknown'}
   */
  async _checkRegistryWhois(domain) {
    try {
      const tld = domain.slice(domain.lastIndexOf('.') + 1);
      const server = await this._whoisServerFor(tld);
      if (!server) return 'unknown';
      // DENIC needs its own query syntax to return status lines
      const query = tld === 'de' ? `-T dn ${domain}` : domain;
      const answer = await this._whoisQuery(server, query);
      const verdict = this._parseWhois(answer);
      if (verdict === 'unknown') {
        // Log the start of answers we cannot classify, so new formats can be added
        console.warn(`WHOIS unclassified for ${domain} via ${server}: ${answer.slice(0, 300).replace(/\s+/g, ' ')}`);
      }
      return verdict;
    } catch (error) {
      console.warn(`WHOIS check failed for ${domain}: ${error.message}`);
      return 'unknown';
    }
  }

  /**
   * Rough retail registration price per TLD (USD/year).
   * TODO: replace with live registrar pricing before scaling.
   */
  _estimatePrice(domain) {
    const tld = domain.slice(domain.indexOf('.'));
    const prices = {
      '.com': 13, '.net': 14, '.org': 13, '.dk': 12, '.eu': 9,
      '.io': 45, '.me': 22, '.co': 30, '.email': 25, '.dev': 15,
      '.app': 17, '.xyz': 13, '.club': 14, '.online': 30, '.uk': 9
    };
    return prices[tld] || 20;
  }

  /**
   * Check for NS records - registered domains almost always have them
   */
  async _hasNameservers(domain) {
    try {
      const records = await dns.resolveNs(domain);
      return records.length > 0;
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        return false;
      }
      // Other DNS errors (timeout etc.) — treat as no signal, RDAP decides
      return false;
    }
  }

  /**
   * Check WHOIS for registration status
   */
  async _checkWHOIS(domain) {
    try {
      const data = await whois(domain, { follow: 1, timeout: 5000 });

      // Parse WHOIS response
      const dataStr = JSON.stringify(data).toLowerCase();

      // Check for availability indicators
      const availableIndicators = [
        'no match',
        'not found',
        'no entries found',
        'no data found',
        'available for registration',
        'status: free',
        'not registered'
      ];

      const isAvailable = availableIndicators.some(indicator =>
        dataStr.includes(indicator)
      );

      // Check for premium/marketplace indicators
      const premiumIndicators = [
        'premium',
        'marketplace',
        'aftermarket',
        'for sale'
      ];

      const isPremium = premiumIndicators.some(indicator =>
        dataStr.includes(indicator)
      );

      return {
        available: isAvailable,
        premium: isPremium,
        raw: data
      };
    } catch (error) {
      // WHOIS timeout or error - assume taken to be safe
      console.warn(`WHOIS check failed for ${domain}:`, error.message);
      return { available: false, premium: false };
    }
  }

  /**
   * Batch check multiple domains (limited concurrency to be kind to RDAP servers)
   */
  async checkMultipleDomains(domains, concurrency = 8) {
    const results = new Array(domains.length);
    let cursor = 0;

    const worker = async () => {
      while (cursor < domains.length) {
        const index = cursor++;
        try {
          results[index] = await this.checkDomain(domains[index]);
        } catch (error) {
          results[index] = {
            domain: domains[index],
            available: false,
            status: 'error',
            error: error?.message || 'Unknown error',
            checkedAt: new Date().toISOString()
          };
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, domains.length) }, worker));
    return results;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      keys: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
      inProgress: this.checkInProgress.size
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.flushAll();
    console.log('🗑️  Domain cache cleared');
  }
}

module.exports = new DomainAvailabilityService();
