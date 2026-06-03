const namecheapService = require('./namecheapService');
const cloudflareEmailService = require('./cloudflareEmailService');
const emailService = require('./emailService');
const { supabaseAdmin } = require('../config/supabase');
const crypto = require('crypto');

/**
 * Domain Registration Orchestration Service
 * Coordinates the complete domain registration and email setup workflow:
 * 1. Register domain via Namecheap
 * 2. Add domain to Cloudflare
 * 3. Update nameservers at Namecheap to point to Cloudflare
 * 4. Enable Email Routing on Cloudflare
 * 5. Create email forwarding rules
 */
class DomainRegistrationService {
  constructor() {
    this.isConfigured = namecheapService.isReady() && cloudflareEmailService.isReady();

    if (!this.isConfigured) {
      console.warn('⚠️  Domain Registration Service not fully configured');
      console.warn('   Both Namecheap and Cloudflare services must be configured');
    } else {
      console.log('✓ Domain Registration Service initialized');
    }
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Complete domain registration and email setup workflow
   * @param {Object} params - Registration parameters
   * @param {string} params.domainName - Domain to register (e.g., "example.com")
   * @param {string} params.userEmail - User's destination email for forwarding
   * @param {string} params.userId - User ID from database
   * @param {string} params.sourceEmail - Source email pattern (e.g., "hello@example.com" or "catch-all")
   * @param {number} params.years - Years to register (default: 1)
   * @returns {Promise<Object>} - Complete registration result
   */
  async registerDomainWithEmail({
    domainName,
    userEmail,
    userId,
    sourceEmail = 'catch-all',
    years = 1
  }) {
    if (!this.isConfigured) {
      throw new Error('Domain Registration Service not configured');
    }

    console.log(`\n🚀 Starting complete domain registration for ${domainName}`);
    console.log(`   User: ${userEmail}`);
    console.log(`   Source email: ${sourceEmail}`);
    console.log(`   Years: ${years}\n`);

    const workflow = {
      domain: domainName,
      steps: [],
      errors: [],
      startedAt: new Date().toISOString()
    };

    try {
      // Step 1: Register domain via Namecheap
      console.log('📝 STEP 1: Registering domain via Namecheap...');
      const registration = await namecheapService.registerDomain(domainName, years);

      workflow.steps.push({
        step: 1,
        name: 'namecheap_registration',
        status: 'completed',
        data: registration,
        completedAt: new Date().toISOString()
      });

      // Update database - domain registered
      await this._updateDomainStatus(userId, domainName, 'registered', {
        namecheap_domain_id: registration.domainId,
        namecheap_order_id: registration.orderId,
        namecheap_transaction_id: registration.transactionId,
        registered_at: registration.registeredAt
      });

      // Step 2: Add domain to Cloudflare and get nameservers
      console.log('\n🌐 STEP 2: Adding domain to Cloudflare...');
      const cloudflareZone = await cloudflareEmailService.addDomain(domainName);

      workflow.steps.push({
        step: 2,
        name: 'cloudflare_zone_creation',
        status: 'completed',
        data: cloudflareZone,
        completedAt: new Date().toISOString()
      });

      // Update database - Cloudflare zone created
      await this._updateDomainStatus(userId, domainName, 'cloudflare_zone_created', {
        cloudflare_zone_id: cloudflareZone.zoneId,
        cloudflare_nameservers: cloudflareZone.nameservers
      });

      // Step 3: Update nameservers at Namecheap to point to Cloudflare
      console.log('\n🔄 STEP 3: Updating nameservers at Namecheap...');
      const nameserverUpdate = await namecheapService.updateNameservers(
        domainName,
        cloudflareZone.nameservers
      );

      workflow.steps.push({
        step: 3,
        name: 'nameserver_update',
        status: 'completed',
        data: nameserverUpdate,
        completedAt: new Date().toISOString()
      });

      // Update database - nameservers updated
      await this._updateDomainStatus(userId, domainName, 'nameservers_updated', {
        nameservers_updated_at: nameserverUpdate.updatedAt
      });

      // Step 4: Enable Email Routing on Cloudflare
      console.log('\n📧 STEP 4: Enabling Email Routing on Cloudflare...');
      const emailRouting = await cloudflareEmailService.enableEmailRouting(
        cloudflareZone.zoneId,
        domainName
      );

      workflow.steps.push({
        step: 4,
        name: 'email_routing_enabled',
        status: 'completed',
        data: emailRouting,
        completedAt: new Date().toISOString()
      });

      // Step 5: Create destination address (user's email)
      console.log('\n📬 STEP 5: Setting up destination email address...');
      const destination = await cloudflareEmailService.createDestinationAddress(userEmail);

      workflow.steps.push({
        step: 5,
        name: 'destination_created',
        status: 'completed',
        data: destination,
        completedAt: new Date().toISOString()
      });

      // Step 6: Create forwarding rule
      console.log('\n📮 STEP 6: Creating email forwarding rule...');
      const forwardingRule = await cloudflareEmailService.createForwardingRule(
        cloudflareZone.zoneId,
        domainName,
        sourceEmail,
        userEmail
      );

      workflow.steps.push({
        step: 6,
        name: 'forwarding_rule_created',
        status: 'completed',
        data: forwardingRule,
        completedAt: new Date().toISOString()
      });

      // Step 7: Handle email verification
      console.log('\n✉️  STEP 7: Sending verification email...');
      let verificationToken = null;
      let verificationUrl = null;
      let emailVerificationRequired = !destination.verified;

      if (emailVerificationRequired) {
        // Generate verification token
        verificationToken = crypto.randomBytes(32).toString('hex');

        // Build verification URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}&domain=${domainName}`;

        // Store verification token in database
        await this._updateDomainStatus(userId, domainName, 'pending_verification', {
          email_forwarding_enabled: true,
          email_forwarding_source: sourceEmail,
          email_forwarding_destination: userEmail,
          cloudflare_destination_verified: false,
          cloudflare_rule_id: forwardingRule.ruleId,
          verification_token: verificationToken,
          verification_token_created_at: new Date().toISOString(),
          verification_sent_at: new Date().toISOString()
        });

        // Send verification email to user
        await emailService.sendEmailVerification({
          to: userEmail,
          domainName,
          verificationToken,
          verificationUrl
        });

        console.log(`   ✓ Verification email sent to ${userEmail}`);
        console.log(`   ⚠️  User must click verification link to activate forwarding`);

        workflow.steps.push({
          step: 7,
          name: 'verification_email_sent',
          status: 'completed',
          data: { emailSent: true, requiresVerification: true },
          completedAt: new Date().toISOString()
        });
      } else {
        // Email already verified (unlikely but handle it)
        await this._updateDomainStatus(userId, domainName, 'active', {
          email_forwarding_enabled: true,
          email_forwarding_source: sourceEmail,
          email_forwarding_destination: userEmail,
          cloudflare_destination_verified: true,
          cloudflare_rule_id: forwardingRule.ruleId,
          activated_at: new Date().toISOString()
        });

        console.log(`   ✓ Email already verified - domain fully active!`);

        workflow.steps.push({
          step: 7,
          name: 'email_already_verified',
          status: 'completed',
          data: { emailSent: false, requiresVerification: false },
          completedAt: new Date().toISOString()
        });
      }

      workflow.completedAt = new Date().toISOString();
      workflow.success = true;

      console.log(`\n✅ COMPLETE: Domain registration and email setup finished for ${domainName}`);
      if (emailVerificationRequired) {
        console.log(`   📧 Verification email sent to ${userEmail}`);
        console.log(`   📋 Status: Pending email verification`);
      } else {
        console.log(`   📋 Status: Active and ready to use!`);
      }
      console.log();

      return {
        success: true,
        domain: domainName,
        nameservers: cloudflareZone.nameservers,
        emailForwarding: {
          source: sourceEmail,
          destination: userEmail,
          verified: destination.verified,
          requiresVerification: emailVerificationRequired
        },
        verification: {
          required: emailVerificationRequired,
          token: verificationToken,
          url: verificationUrl,
          emailSent: emailVerificationRequired
        },
        registration: {
          registrar: 'Namecheap',
          orderId: registration.orderId,
          domainId: registration.domainId,
          chargedAmount: registration.chargedAmount
        },
        cloudflare: {
          zoneId: cloudflareZone.zoneId,
          status: cloudflareZone.status,
          ruleId: forwardingRule.ruleId
        },
        workflow
      };

    } catch (error) {
      workflow.errors.push({
        step: workflow.steps.length + 1,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      workflow.success = false;
      workflow.failedAt = new Date().toISOString();

      console.error(`\n❌ FAILED: Domain registration workflow failed at step ${workflow.steps.length + 1}`);
      console.error(`   Error: ${error.message}\n`);

      // Update database with error status
      const currentStep = workflow.steps.length + 1;
      let errorStatus = 'registration_failed';

      if (currentStep === 1) errorStatus = 'namecheap_registration_failed';
      else if (currentStep === 2) errorStatus = 'cloudflare_setup_failed';
      else if (currentStep === 3) errorStatus = 'nameserver_update_failed';
      else if (currentStep >= 4) errorStatus = 'email_setup_failed';

      await this._updateDomainStatus(userId, domainName, errorStatus, {
        error_message: error.message,
        failed_at_step: currentStep,
        error_timestamp: new Date().toISOString()
      });

      throw new Error(`Domain registration failed at step ${currentStep}: ${error.message}`);
    }
  }

  /**
   * Update domain status in database
   * @private
   */
  async _updateDomainStatus(userId, domainName, status, additionalData = {}) {
    try {
      // Check if domain record exists
      const { data: existing } = await supabaseAdmin
        .from('domains')
        .select('id')
        .eq('user_id', userId)
        .eq('domain_name', domainName)
        .single();

      const updateData = {
        status,
        ...additionalData,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        // Update existing record
        await supabaseAdmin
          .from('domains')
          .update(updateData)
          .eq('id', existing.id);
      } else {
        // Create new record
        await supabaseAdmin
          .from('domains')
          .insert({
            user_id: userId,
            domain_name: domainName,
            ...updateData
          });
      }

      console.log(`   ✓ Database updated: ${domainName} → ${status}`);

    } catch (error) {
      console.error(`   ⚠️  Failed to update database for ${domainName}:`, error.message);
      // Don't throw - database update failure shouldn't stop the workflow
    }
  }

  /**
   * Check domain availability before registration
   * @param {string} domainName - Domain to check
   * @returns {Promise<boolean>} - True if available
   */
  async checkAvailability(domainName) {
    if (!namecheapService.isReady()) {
      throw new Error('Namecheap service not configured');
    }

    return await namecheapService.checkAvailability(domainName);
  }

  /**
   * Get workflow status for a domain
   * @param {string} userId - User ID
   * @param {string} domainName - Domain name
   * @returns {Promise<Object>} - Domain status from database
   */
  async getDomainStatus(userId, domainName) {
    try {
      const { data, error } = await supabaseAdmin
        .from('domains')
        .select('*')
        .eq('user_id', userId)
        .eq('domain_name', domainName)
        .single();

      if (error) throw error;

      return data;

    } catch (error) {
      console.error(`Failed to get domain status for ${domainName}:`, error.message);
      throw error;
    }
  }

  /**
   * Resend verification email for a domain
   * @param {string} userId - User ID
   * @param {string} domainName - Domain name
   * @returns {Promise<Object>} - Result of resend operation
   */
  async resendVerificationEmail(userId, domainName) {
    try {
      // Get domain from database
      const domain = await this.getDomainStatus(userId, domainName);

      if (!domain) {
        throw new Error('Domain not found');
      }

      if (domain.cloudflare_destination_verified) {
        return {
          success: false,
          message: 'Email already verified'
        };
      }

      const userEmail = domain.email_forwarding_destination;

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}&domain=${domainName}`;

      // Update token in database
      await this._updateDomainStatus(userId, domainName, domain.status, {
        verification_token: verificationToken,
        verification_token_created_at: new Date().toISOString(),
        verification_sent_at: new Date().toISOString()
      });

      // Send verification email
      await emailService.sendEmailVerification({
        to: userEmail,
        domainName,
        verificationToken,
        verificationUrl
      });

      console.log(`✉️  Verification email resent to ${userEmail} for ${domainName}`);

      return {
        success: true,
        message: 'Verification email sent',
        sentTo: userEmail
      };

    } catch (error) {
      console.error(`Failed to resend verification email for ${domainName}:`, error.message);
      throw error;
    }
  }

  /**
   * Verify email and activate domain
   * @param {string} verificationToken - Verification token from email link
   * @param {string} domainName - Domain name
   * @returns {Promise<Object>} - Verification result
   */
  async verifyEmail(verificationToken, domainName) {
    try {
      console.log(`🔐 Verifying email for ${domainName}...`);

      // Find domain by token and domain name
      const { data: domain, error } = await supabaseAdmin
        .from('domains')
        .select('*')
        .eq('domain_name', domainName)
        .eq('verification_token', verificationToken)
        .single();

      if (error || !domain) {
        throw new Error('Invalid verification token');
      }

      // Check if already verified
      if (domain.cloudflare_destination_verified) {
        return {
          success: true,
          message: 'Email already verified',
          domain: domainName
        };
      }

      // Check token expiration (7 days)
      const tokenCreatedAt = new Date(domain.verification_token_created_at);
      const now = new Date();
      const daysSinceCreated = (now - tokenCreatedAt) / (1000 * 60 * 60 * 24);

      if (daysSinceCreated > 7) {
        throw new Error('Verification token expired. Please request a new one.');
      }

      // Mark as verified in our database
      await this._updateDomainStatus(domain.user_id, domainName, 'active', {
        cloudflare_destination_verified: true,
        email_verified_at: new Date().toISOString(),
        activated_at: new Date().toISOString(),
        verification_token: null // Clear token after verification
      });

      // Send success notification email
      await emailService.sendDomainRegistrationSuccess({
        to: domain.email_forwarding_destination,
        domainName,
        nameservers: domain.cloudflare_nameservers || [],
        emailVerificationRequired: false
      });

      console.log(`✅ Email verified for ${domainName} - domain is now fully active!`);

      return {
        success: true,
        message: 'Email verified successfully',
        domain: domainName,
        active: true
      };

    } catch (error) {
      console.error(`Email verification failed for ${domainName}:`, error.message);
      throw error;
    }
  }
}

module.exports = new DomainRegistrationService();
