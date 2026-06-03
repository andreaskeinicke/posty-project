# Domain Registration Setup Guide

This guide explains how to configure the Namecheap + Cloudflare hybrid domain registration integration for Posty.

## Architecture Overview

The Posty domain registration system uses a **hybrid approach**:

1. **Namecheap** - Domain registration and ownership
2. **Cloudflare** - DNS management and FREE email forwarding

### Why This Architecture?

- ✅ **Full Automation** - Domains register automatically after payment
- ✅ **Free Email Forwarding** - Cloudflare Email Routing is free forever
- ✅ **Best DNS Performance** - Cloudflare has the fastest DNS globally
- ✅ **Cost Efficient** - No ongoing email forwarding fees ($8-10/year savings per domain)
- ✅ **Scalable** - Works at any scale without per-domain email costs

## Workflow

When a customer completes payment via Stripe:

```
1. Stripe Webhook → checkout.session.completed
2. Register domain via Namecheap API (1-2 minutes)
3. Add domain to Cloudflare (create DNS zone)
4. Update nameservers at Namecheap → point to Cloudflare
5. Enable Cloudflare Email Routing
6. Create destination address (customer's email)
7. Create forwarding rule (catch-all → customer email)
8. Send verification email to customer
9. Customer verifies email → forwarding is active! ✅
```

## Setup Instructions

### 1. Namecheap API Setup

#### 1.1 Enable API Access

1. Log into your Namecheap account
2. Go to **Profile** → **Tools** → **API Access**
3. Toggle **API Access** to ON
4. Read and accept the API Terms of Service

#### 1.2 Get API Credentials

1. In the API Access page, you'll see:
   - **API Key** - Copy this value
   - **Username** - Your Namecheap username
2. Whitelist your server IP address:
   - Click **Manage** under "Whitelisted IPs"
   - Add your server's public IP address
   - For local testing, add your development machine's IP

**Important:** API access requires your account to have:
- At least $50 in account balance OR
- 20+ domains in your account OR
- Spent $50+ in the past 2 years

#### 1.3 Enable Sandbox (for testing)

1. Go to **Sandbox** section in API Access page
2. Toggle **Sandbox API Access** to ON
3. Note: Sandbox uses the same credentials but different endpoint
4. No real charges occur in sandbox mode

### 2. Cloudflare API Setup

#### 2.1 Get API Token

1. Log into Cloudflare dashboard
2. Go to **Profile** → **API Tokens**
3. Click **Create Token**
4. Use the **Edit zone DNS** template or create custom token with:
   - **Permissions:**
     - Zone → DNS → Edit
     - Zone → Zone → Edit
     - Account → Email Routing Rules → Edit
   - **Zone Resources:**
     - Include → All zones
   - **Account Resources:**
     - Include → Your account
5. Copy the generated token

#### 2.2 Get Account ID

1. In Cloudflare dashboard, click on any domain (or create one)
2. On the Overview page, scroll down to **API** section on the right
3. Copy your **Account ID**

### 3. Environment Configuration

Update your `.env` file with the credentials:

```bash
# Namecheap API Configuration
NAMECHEAP_API_USER=your_namecheap_username
NAMECHEAP_API_KEY=your_api_key_from_namecheap
NAMECHEAP_CLIENT_IP=your_whitelisted_ip_address
NAMECHEAP_SANDBOX=true  # Set to false for production

# Namecheap Default Contact Information (for domain registrations)
# These are used for all domain registrations
NAMECHEAP_DEFAULT_FIRST_NAME=John
NAMECHEAP_DEFAULT_LAST_NAME=Doe
NAMECHEAP_DEFAULT_ADDRESS=123 Main Street
NAMECHEAP_DEFAULT_CITY=New York
NAMECHEAP_DEFAULT_STATE=NY
NAMECHEAP_DEFAULT_POSTAL_CODE=10001
NAMECHEAP_DEFAULT_COUNTRY=US
NAMECHEAP_DEFAULT_PHONE=+1.2125551234
NAMECHEAP_DEFAULT_EMAIL=admin@yourdomain.com

# Cloudflare API (for DNS and email routing)
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
```

### 4. Contact Information Setup

The contact information in `.env` is used for **all** domain registrations. This should be:
- Your company information (if registering on behalf of customers)
- OR generic administrative contact info
- Must use ASCII characters only (no special characters)
- Must be valid - registries may verify

**Privacy:** Namecheap includes free WhoisGuard privacy protection, so this contact info won't be publicly visible.

### 5. Testing

