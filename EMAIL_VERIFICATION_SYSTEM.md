# Email Verification System - Option 2 Implementation

This document describes the automated email verification system implemented for Posty. This ensures users never need to interact with Cloudflare directly.

## Overview

When a customer purchases a domain through Posty:

1. Domain is registered via Namecheap
2. DNS is configured via Cloudflare
3. Email forwarding is set up automatically
4. **User receives a verification email from Posty**
5. User clicks link to verify → Email forwarding activates
6. User never needs to access Cloudflare

## Architecture

```
User Purchase → Domain Registration → Email Setup → Verification Email → User Clicks Link → Active
     ↓                ↓                    ↓                ↓                     ↓           ↓
  Stripe         Namecheap API      Cloudflare API    Email Service    Verification API   Database
```

## Components Created

### 1. Backend Services

#### Email Service ([backend/services/emailService.js](backend/services/emailService.js))

Handles sending all verification and notification emails.

**Methods:**
- `sendEmailVerification()` - Sends verification email with link
- `sendDomainRegistrationSuccess()` - Confirmation after verification
- `sendVerificationReminder()` - Reminder if not verified

**Current Mode:** Console (logs emails)
**Production:** Configure with SendGrid, AWS SES, Postmark, or Resend

**Environment Variables:**
```bash
EMAIL_PROVIDER=console  # Change to 'sendgrid', 'ses', 'postmark' for production
```

#### Updated Domain Registration Service ([backend/services/domainRegistrationService.js](backend/services/domainRegistrationService.js))

**New Step 7:** Email verification workflow
- Generates secure verification token (32 bytes hex)
- Stores token in database with timestamp
- Sends verification email to user
- Sets domain status to `pending_verification`

**New Methods:**
- `verifyEmail(token, domain)` - Verifies email when user clicks link
- `resendVerificationEmail(userId, domain)` - Resends verification if needed

**Token Expiry:** 7 days

### 2. API Endpoints

#### Verification Controller ([backend/controllers/verificationController.js](backend/controllers/verificationController.js))

New routes in [backend/routes/verification.js](backend/routes/verification.js):

**Public Route:**
- `GET /api/verification/verify-email?token=xxx&domain=example.com`
  - Verifies email from link
  - No authentication required
  - Returns success/error status

**Protected Routes (require auth):**
- `POST /api/verification/resend` - Resend verification email
- `GET /api/verification/status/:domainName` - Check verification status

