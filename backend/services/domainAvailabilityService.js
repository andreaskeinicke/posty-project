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
   * Perform the actual domain check
   */
  async _performCheck(domain) {
    console.log(`🔍 Checking availability for ${domain}`);

    const result = {
      domain,
      available: false,
      status: 'taken', // 'available', 'taken', 'premium', 'error'
      checkedAt: new Date().toISOString(),
      method: 'unknown'
    };

    try {
      // Try Cloudflare first (if configured)
      if (cloudflareService.isReady()) {
        try {
          const cloudflareResult = await cloudflareService.checkDomain(domain);
          console.log(`✓ ${domain}: ${cloudflareResult.status} (cloudflare)`);
          return cloudflareResult;
        } catch (cloudflareError) {
          console.warn(`Cloudflare check failed for ${domain}, falling back to DNS/WHOIS`);
          console.warn(`Error: ${cloudflareError.message}`);
          // Continue to fallback methods below
        }
      }

      // Fallback: DNS + WHOIS check
      // Step 1: Quick DNS check
      const dnsAvailable = await this._checkDNS(domain);

      if (dnsAvailable) {
        // Domain doesn't resolve - likely available
        // Confirm with WHOIS for accuracy
        const whoisResult = await this._checkWHOIS(domain);

        if (whoisResult.available) {
          result.available = true;
          result.status = 'available';
          result.method = 'whois';
        } else if (whoisResult.premium) {
          result.available = false;
          result.status = 'premium';
          result.method = 'whois';
        } else {
          result.available = false;
          result.status = 'taken';
          result.method = 'whois';
        }
      } else {
        // Domain resolves - definitely taken
        result.available = false;
        result.status = 'taken';
        result.method = 'dns';
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
   * Check DNS - if domain resolves, it's taken
   */
  async _checkDNS(domain) {
    try {
      await dns.resolve4(domain);
      // Domain resolves = taken
      return false;
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        // Domain doesn't resolve = potentially available
        return true;
      }
      // Other DNS errors
      throw error;
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
   * Batch check multiple domains
   */
  async checkMultipleDomains(domains) {
    const results = await Promise.allSettled(
      domains.map(domain => this.checkDomain(domain))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          domain: domains[index],
          available: false,
          status: 'error',
          error: result.reason?.message || 'Unknown error',
          checkedAt: new Date().toISOString()
        };
      }
    });
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