#### 5.1 Sandbox Testing (Namecheap)

With `NAMECHEAP_SANDBOX=true`:
- No real charges occur
- Domain registrations are simulated
- You can test the complete workflow safely
- Sandbox has limited TLD support (mainly .com, .net, .org)

#### 5.2 Test the Integration

1. Start your backend server:
   ```bash
   npm run server
   ```

2. Check the startup logs for:
   ```
   ✓ Namecheap initialized in SANDBOX mode
   ✓ Cloudflare Email Routing service initialized
   ✓ Domain Registration Service initialized
   ```

3. Trigger a test purchase through your frontend
4. Monitor the server logs for the workflow progress
5. Check your database for domain status updates

### 6. Going to Production

When ready for production:

1. **Update Namecheap settings:**
   ```bash
   NAMECHEAP_SANDBOX=false
   ```

2. **Verify production credentials:**
   - Ensure production API key is set
   - Verify production server IP is whitelisted
   - Confirm sufficient account balance

3. **Test with a real domain purchase:**
   - Use a low-cost TLD (e.g., .com ~$9-10)
   - Verify complete workflow end-to-end
   - Confirm email verification works

4. **Monitor for errors:**
   - Watch server logs during first purchases
   - Check database domain statuses
   - Verify email forwarding is working

## Domain Status Flow

Domains progress through these statuses:

```
pending_purchase → namecheap_registration_failed (if error at step 1)
                ↓
             registered → cloudflare_setup_failed (if error at step 2-4)
                ↓
       nameservers_updated → email_setup_failed (if error at step 5-6)
                ↓
              active (email forwarding configured, pending verification)
```

## Troubleshooting

### Namecheap API Errors

**"API access disabled"**
- Enable API access in Namecheap account settings
- Verify account meets API access requirements

**"Invalid IP address"**
- Whitelist your server's public IP in Namecheap
- Check you're using the correct IP (not local/private IP)

**"Insufficient funds"**
- Add balance to your Namecheap account
- Sandbox mode doesn't require funds

**"Domain not available"**
- Domain was registered by someone else between check and purchase
- Implement availability check before showing to user

### Cloudflare API Errors

**"Authentication error"**
- Verify API token has correct permissions
- Check token hasn't expired

**"Zone already exists"**
- Domain is already in Cloudflare account
- The code handles this gracefully

**"Email routing not available"**
- Email Routing may not be available for all TLDs
- Verify domain nameservers are pointed to Cloudflare

### Email Verification

**User didn't receive verification email:**
- Check spam/junk folder
- Resend verification via Cloudflare dashboard
- Verify destination email is valid

**Email forwarding not working:**
- User must verify their destination email first
- Check forwarding rules in Cloudflare dashboard
- Verify nameservers are properly updated (takes 24-48h)

## Cost Breakdown

### Per Domain Registration

- **Domain registration:** Variable by TLD (~$9-13/year for .com)
- **Email forwarding:** $0 (Cloudflare is free)
- **DNS hosting:** $0 (Cloudflare is free)

### Example: 100 Customers

- **With Namecheap email forwarding:** $9-13/domain + $8-10/year = ~$1,700-2,300/year
- **With Cloudflare (hybrid):** $9-13/domain + $0 = ~$900-1,300/year
- **Savings:** ~$800-1,000/year with just 100 domains

## Files Reference

### Service Files

- `/backend/services/namecheapService.js` - Namecheap domain registration
- `/backend/services/cloudflareEmailService.js` - Cloudflare DNS & email routing
- `/backend/services/domainRegistrationService.js` - Orchestrates the complete workflow
- `/backend/controllers/checkoutController.js` - Stripe webhook integration

### Environment

- `/.env` - Configuration file with API credentials

### Database

Domains are tracked in the `domains` table with fields:
- `status` - Current workflow status
- `namecheap_domain_id`, `namecheap_order_id` - Namecheap references
- `cloudflare_zone_id` - Cloudflare zone ID
- `cloudflare_nameservers` - Nameservers to use
- `email_forwarding_destination` - User's email
- `cloudflare_destination_verified` - Email verification status

## Support

For issues:
- **Namecheap:** https://www.namecheap.com/support/
- **Cloudflare:** https://support.cloudflare.com/
- **Posty Integration:** Check server logs and database status

## Security Notes

- ⚠️ Never commit `.env` file to version control
- ⚠️ Use environment variables in production (not .env file)
- ⚠️ Rotate API keys periodically
- ⚠️ Restrict API token permissions to minimum required
- ⚠️ Monitor API usage for unexpected charges
