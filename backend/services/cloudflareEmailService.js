const Cloudflare = require('cloudflare');

/**
 * Cloudflare Email Routing Service
 * Handles DNS setup and email forwarding configuration via Cloudflare
 */
class CloudflareEmailService {
  constructor() {
    this.client = null;
    this.accountId = null;
    this.isConfigured = false;
    this._initialize();
  }

  /**
   * Initialize Cloudflare client
   */
  _initialize() {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!apiToken || !accountId) {
      console.warn('⚠️  Cloudflare Email Routing API credentials not configured');
      console.warn('   Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in .env');
      return;
    }

    try {
      this.client = new Cloudflare({
        apiToken: apiToken
      });
      this.accountId = accountId;
      this.isConfigured = true;
      console.log('✓ Cloudflare Email Routing service initialized');
    } catch (error) {
      console.error('Failed to initialize Cloudflare Email Routing client:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Check if service is configured and ready
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Add domain to Cloudflare (create zone)
   * @param {string} domainName - Domain name to add
   * @returns {Promise<Object>} - Zone information
   */
  async addDomain(domainName) {
    if (!this.isConfigured) {
      throw new Error('Cloudflare Email Routing service not configured');
    }

    console.log(`🌐 Adding domain ${domainName} to Cloudflare`);

    try {
      const zone = await this.client.zones.create({
        account: { id: this.accountId },
        name: domainName,
        type: 'full'
      });

      console.log(`✅ Domain ${domainName} added to Cloudflare`);
      console.log(`   Zone ID: ${zone.id}`);
      console.log(`   Nameservers:`, zone.name_servers);

      return {
        success: true,
        domain: domainName,
        zoneId: zone.id,
        nameservers: zone.name_servers,
        status: zone.status,
        createdAt: zone.created_on
      };

    } catch (error) {
      // Check if domain already exists
      if (error.message.includes('already exists')) {
        console.log(`ℹ️  Domain ${domainName} already exists in Cloudflare, fetching zone info`);
        return await this.getZoneByDomain(domainName);
      }

      console.error(`❌ Failed to add domain ${domainName} to Cloudflare:`, error.message);
      throw new Error(`Failed to add domain to Cloudflare: ${error.message}`);
    }
  }

  /**
   * Get zone information by domain name
   * @param {string} domainName - Domain name
   * @returns {Promise<Object>} - Zone information
   */
  async getZoneByDomain(domainName) {
    if (!this.isConfigured) {
      throw new Error('Cloudflare Email Routing service not configured');
    }

    try {
      const zones = await this.client.zones.list({
        name: domainName,
        account: { id: this.accountId }
      });

      if (!zones || zones.length === 0) {
        throw new Error(`Zone not found for domain ${domainName}`);
      }

      const zone = zones[0];

      return {
        success: true,
        domain: domainName,
        zoneId: zone.id,
        nameservers: zone.name_servers,
        status: zone.status,
        createdAt: zone.created_on
      };

    } catch (error) {
      console.error(`❌ Failed to get zone for ${domainName}:`, error.message);
      throw error;
    }
  }

  /**
   * Enable Email Routing for a zone
   * @param {string} zoneId - Cloudflare zone ID
   * @param {string} domainName - Domain name (for logging)
   * @returns {Promise<Object>} - Email routing status
   */
  async enableEmailRouting(zoneId, domainName) {
    if (!this.isConfigured) {
      throw new Error('Cloudflare Email Routing service not configured');
    }

    console.log(`📧 Enabling Email Routing for ${domainName}`);

    try {
      // Enable email routing via direct API call
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing/enable`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.errors?.[0]?.message || 'Failed to enable email routing');
      }

      console.log(`✅ Email Routing enabled for ${domainName}`);

      return {
        success: true,
        domain: domainName,
        zoneId,
        enabled: data.result?.enabled || true,
        status: data.result?.status || 'enabled'
      };

    } catch (error) {
      console.error(`❌ Failed to enable Email Routing for ${domainName}:`, error.message);
      throw error;
    }
  }

  /**
   * Create a destination address (verified email to forward to)
   * @param {string} email - Email address to verify as destination
   * @returns {Promise<Object>} - Destination address info
   */
  async createDestinationAddress(email) {
    if (!this.isConfigured) {
      throw new Error('Cloudflare Email Routing service not configured');
    }

    console.log(`📬 Creating destination address: ${email}`);

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/email/routing/addresses`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Check if address already exists
        if (data.errors?.[0]?.message?.includes('already exists') ||
            data.errors?.[0]?.message?.includes('duplicate')) {
          console.log(`ℹ️  Destination ${email} already exists`);
          return await this.getDestinationAddress(email);
        }

        throw new Error(data.errors?.[0]?.message || 'Failed to create destination address');
      }

      console.log(`✅ Destination address created: ${email}`);
      console.log(`   ⚠️  Verification email sent to ${email} - user must verify!`);

      return {
        success: true,
        email,
        id: data.result?.id,
        verified: data.result?.verified || false,
        createdAt: data.result?.created
      };

    } catch (error) {
      console.error(`❌ Failed to create destination address ${email}:`, error.message);
      throw error;
    }
  }

  /**
   * Get existing destination address
   * @param {string} email - Email address to look up
   * @returns {Promise<Object>} - Destination address info
   */
  async getDestinationAddress(email) {
    if (!this.isConfigured) {
      throw new Error('Cloudflare Email Routing service not configured');
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/email/routing/addresses`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error('Failed to get destination addresses');
      }

      const address = data.result?.find(addr => addr.email === email);

      if (!address) {
        throw new Error(`Destination address ${email} not found`);
      }

      return {
        success: true,
        email: address.email,
        id: address.id,
        verified: address.verified || false,
        createdAt: address.created
      };

    } catch (error) {
      console.error(`❌ Failed to get destination address ${email}:`, error.message);
      throw error;
    }
  }

  /**
   * Create email forwarding rule
   * @param {string} zoneId - Cloudflare zone ID
   * @param {string} domainName - Domain name (e.g., "example.com")
   * @param {string} sourceEmail - Source email pattern (e.g., "hello@example.com" or "catch-all")
   * @param {string} destinationEmail - Verified destination email
   * @returns {Promise<Object>} - Routing rule info
   */
  async createForwardingRule(zoneId, domainName, sourceEmail, destinationEmail) {
    if (!this.isConfigured) {
      throw new Error('Cloudflare Email Routing service not configured');
    }

    console.log(`📮 Creating forwarding rule: ${sourceEmail} → ${destinationEmail}`);

    try {
      // Determine the matcher type
      let matcher;
      if (sourceEmail === 'catch-all' || sourceEmail === '*') {
        matcher = {
          type: 'all'
        };
      } else {
        matcher = {
          type: 'literal',
          value: sourceEmail
        };
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing/rules`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            matchers: [matcher],
            actions: [
              {
                type: 'forward',
                value: [destinationEmail]
              }
            ],
            enabled: true,
            name: `Forward ${sourceEmail} to ${destinationEmail}`
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.errors?.[0]?.message || 'Failed to create forwarding rule');
      }

      console.log(`✅ Forwarding rule created: ${sourceEmail} → ${destinationEmail}`);

      return {
        success: true,
        ruleId: data.result?.id,
        sourceEmail,
        destinationEmail,
        enabled: data.result?.enabled || true,
        createdAt: data.result?.created
      };

    } catch (error) {
      console.error(`❌ Failed to create forwarding rule:`, error.message);
      throw error;
    }
  }

  /**
   * Complete workflow: Setup domain with email forwarding
   * @param {string} domainName - Domain name
   * @param {string} sourceEmail - Source email or "catch-all"
   * @param {string} destinationEmail - User's destination email
   * @returns {Promise<Object>} - Complete setup result
   */
  async setupDomainEmailForwarding(domainName, sourceEmail, destinationEmail) {
    if (!this.isConfigured) {
      throw new Error('Cloudflare Email Routing service not configured');
    }

    console.log(`\n🚀 Starting complete email setup for ${domainName}`);
    console.log(`   Source: ${sourceEmail}`);
    console.log(`   Destination: ${destinationEmail}\n`);

    try {
      // Step 1: Add domain to Cloudflare (or get existing zone)
      const zone = await this.addDomain(domainName);

      // Step 2: Enable Email Routing
      await this.enableEmailRouting(zone.zoneId, domainName);

      // Step 3: Create/verify destination address
      const destination = await this.createDestinationAddress(destinationEmail);

      // Step 4: Create forwarding rule
      const rule = await this.createForwardingRule(
        zone.zoneId,
        domainName,
        sourceEmail,
        destinationEmail
      );

      console.log(`\n✅ Email setup complete for ${domainName}`);
      console.log(`   ⚠️  IMPORTANT: User must verify ${destinationEmail} to activate forwarding`);
      console.log(`   📋 Nameservers to set at registrar:`, zone.nameservers.join(', '));

      return {
        success: true,
        domain: domainName,
        zoneId: zone.zoneId,
        nameservers: zone.nameservers,
        sourceEmail,
        destinationEmail,
        destinationVerified: destination.verified,
        ruleId: rule.ruleId,
        requiresVerification: !destination.verified
      };

    } catch (error) {
      console.error(`\n❌ Email setup failed for ${domainName}:`, error.message);
      throw error;
    }
  }
}

module.exports = new CloudflareEmailService();
