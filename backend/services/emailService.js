/**
 * Email Notification Service
 * Handles sending verification and notification emails to users
 *
 * NOTE: This is a basic implementation. For production, integrate with:
 * - SendGrid
 * - AWS SES
 * - Postmark
 * - Resend
 */

class EmailService {
  constructor() {
    this.initialized = false;
    this.emailProvider = null;
    this._initialize();
  }

  /**
   * Initialize email service
   * For now, we'll log emails to console
   * TODO: Integrate with actual email provider
   */
  _initialize() {
    // Check if email provider is configured
    const provider = process.env.EMAIL_PROVIDER; // 'sendgrid', 'ses', 'postmark', 'console'

    if (!provider || provider === 'console') {
      console.log('📧 Email Service: Using console mode (emails will be logged)');
      this.emailProvider = 'console';
      this.initialized = true;
      return;
    }

    // TODO: Initialize actual email provider based on config
    console.warn('⚠️  Email provider not configured, using console mode');
    this.emailProvider = 'console';
    this.initialized = true;
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.initialized;
  }

  /**
   * Send email verification notification
   * @param {Object} params - Email parameters
   * @param {string} params.to - Recipient email address
   * @param {string} params.domainName - Domain that was registered
   * @param {string} params.verificationToken - Verification token
   * @param {string} params.verificationUrl - Full verification URL
   */
  async sendEmailVerification({ to, domainName, verificationToken, verificationUrl }) {
    const subject = `Verify your email for ${domainName}`;
    const text = this._generateVerificationEmailText({ domainName, verificationUrl });
    const html = this._generateVerificationEmailHtml({ domainName, verificationUrl });

    return this._sendEmail({
      to,
      subject,
      text,
      html,
      metadata: {
        type: 'email_verification',
        domain: domainName,
        token: verificationToken
      }
    });
  }

  /**
   * Send domain registration success notification
   * @param {Object} params
   * @param {string} params.to - Recipient email
   * @param {string} params.domainName - Registered domain
   * @param {string[]} params.nameservers - Nameservers
   * @param {boolean} params.emailVerificationRequired - Whether email verification is needed
   */
  async sendDomainRegistrationSuccess({ to, domainName, nameservers, emailVerificationRequired }) {
    const subject = `Your domain ${domainName} is registered!`;
    const text = this._generateRegistrationSuccessText({
      domainName,
      nameservers,
      emailVerificationRequired
    });
    const html = this._generateRegistrationSuccessHtml({
      domainName,
      nameservers,
      emailVerificationRequired
    });

    return this._sendEmail({
      to,
      subject,
      text,
      html,
      metadata: {
        type: 'registration_success',
        domain: domainName
      }
    });
  }

  /**
   * Send email verification reminder
   */
  async sendVerificationReminder({ to, domainName, verificationUrl }) {
    const subject = `Reminder: Verify your email for ${domainName}`;
    const text = this._generateVerificationReminderText({ domainName, verificationUrl });
    const html = this._generateVerificationReminderHtml({ domainName, verificationUrl });

    return this._sendEmail({
      to,
      subject,
      text,
      html,
      metadata: {
        type: 'verification_reminder',
        domain: domainName
      }
    });
  }

  /**
   * Send email (internal method)
   */
  async _sendEmail({ to, subject, text, html, metadata }) {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    console.log(`\n📧 Sending email to ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Type: ${metadata.type}`);

    // Console mode - just log the email
    if (this.emailProvider === 'console') {
      console.log('\n--- EMAIL CONTENT (Console Mode) ---');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log('\n--- TEXT VERSION ---');
      console.log(text);
      console.log('\n--- END EMAIL ---\n');

      return {
        success: true,
        provider: 'console',
        to,
        subject
      };
    }

    // TODO: Implement actual email sending with provider
    // Example for SendGrid:
    // const msg = { to, from: process.env.FROM_EMAIL, subject, text, html };
    // await sgMail.send(msg);

    throw new Error('Email provider not implemented');
  }

  /**
   * Generate verification email text content
   */
  _generateVerificationEmailText({ domainName, verificationUrl }) {
    return `
Welcome to Posty!

Your domain ${domainName} has been successfully registered!

To activate email forwarding for your domain, please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 7 days.

Once verified, all emails sent to any address @${domainName} will be forwarded to this email address.

If you didn't register this domain, please ignore this email.

Thanks,
The Posty Team
    `.trim();
  }

