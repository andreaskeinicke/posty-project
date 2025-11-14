const axios = require('axios');
const dns = require('dns').promises;

class DomainService {
  constructor() {
    this.godaddyKey = process.env.GODADDY_API_KEY;
    this.godaddySecret = process.env.GODADDY_API_SECRET;
    this.namecheapUser = process.env.NAMECHEAP_API_USER;
    this.namecheapKey = process.env.NAMECHEAP_API_KEY;
  }

  /**
   * Check domain availability using multiple methods
   * @param {string} domain - Domain name to check
   * @returns {Promise<Object>} - Availability status
   */
  async checkAvailability(domain) {
    // Clean domain name
    const cleanDomain = this.cleanDomainName(domain);

    try {
      // Try GoDaddy API first if available
      if (this.godaddyKey && this.godaddySecret) {
        return await this.checkGoDaddy(cleanDomain);
      }

      // Fallback to DNS-based check
      return await this.checkDNS(cleanDomain);
    } catch (error) {
      console.error(`Domain check error for ${cleanDomain}:`, error.message);
      return {
        domain: cleanDomain,
        available: null,
        error: error.message,
        method: 'error'
      };
    }
  }

  /**
   * Check multiple domains in bulk
   * @param {Array<string>} domains - Array of domain names
   * @returns {Promise<Array>} - Array of availability results
   */
  async bulkCheck(domains) {
    const results = await Promise.all(
      domains.map(domain => this.checkAvailability(domain))
    );
    return results;
  }

  /**
   * Check domain availability via GoDaddy API
   * @param {string} domain - Domain name
   * @returns {Promise<Object>} - Availability result
   */
  async checkGoDaddy(domain) {
    try {
      const response = await axios.get(
        `https://api.godaddy.com/v1/domains/available?domain=${domain}`,
        {
          headers: {
            'Authorization': `sso-key ${this.godaddyKey}:${this.godaddySecret}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        domain: domain,
        available: response.data.available,
        price: response.data.price,
        currency: response.data.currency,
        period: response.data.period,
        method: 'godaddy'
      };
    } catch (error) {
      throw new Error(`GoDaddy API error: ${error.message}`);
    }
  }

  /**
   * Check domain availability via Namecheap API
   * @param {string} domain - Domain name
   * @returns {Promise<Object>} - Availability result
   */
  async checkNamecheap(domain) {
    try {
      const response = await axios.get('https://api.namecheap.com/xml.response', {
        params: {
          ApiUser: this.namecheapUser,
          ApiKey: this.namecheapKey,
          UserName: this.namecheapUser,
          Command: 'namecheap.domains.check',
          ClientIp: '127.0.0.1', // You may need to use actual client IP
          DomainList: domain
        }
      });

      // Parse XML response (you may want to use a proper XML parser)
      const available = response.data.includes('Available="true"');

      return {
        domain: domain,
        available: available,
        method: 'namecheap'
      };
    } catch (error) {
      throw new Error(`Namecheap API error: ${error.message}`);
    }
  }

  /**
   * Check domain via DNS lookup (fallback method)
   * Note: This is not 100% accurate but works without API keys
   * @param {string} domain - Domain name
   * @returns {Promise<Object>} - Availability result
   */
  async checkDNS(domain) {
    try {
      // Try to resolve the domain
      await dns.resolve(domain);

      // If we get here, domain is registered (has DNS records)
      return {
        domain: domain,
        available: false,
        method: 'dns',
        note: 'Domain has active DNS records (likely registered)'
      };
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        // Domain not found - likely available
        return {
          domain: domain,
          available: true,
          method: 'dns',
          note: 'No DNS records found (likely available, but verify with registrar)'
        };
      }

      // Other DNS errors
      return {
        domain: domain,
        available: null,
        error: error.message,
        method: 'dns'
      };
    }
  }

  /**
   * Generate domain suggestions based on keywords
   * @param {string} keyword - Base keyword
   * @param {Object} options - Options (TLDs, prefixes, suffixes)
   * @returns {Array<string>} - Array of suggested domains
   */
  generateSuggestions(keyword, options = {}) {
    const {
      tlds = ['com', 'net', 'io', 'co', 'app', 'email'],
      prefixes = ['get', 'my', 'the', 'try'],
      suffixes = ['hq', 'hub', 'pro', 'mail'],
      includeHyphens = false
    } = options;

    const suggestions = [];
    const cleanKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Base domain with different TLDs
    tlds.forEach(tld => {
      suggestions.push(`${cleanKeyword}.${tld}`);
    });

    // With prefixes
    prefixes.forEach(prefix => {
      tlds.slice(0, 3).forEach(tld => {
        suggestions.push(`${prefix}${cleanKeyword}.${tld}`);
        if (includeHyphens) {
          suggestions.push(`${prefix}-${cleanKeyword}.${tld}`);
        }
      });
    });

    // With suffixes
    suffixes.forEach(suffix => {
      tlds.slice(0, 3).forEach(tld => {
        suggestions.push(`${cleanKeyword}${suffix}.${tld}`);
        if (includeHyphens) {
          suggestions.push(`${cleanKeyword}-${suffix}.${tld}`);
        }
      });
    });

    // Remove duplicates and return
    return [...new Set(suggestions)];
  }

  /**
   * Clean and validate domain name
   * @param {string} domain - Domain name to clean
   * @returns {string} - Cleaned domain name
   */
  cleanDomainName(domain) {
    return domain
      .toLowerCase()
      .trim()
      .replace(/^(https?:\/\/)?(www\.)?/, '') // Remove protocol and www
      .replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Validate domain name format
   * @param {string} domain - Domain to validate
   * @returns {boolean} - True if valid
   */
  isValidDomain(domain) {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
    return domainRegex.test(domain);
  }

  /**
   * Get popular TLDs for email domains
   * @returns {Array} - Array of TLD objects with info
   */
  getPopularEmailTLDs() {
    return [
      { tld: 'com', name: 'Commercial', description: 'Most popular and trusted', recommended: true },
      { tld: 'net', name: 'Network', description: 'Good alternative to .com', recommended: true },
      { tld: 'io', name: 'Input/Output', description: 'Popular with tech companies', recommended: true },
      { tld: 'co', name: 'Company', description: 'Short and professional', recommended: true },
      { tld: 'email', name: 'Email', description: 'Clearly indicates email service', recommended: false },
      { tld: 'app', name: 'Application', description: 'Modern and tech-focused', recommended: false },
      { tld: 'pro', name: 'Professional', description: 'For professionals', recommended: false },
      { tld: 'org', name: 'Organization', description: 'For organizations', recommended: false }
    ];
  }
}

module.exports = new DomainService();
