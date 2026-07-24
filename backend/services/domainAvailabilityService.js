const dns = require('dns').promises;
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
      this.cache.set(normalizedDomain, result);
      return result;
    } finally {
      this.checkInProgress.delete(normalizedDomain);
    }
  }

  /**
   * Perform the actual domain check.
   * Strategy: DNS NS lookup (fast negative) → RDAP registry query (authoritative).
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

      // Step 2: authoritative RDAP check against the registry
      const rdap = await this._checkRDAP(domain);
      result.method = 'rdap';
      if (rdap === 'available') {
        result.available = true;
        result.status = 'available';
      } else if (rdap === 'taken') {
        result.status = 'taken';
      } else {
        // RDAP unreachable for this TLD — no NS records is a decent signal,
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
   * RDAP lookup via rdap.org bootstrap (redirects to the registry's RDAP server).
   * @returns {'available'|'taken'|'unknown'}
   */
  async _checkRDAP(domain) {
    try {
      const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/rdap+json' }
      });
      if (response.status === 404) return 'available';
      if (response.ok) return 'taken';
      return 'unknown';
    } catch (error) {
      console.warn(`RDAP check failed for ${domain}: ${error.message}`);
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