Registered in [backend/server.js:39](backend/server.js#L39)

### 3. Database Schema

#### Migration ([backend/supabase/migrations/add_email_verification_fields.sql](backend/supabase/migrations/add_email_verification_fields.sql))

**New fields added to `domains` table:**

```sql
-- Verification workflow
verification_token VARCHAR(255)
verification_token_created_at TIMESTAMP
verification_sent_at TIMESTAMP
email_verified_at TIMESTAMP

-- Email forwarding tracking
email_forwarding_enabled BOOLEAN
email_forwarding_source VARCHAR(255)
email_forwarding_destination VARCHAR(255)
cloudflare_destination_verified BOOLEAN

-- Error tracking
error_message TEXT
failed_at_step INTEGER
error_timestamp TIMESTAMP
```

**New indexes:**
- `idx_domains_verification_token` - Fast token lookups
- `idx_domains_email_verified` - Filter verified domains

### 4. Frontend Components

#### Verify Email Page ([frontend/src/components/VerifyEmail.js](frontend/src/components/VerifyEmail.js))

Standalone verification page with three states:
- **Verifying:** Shows spinner while checking token
- **Success:** Green checkmark, confirmation message, next steps
- **Error:** Red X, error message, support link

Route: `/verify-email?token=xxx&domain=example.com`

#### Domain Verification Status ([frontend/src/components/DomainVerificationStatus.js](frontend/src/components/DomainVerificationStatus.js))

Dashboard component showing verification status:
- **Verified:** Green banner, shows forwarding destination
- **Pending:** Yellow banner with "Resend Email" button
- **In Progress:** Blue banner with spinner
- **Failed:** Red banner with error details

Can be used in user dashboard or domain management pages.

#### App Router ([frontend/src/AppRouter.js](frontend/src/AppRouter.js))

Routes configuration:
- `/` - Main app
- `/verify-email` - Email verification page

Updated [frontend/src/index.js](frontend/src/index.js#L5) to use router.

## Workflow

### Domain Registration Flow (Updated)

```
1. User completes payment via Stripe
2. Webhook triggers domain registration
3. Register domain at Namecheap (1-2 min)
4. Create Cloudflare DNS zone
5. Update nameservers at Namecheap
6. Enable Cloudflare Email Routing
7. Create forwarding destination
8. Create forwarding rule (catch-all)
9. ⭐ Generate verification token
10. ⭐ Store token in database
11. ⭐ Send verification email to user
12. Status: pending_verification
```

### Email Verification Flow

```
1. User receives email with subject: "Verify your email for example.com"
2. Email contains button/link: https://yourapp.com/verify-email?token=xxx&domain=example.com
3. User clicks link
4. Frontend shows "Verifying..." spinner
5. Frontend calls: GET /api/verification/verify-email?token=xxx&domain=example.com
6. Backend validates token:
   - Check token exists in database
   - Check token not expired (7 days)
   - Check domain matches
7. Backend updates database:
   - cloudflare_destination_verified = true
   - status = 'active'
   - email_verified_at = NOW()
   - Clear verification_token
8. Backend sends success email
9. Frontend shows success page
10. Email forwarding is now active!
```

## Database Status States

Domains now flow through these states:

```
pending_purchase
    ↓
registered (Namecheap registration complete)
    ↓
cloudflare_zone_created (DNS zone created)
    ↓
nameservers_updated (Pointing to Cloudflare)
    ↓
pending_verification (⭐ Email sent, awaiting user click)
    ↓
active (✓ Verified, email forwarding working)
```

**Error states:**
- `namecheap_registration_failed`
- `cloudflare_setup_failed`
- `nameserver_update_failed`
- `email_setup_failed`

## Email Templates

### Verification Email

**Subject:** Verify your email for {domain}

**Content:**
- Welcome message
- Domain name
- "Verify Email Address" button (links to verification page)
- Link expiry notice (7 days)
- Instructions about email forwarding
- "If you didn't register..." notice

### Success Email (after verification)

**Subject:** Your domain {domain} is registered!

**Content:**
- Congratulations message
- Domain details (nameservers, email forwarding)
- Next steps guide
- Support contact

## Setup Instructions

### 1. Run Database Migration

In Supabase SQL Editor:

```bash
# Run the migration
psql -h your-supabase-host -U postgres -d postgres -f backend/supabase/migrations/add_email_verification_fields.sql
```

Or paste the SQL into Supabase Dashboard → SQL Editor.

### 2. Configure Email Provider (Production)

**Option A: Console Mode (Development)**
- Already configured
- Emails are logged to console

**Option B: SendGrid (Recommended)**
```bash
npm install @sendgrid/mail

# .env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_key
FROM_EMAIL=noreply@posty.com
```

**Option C: AWS SES**
```bash
npm install @aws-sdk/client-ses

# .env
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
FROM_EMAIL=noreply@posty.com
```

**Option D: Postmark**
```bash
npm install postmark

# .env
EMAIL_PROVIDER=postmark
POSTMARK_API_KEY=your_key
FROM_EMAIL=noreply@posty.com
```

Update [backend/services/emailService.js](backend/services/emailService.js) `_sendEmail()` method with your provider's implementation.

### 3. Install Frontend Dependencies

Already installed:
```bash
cd frontend
npm install react-router-dom
```

### 4. Update Environment Variables

Ensure these are set in `.env`:

```bash
# Frontend URL for verification links
FRONTEND_URL=http://localhost:3000  # Update for production

# Email provider (optional, defaults to console)
EMAIL_PROVIDER=console

# Sender email (for production)
FROM_EMAIL=noreply@posty.com
```

### 5. Test the Flow

1. Start backend: `npm run server`
2. Start frontend: `cd frontend && npm start`
3. Complete a test purchase
4. Check backend logs for verification email output
5. Copy verification URL from logs
6. Paste in browser to test verification page
7. Verify status updates in database

## Testing Endpoints

### Test Verification (with curl)

```bash
# Get a token from database
TOKEN="your_verification_token"
DOMAIN="example.com"

# Test verification
curl "http://localhost:3001/api/verification/verify-email?token=$TOKEN&domain=$DOMAIN"
```

### Test Resend (requires auth)

```bash
# Get auth token from Supabase session
AUTH_TOKEN="your_supabase_jwt"

curl -X POST http://localhost:3001/api/verification/resend \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"domainName": "example.com"}'
```

### Check Status

```bash
curl http://localhost:3001/api/verification/status/example.com \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## Security Considerations

✓ **Tokens are cryptographically secure** (32 bytes random hex)
✓ **Tokens expire after 7 days**
✓ **Tokens are cleared after use** (prevents reuse)
✓ **Verification requires both token AND domain** (prevents token reuse for other domains)
✓ **Verification endpoint is public** (no auth required - token is the auth)
✓ **Rate limiting** applied to all API routes via Express rate limiter

## Monitoring & Troubleshooting

### Check Verification Status in Database

```sql
SELECT
  domain_name,
  status,
  cloudflare_destination_verified,
  verification_sent_at,
  email_verified_at,
  email_forwarding_destination
FROM domains
WHERE user_id = 'user_id_here'
ORDER BY created_at DESC;
```

### Common Issues

**User didn't receive email:**
- Check email service logs
- Verify email provider is configured
- Check spam folder
- Use resend endpoint

**Verification link expired:**
- Token expires after 7 days
- User can request new verification via dashboard
- Use `POST /api/verification/resend`

**Token invalid:**
- Token may have been used already
- Token may be for different domain
- Check database for `verification_token` field

**Email forwarding not working after verification:**
- Nameserver propagation takes 24-48 hours
- Verify nameservers are set correctly at Namecheap
- Check Cloudflare Email Routing status

## Dashboard Integration Example

To add verification status to a user dashboard:

```jsx
import DomainVerificationStatus from './components/DomainVerificationStatus';

function UserDashboard() {
  const [domains, setDomains] = useState([]);

  // Fetch user's domains
  useEffect(() => {
    fetchDomains();
  }, []);

  return (
    <div>
      <h2>My Domains</h2>
      {domains.map(domain => (
        <div key={domain.id}>
          <h3>{domain.domain_name}</h3>
          <DomainVerificationStatus
            domain={domain}
            onVerificationUpdate={() => fetchDomains()}
          />
        </div>
      ))}
    </div>
  );
}
```

## Future Enhancements (Option 3 Preview)

The current implementation (Option 2) handles verification within Posty. For even more power, Option 3 would involve:

- **Cloudflare Workers for Email**
  - Receive emails directly on Cloudflare edge
  - Process/forward without verification requirement
  - Full control over email content
  - Advanced features (filtering, attachments, replies)

This is saved for future consideration as you mentioned.

## Files Modified

### Backend
- ✅ [backend/services/emailService.js](backend/services/emailService.js) - New
- ✅ [backend/services/domainRegistrationService.js](backend/services/domainRegistrationService.js) - Updated
- ✅ [backend/controllers/verificationController.js](backend/controllers/verificationController.js) - New
- ✅ [backend/routes/verification.js](backend/routes/verification.js) - New
- ✅ [backend/server.js](backend/server.js) - Updated (added route)
- ✅ [backend/supabase/migrations/add_email_verification_fields.sql](backend/supabase/migrations/add_email_verification_fields.sql) - New

### Frontend
- ✅ [frontend/src/components/VerifyEmail.js](frontend/src/components/VerifyEmail.js) - New
- ✅ [frontend/src/components/DomainVerificationStatus.js](frontend/src/components/DomainVerificationStatus.js) - New
- ✅ [frontend/src/AppRouter.js](frontend/src/AppRouter.js) - New
- ✅ [frontend/src/index.js](frontend/src/index.js) - Updated (added router)
- ✅ [frontend/package.json](frontend/package.json) - Updated (added react-router-dom)

## Summary

✅ **Email Service** - Sends beautiful verification emails (console mode for dev)
✅ **Verification Workflow** - Secure 7-step process with tokens
✅ **API Endpoints** - Verify, resend, check status
✅ **Database Schema** - Tracks verification state and tokens
✅ **Frontend UI** - Verification page + status component
✅ **Routing** - React Router for verification page

**User Experience:**
1. User buys domain → Receives email from Posty
2. User clicks "Verify Email" button
3. Beautiful verification page confirms success
4. Email forwarding activates automatically
5. User never touches Cloudflare

**Ready for Production:**
- Configure email provider (SendGrid, SES, etc.)
- Run database migration
- Update FRONTEND_URL in .env
- Test end-to-end flow
- Deploy!
