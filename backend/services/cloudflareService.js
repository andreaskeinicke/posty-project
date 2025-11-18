const Cloudflare = require('cloudflare');
const NodeCache = require('node-cache');

/**
 * Cloudflare Domain Availability Service
 * Uses Cloudflare's Registrar API for accurate, FREE domain availability checking
 *
 * Features:
 * - FREE domain availability checks (no per-request charges)
 * - Accurate results from actual registrar data
 * - Support for 200+ TLDs
 * - Pricing information included
 * - Fast response times
 */
class CloudflareService {
  constructor() {
    // Initialize Cloudflare client
    this.client = null;
    this.isConfigured = false;

    // Cache results for 6 hours (21600 seconds)
    // Domain availability doesn't change frequently, so we can cache longer
    this.cache = new NodeCache({ stdTTL: 21600, checkperiod: 1800 });
    this.checkInProgress = new Map();

    this._initialize();
  }

  /**
   * Initialize Cloudflare client
   */
  _initialize() {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!apiToken || !accountId) {
      console.warn('⚠️  Cloudflare API credentials not configured');
      console.warn('   Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in .env');
      console.warn('   Falling back to DNS/WHOIS checking');
      return;
    }

    try {
      this.client = new Cloudflare({
        apiToken: apiToken
      });
      this.accountId = accountId;
      this.isConfigured = true;
      console.log('✓ Cloudflare domain service initialized');
    } catch (error) {
      console.error('Failed to initialize Cloudflare client:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Check if Cloudflare is configured and ready
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Check domain availability using Cloudflare Registrar API
   * @param {string} domain - Full domain name (e.g., "example.com")
   * @returns {Promise<Object>} - { domain, available, status, price, currency, checkedAt }
   */
  async checkDomain(domain) {
    const normalizedDomain = domain.toLowerCase().trim();

    // Check cache first
    const cached = this.cache.get(normalizedDomain);
    if (cached) {
      console.log(`📦 Cloudflare cache hit for ${normalizedDomain}`);
      return cached;
    }

    // Check if already being checked (prevent duplicates)
    if (this.checkInProgress.has(normalizedDomain)) {
      console.log(`⏳ Cloudflare check already in progress for ${normalizedDomain}`);
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
   * Perform the actual Cloudflare domain check
   */
  async _performCheck(domain) {
    if (!this.isConfigured) {
      throw new Error('Cloudflare service not configured');
    }

    console.log(`☁️  Checking ${domain} via Cloudflare Registrar API`);

    try {
      // Use direct API for domain availability checking
      return await this._checkAvailability(domain);

    } catch (error) {
      console.error(`Error checking ${domain} with Cloudflare:`, error.message);
      throw error;
    }
  }

  /**
   * Check domain availability using search endpoint
   */
  async _checkAvailability(domain) {
    try {
      // Use the domain availability check endpoint
      // This is a lighter endpoint that doesn't require the domain to be in your account
      const searchUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/registrar/domains/${domain}/check`;

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Try alternate method - search for available domains
        return await this._searchDomain(domain);
      }

      const data = await response.json();

      if (data.success && data.result) {
        const result = data.result;

        return {
          domain,
          available: result.available === true,
          status: result.available ? 'available' : 'taken',
          premium: result.premium || false,
          price: result.price || null,
          currency: result.currency || 'USD',
          method: 'cloudflare',
          checkedAt: new Date().toISOString()
        };
      }

      throw new Error('Unexpected response from Cloudflare');

    } catch (error) {
      console.warn(`Cloudflare availability check failed for ${domain}:`, error.message);
      // Return error status so caller can fall back to DNS/WHOIS
      throw error;
    }
  }

  /**
   * Search for domain availability (alternate method)
   */
  async _searchDomain(domain) {
    try {
      // Extract the name and TLD
      const parts = domain.split('.');
      if (parts.length < 2) {
        throw new Error('Invalid domain format');
      }

      const name = parts.slice(0, -1).join('.');
      const tld = parts[parts.length - 1];

      // Use Cloudflare's search endpoint
      const searchUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/registrar/domains/search?name=${name}&tlds=${tld}`;

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.result && data.result.length > 0) {
        const match = data.result.find(d => d.name === domain);

        if (match) {
          return {
            domain,
            available: match.available === true,
            status: match.available ? 'available' : 'taken',
            premium: match.premium || false,
            price: match.price || null,
            currency: match.currency || 'USD',
            method: 'cloudflare',
            checkedAt: new Date().toISOString()
          };
        }
      }

      // If no match found, assume taken
      return {
        domain,
        available: false,
        status: 'taken',
        method: 'cloudflare',
        checkedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Domain search failed for ${domain}:`, error.message);
      throw error;
    }
  }

  /**
   * Batch check multiple domains
   * @param {string[]} domains - Array of domain names
   * @returns {Promise<Object[]>} - Array of check results
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
          method: 'cloudflare',
          checkedAt: new Date().toISOString()
        };
      }
    });
  }

  /**
   * Get pricing for a specific TLD
   * @param {string} tld - TLD without dot (e.g., "com", "io", "dev")
   * @returns {Promise<Object>} - Pricing information
   */
  async getTLDPricing(tld) {
    if (!this.isConfigured) {
      throw new Error('Cloudflare service not configured');
    }

    const cacheKey = `pricing_${tld}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get TLD pricing from Cloudflare
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/registrar/domains/pricing?tld=${tld}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get pricing for .${tld}`);
      }

      const data = await response.json();

      if (data.success && data.result) {
        const pricing = {
          tld,
          registration: data.result.registration_price,
          renewal: data.result.renewal_price,
          transfer: data.result.transfer_price,
          currency: data.result.currency || 'USD'
        };

        this.cache.set(cacheKey, pricing, 86400); // Cache for 24 hours
        return pricing;
      }

      throw new Error('Unexpected pricing response');

    } catch (error) {
      console.error(`Failed to get pricing for .${tld}:`, error.message);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      keys: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
      inProgress: this.checkInProgress.size,
      configured: this.isConfigured
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.flushAll();
    console.log('🗑️  Cloudflare domain cache cleared');
  }
}

module.exports = new CloudflareService();
