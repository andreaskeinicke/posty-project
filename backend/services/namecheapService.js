// Optional dependency: namecheap@0.0.1 needs a native build (node-expat) that
// breaks cloud builds. Registration is manual (concierge mode) until the Phase 2
// rewrite of this service on plain HTTP — see LAUNCH_PLAN.md.
let Namecheap = null;
try {
  Namecheap = require('namecheap');
} catch {
  console.warn('⚠️  namecheap package not installed — registration service disabled (concierge mode)');
}

/**
 * Namecheap Domain Registration Service
 * Handles domain registration via Namecheap API
 */
class NamecheapService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.defaultContacts = null;
    this._initialize();
  }

  /**
   * Initialize Namecheap client
   */
  _initialize() {
    if (!Namecheap) {
      return; // package not installed — service stays disabled
    }

    const username = process.env.NAMECHEAP_API_USER;
    const apiKey = process.env.NAMECHEAP_API_KEY;
    const clientIp = process.env.NAMECHEAP_CLIENT_IP;
    const sandbox = process.env.NAMECHEAP_SANDBOX === 'true';

    if (!username || !apiKey || !clientIp) {
      console.warn('⚠️  Namecheap API credentials not configured');
      console.warn('   Set NAMECHEAP_API_USER, NAMECHEAP_API_KEY, and NAMECHEAP_CLIENT_IP in .env');
      return;
    }

    try {
      // Create Namecheap client - sandbox is passed as 4th parameter
      this.client = new Namecheap(username, apiKey, clientIp, sandbox);

      // Log initialization mode
      if (sandbox) {
        console.log('✓ Namecheap initialized in SANDBOX mode');
      } else {
        console.log('✓ Namecheap initialized in PRODUCTION mode');
      }

      this.isConfigured = true;

      // Set default contact information
      this._setDefaultContacts();

    } catch (error) {
      console.error('Failed to initialize Namecheap client:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Set default contact information for domain registrations
   */
  _setDefaultContacts() {
    this.defaultContacts = {
      RegistrantFirstName: process.env.NAMECHEAP_DEFAULT_FIRST_NAME || 'John',
      RegistrantLastName: process.env.NAMECHEAP_DEFAULT_LAST_NAME || 'Doe',
      RegistrantAddress1: process.env.NAMECHEAP_DEFAULT_ADDRESS || '123 Main St',
      RegistrantCity: process.env.NAMECHEAP_DEFAULT_CITY || 'New York',
      RegistrantStateProvince: process.env.NAMECHEAP_DEFAULT_STATE || 'NY',
      RegistrantPostalCode: process.env.NAMECHEAP_DEFAULT_POSTAL_CODE || '10001',
      RegistrantCountry: process.env.NAMECHEAP_DEFAULT_COUNTRY || 'US',
      RegistrantPhone: process.env.NAMECHEAP_DEFAULT_PHONE || '+1.2125551234',
      RegistrantEmailAddress: process.env.NAMECHEAP_DEFAULT_EMAIL || 'admin@example.com',

      // Tech contact (same as registrant by default)
      TechFirstName: process.env.NAMECHEAP_DEFAULT_FIRST_NAME || 'John',
      TechLastName: process.env.NAMECHEAP_DEFAULT_LAST_NAME || 'Doe',
      TechAddress1: process.env.NAMECHEAP_DEFAULT_ADDRESS || '123 Main St',
      TechCity: process.env.NAMECHEAP_DEFAULT_CITY || 'New York',
      TechStateProvince: process.env.NAMECHEAP_DEFAULT_STATE || 'NY',
      TechPostalCode: process.env.NAMECHEAP_DEFAULT_POSTAL_CODE || '10001',
      TechCountry: process.env.NAMECHEAP_DEFAULT_COUNTRY || 'US',
      TechPhone: process.env.NAMECHEAP_DEFAULT_PHONE || '+1.2125551234',
      TechEmailAddress: process.env.NAMECHEAP_DEFAULT_EMAIL || 'admin@example.com',

      // Admin contact (same as registrant by default)
      AdminFirstName: process.env.NAMECHEAP_DEFAULT_FIRST_NAME || 'John',
      AdminLastName: process.env.NAMECHEAP_DEFAULT_LAST_NAME || 'Doe',
      AdminAddress1: process.env.NAMECHEAP_DEFAULT_ADDRESS || '123 Main St',
      AdminCity: process.env.NAMECHEAP_DEFAULT_CITY || 'New York',
      AdminStateProvince: process.env.NAMECHEAP_DEFAULT_STATE || 'NY',
      AdminPostalCode: process.env.NAMECHEAP_DEFAULT_POSTAL_CODE || '10001',
      AdminCountry: process.env.NAMECHEAP_DEFAULT_COUNTRY || 'US',
      AdminPhone: process.env.NAMECHEAP_DEFAULT_PHONE || '+1.2125551234',
      AdminEmailAddress: process.env.NAMECHEAP_DEFAULT_EMAIL || 'admin@example.com',

      // Billing contact (same as registrant by default)
      AuxBillingFirstName: process.env.NAMECHEAP_DEFAULT_FIRST_NAME || 'John',
      AuxBillingLastName: process.env.NAMECHEAP_DEFAULT_LAST_NAME || 'Doe',
      AuxBillingAddress1: process.env.NAMECHEAP_DEFAULT_ADDRESS || '123 Main St',
      AuxBillingCity: process.env.NAMECHEAP_DEFAULT_CITY || 'New York',
      AuxBillingStateProvince: process.env.NAMECHEAP_DEFAULT_STATE || 'NY',
      AuxBillingPostalCode: process.env.NAMECHEAP_DEFAULT_POSTAL_CODE || '10001',
      AuxBillingCountry: process.env.NAMECHEAP_DEFAULT_COUNTRY || 'US',
      AuxBillingPhone: process.env.NAMECHEAP_DEFAULT_PHONE || '+1.2125551234',
      AuxBillingEmailAddress: process.env.NAMECHEAP_DEFAULT_EMAIL || 'admin@example.com'
    };
  }

  /**
   * Check if Namecheap is configured and ready
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Check domain availability
   * @param {string} domain - Domain name to check
   * @returns {Promise<boolean>} - True if available
   */
  async checkAvailability(domain) {
    if (!this.isConfigured) {
      throw new Error('Namecheap service not configured');
    }

    return new Promise((resolve, reject) => {
      this.client.domains.check(domain, (err, data) => {
        if (err) {
          reject(new Error(`Namecheap availability check failed: ${err.message}`));
          return;
        }

        // Parse Namecheap response
        const available = data?.DomainCheckResult?.[0]?.Available === 'true';
        resolve(available);
      });
    });
  }

  /**
   * Register a domain
   * @param {string} domainName - Full domain name (e.g., "example.com")
   * @param {number} years - Number of years to register (default: 1)
   * @param {Object} contacts - Optional custom contact information
   * @returns {Promise<Object>} - Registration result
   */
  async registerDomain(domainName, years = 1, contacts = null) {
    if (!this.isConfigured) {
      throw new Error('Namecheap service not configured');
    }

    console.log(`📝 Registering domain ${domainName} via Namecheap for ${years} year(s)`);

    // Use provided contacts or fall back to defaults
    const registrationContacts = contacts ? { ...this.defaultContacts, ...contacts } : this.defaultContacts;

    return new Promise((resolve, reject) => {
      this.client.domains.create(
        domainName,
        years,
        registrationContacts,
        (err, data) => {
          if (err) {
            console.error(`❌ Namecheap registration failed for ${domainName}:`, err.message);
            reject(new Error(`Domain registration failed: ${err.message}`));
            return;
          }

          console.log(`✅ Domain ${domainName} registered successfully via Namecheap`);

          // Parse response
          const result = data?.DomainCreateResult?.[0];

          resolve({
            success: true,
            domain: domainName,
            domainId: result?.DomainID,
            registered: result?.Registered === 'true',
            chargedAmount: parseFloat(result?.ChargedAmount || 0),
            orderId: result?.OrderID,
            transactionId: result?.TransactionID,
            registeredAt: new Date().toISOString()
          });
        }
      );
    });
  }

  /**
   * Update nameservers for a domain
   * @param {string} domainName - Full domain name
   * @param {string[]} nameservers - Array of nameserver addresses
   * @returns {Promise<Object>} - Update result
   */
  async updateNameservers(domainName, nameservers) {
    if (!this.isConfigured) {
      throw new Error('Namecheap service not configured');
    }

    console.log(`🔄 Updating nameservers for ${domainName} to:`, nameservers);

    return new Promise((resolve, reject) => {
      this.client.domains.dns.setCustom(domainName, nameservers, (err, data) => {
        if (err) {
          console.error(`❌ Nameserver update failed for ${domainName}:`, err.message);
          reject(new Error(`Nameserver update failed: ${err.message}`));
          return;
        }

        console.log(`✅ Nameservers updated for ${domainName}`);

        resolve({
          success: true,
          domain: domainName,
          nameservers,
          updatedAt: new Date().toISOString()
        });
      });
    });
  }

  /**
   * Get domain information
   * @param {string} domainName - Full domain name
   * @returns {Promise<Object>} - Domain information
   */
  async getDomainInfo(domainName) {
    if (!this.isConfigured) {
      throw new Error('Namecheap service not configured');
    }

    return new Promise((resolve, reject) => {
      this.client.domains.getInfo(domainName, (err, data) => {
        if (err) {
          reject(new Error(`Failed to get domain info: ${err.message}`));
          return;
        }

        resolve(data);
      });
    });
  }

  /**
   * Get list of all domains in account
   * @returns {Promise<Array>} - List of domains
   */
  async listDomains() {
    if (!this.isConfigured) {
      throw new Error('Namecheap service not configured');
    }

    return new Promise((resolve, reject) => {
      this.client.domains.getList((err, data) => {
        if (err) {
          reject(new Error(`Failed to list domains: ${err.message}`));
          return;
        }

        resolve(data?.DomainGetListResult || []);
      });
    });
  }
}

module.exports = new NamecheapService();
