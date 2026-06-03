const domainRegistrationService = require('../services/domainRegistrationService');

/**
 * Verify email using token from verification link
 * GET /api/verification/verify-email?token=xxx&domain=example.com
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token, domain } = req.query;

    // Validation
    if (!token || !domain) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'Both token and domain are required'
      });
    }

    console.log(`🔐 Email verification request for ${domain}`);

    // Verify the email
    const result = await domainRegistrationService.verifyEmail(token, domain);

    res.json({
      success: true,
      message: result.message,
      domain: result.domain,
      active: result.active
    });

  } catch (error) {
    console.error('Email verification error:', error);

    // Handle specific error types
    if (error.message.includes('Invalid verification token')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token',
        message: 'The verification link is invalid or has already been used.'
      });
    }

    if (error.message.includes('expired')) {
      return res.status(400).json({
        success: false,
        error: 'Token expired',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message
    });
  }
};

/**
 * Resend verification email for a domain
 * POST /api/verification/resend
 * Body: { domainName }
 */
exports.resendVerification = async (req, res) => {
  try {
    const { domainName } = req.body;
    const userId = req.userId; // From auth middleware

    // Validation
    if (!domainName) {
      return res.status(400).json({
        success: false,
        error: 'Domain name is required'
      });
    }

    console.log(`📧 Resending verification email for ${domainName}`);

    // Resend verification
    const result = await domainRegistrationService.resendVerificationEmail(userId, domainName);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    res.json({
      success: true,
      message: result.message,
      sentTo: result.sentTo
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification email',
      message: error.message
    });
  }
};

/**
 * Get verification status for a domain
 * GET /api/verification/status/:domainName
 */
exports.getVerificationStatus = async (req, res) => {
  try {
    const { domainName } = req.params;
    const userId = req.userId; // From auth middleware

    if (!domainName) {
      return res.status(400).json({
        success: false,
        error: 'Domain name is required'
      });
    }

    // Get domain status
    const domain = await domainRegistrationService.getDomainStatus(userId, domainName);

    if (!domain) {
      return res.status(404).json({
        success: false,
        error: 'Domain not found'
      });
    }

    res.json({
      success: true,
      domain: {
        name: domain.domain_name,
        status: domain.status,
        verified: domain.cloudflare_destination_verified || false,
        verificationRequired: !domain.cloudflare_destination_verified,
        emailForwarding: {
          enabled: domain.email_forwarding_enabled || false,
          source: domain.email_forwarding_source,
          destination: domain.email_forwarding_destination
        },
        verificationSentAt: domain.verification_sent_at,
        emailVerifiedAt: domain.email_verified_at,
        activatedAt: domain.activated_at
      }
    });

  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get verification status',
      message: error.message
    });
  }
};