  /**
   * Generate verification email HTML content
   */
  _generateVerificationEmailHtml({ domainName, verificationUrl }) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .domain { font-weight: bold; color: #4F46E5; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Posty!</h1>
    </div>
    <div class="content">
      <p>Your domain <span class="domain">${domainName}</span> has been successfully registered!</p>

      <p>To activate email forwarding for your domain, please verify your email address:</p>

      <center>
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </center>

      <p><small>Or copy this link into your browser:</small><br>
      <small>${verificationUrl}</small></p>

      <p>This link will expire in 7 days.</p>

      <p>Once verified, all emails sent to any address <strong>@${domainName}</strong> will be forwarded to this email address.</p>

      <div class="footer">
        <p>If you didn't register this domain, please ignore this email.</p>
        <p>&copy; ${new Date().getFullYear()} Posty. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate registration success email text
   */
  _generateRegistrationSuccessText({ domainName, nameservers, emailVerificationRequired }) {
    let verificationNote = '';
    if (emailVerificationRequired) {
      verificationNote = '\n\nIMPORTANT: Check your inbox for a verification email. You must verify your email address to activate email forwarding.';
    }

    return `
Congratulations!

Your domain ${domainName} has been successfully registered and configured!

Domain Details:
- Domain: ${domainName}
- Nameservers: ${nameservers.join(', ')}
- DNS Management: Cloudflare
- Email Forwarding: Configured (catch-all)
${verificationNote}

Your domain is now active and ready to use!

Need help? Contact our support team.

Thanks,
The Posty Team
    `.trim();
  }

  /**
   * Generate registration success email HTML
   */
  _generateRegistrationSuccessHtml({ domainName, nameservers, emailVerificationRequired }) {
    let verificationAlert = '';
    if (emailVerificationRequired) {
      verificationAlert = `
        <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
          <strong>⚠️ Action Required:</strong> Check your inbox for a verification email.
          You must verify your email address to activate email forwarding.
        </div>
      `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .domain { font-weight: bold; color: #10B981; font-size: 18px; }
    .details { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Domain Registered!</h1>
    </div>
    <div class="content">
      <p>Congratulations! Your domain <span class="domain">${domainName}</span> has been successfully registered and configured!</p>

      ${verificationAlert}

      <div class="details">
        <h3>Domain Details</h3>
        <ul>
          <li><strong>Domain:</strong> ${domainName}</li>
          <li><strong>Nameservers:</strong> ${nameservers.join(', ')}</li>
          <li><strong>DNS Management:</strong> Cloudflare</li>
          <li><strong>Email Forwarding:</strong> Configured (catch-all)</li>
        </ul>
      </div>

      <p>Your domain is now active and ready to use!</p>

      <div class="footer">
        <p>Need help? Contact our support team.</p>
        <p>&copy; ${new Date().getFullYear()} Posty. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate verification reminder text
   */
  _generateVerificationReminderText({ domainName, verificationUrl }) {
    return `
Reminder: Verify Your Email

Your domain ${domainName} is registered, but email forwarding is not yet active.

To activate email forwarding, please verify your email address:

${verificationUrl}

Once verified, all emails sent to @${domainName} will be forwarded to your email address.

This link will expire soon, so please verify as soon as possible.

Thanks,
The Posty Team
    `.trim();
  }

  /**
   * Generate verification reminder HTML
   */
  _generateVerificationReminderHtml({ domainName, verificationUrl }) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #F59E0B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .domain { font-weight: bold; color: #F59E0B; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Reminder: Verify Your Email</h1>
    </div>
    <div class="content">
      <p>Your domain <span class="domain">${domainName}</span> is registered, but email forwarding is not yet active.</p>

      <p>To activate email forwarding, please verify your email address:</p>

      <center>
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </center>

      <p>Once verified, all emails sent to <strong>@${domainName}</strong> will be forwarded to your email address.</p>

      <p><strong>This link will expire soon</strong>, so please verify as soon as possible.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

module.exports = new EmailService();
