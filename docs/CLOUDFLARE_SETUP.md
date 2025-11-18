# Cloudflare Setup Guide for Posty

This guide walks you through setting up Cloudflare for FREE domain availability checking and future domain registration.

## Why Cloudflare?

- **FREE domain availability checks** - No per-request charges
- **Accurate results** - Direct from registrar data
- **At-cost domain pricing** - ~$9-12/year with no markup
- **FREE email routing** - Forward emails from your domain to Gmail
- **World-class API** - Fast, reliable, well-documented

See [Why Cloudflare?](WHY_CLOUDFLARE.md) for detailed comparison.

---

## Quick Start (5 minutes)

### Step 1: Create Cloudflare Account

1. Go to [cloudflare.com](https://www.cloudflare.com/)
2. Click "Sign Up" (it's free)
3. Verify your email address

### Step 2: Get Your Account ID

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Look at the right sidebar - you'll see **Account ID**
3. Copy it (format: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

### Step 3: Create API Token

1. Go to [API Tokens page](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"**
3. Scroll down to "Custom token" and click **"Get started"**
4. Configure your token:
   - **Token name**: `Posty Domain Checker`
   - **Permissions**:
     - `Account` → `Registrar` → `Read` + `Edit`
     - (Optional) `Zone` → `Zone` → `Read` (for DNS features later)
   - **Account Resources**:
     - Include → Your account name
   - **IP Address Filtering**: Leave blank (allow all IPs)
   - **TTL**: Leave as default (forever)
5. Click **"Continue to summary"**
6. Click **"Create Token"**
7. **IMPORTANT**: Copy the token now - you won't see it again!

### Step 4: Add to Posty

1. Open `/posty-project/.env`
2. Add your credentials:

```env
CLOUDFLARE_API_TOKEN=your_actual_token_here
CLOUDFLARE_ACCOUNT_ID=your_actual_account_id_here
```

3. Restart your Posty server

### Step 5: Verify It Works

Start Posty and look for this message in the console:

```
✓ Cloudflare domain service initialized
✓ Domain checking: Using Cloudflare Registrar API (FREE)
```

Test it:

```bash
curl -X POST http://localhost:3001/api/domains/check \
  -H "Content-Type: application/json" \
  -d '{"domain":"example-test-12345.com"}'
```

You should see: `"method": "cloudflare"`

**Note**: Currently configured with **Read-only** permissions. This is perfect for domain availability checking (which is all we need for development). When ready to enable actual domain purchases, update the token to include **Edit** permissions.

---

## What Happens Now?

### During Development (Now)

- ✅ **FREE domain availability checks** - Test as much as you want
- ✅ **Accurate results** - Real registrar data
- ✅ **Pricing information** - Know exact costs upfront
- ✅ **Fallback support** - If Cloudflare fails, falls back to DNS/WHOIS

### When You Launch (Later)

Once you're ready to let users actually purchase domains:

1. **Add payment method** to Cloudflare (credit card)
2. **No code changes needed** - Same API handles purchases
3. **At-cost pricing** - Cloudflare charges only what they pay
4. **Set up email routing** - FREE forwarding to user's Gmail

---

## Troubleshooting

### "Cloudflare service not configured"

**Problem**: Credentials missing or incorrect

**Solution**:
1. Check `.env` file has both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
2. Verify no extra spaces or quotes around values
3. Restart the server: `npm run dev`

### "401 Unauthorized" or "403 Forbidden"

**Problem**: API token doesn't have correct permissions

**Solution**:
1. Go to [API Tokens page](https://dash.cloudflare.com/profile/api-tokens)
2. Find your "Posty Domain Checker" token
3. Click "Edit" (pencil icon)
4. Verify permissions:
   - ✅ Account → Registrar → Read + Edit
5. Save and restart Posty

### "404 Not Found" errors

**Problem**: Account ID might be wrong

**Solution**:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Check Account ID in right sidebar
3. Copy exact value to `.env`
4. Restart Posty

### Falling back to DNS/WHOIS

**Problem**: Cloudflare API call failed, but system still works

**What it means**: System automatically fell back to DNS/WHOIS checking. Results may be less accurate but still functional.

**When to fix**:
- If you see this occasionally: Normal (API hiccup)
- If you see this constantly: Check credentials and permissions

---

## Advanced Configuration

### Rate Limits

Cloudflare's free API has generous rate limits:

- **Registrar API**: 1,200 requests/5 minutes per token
- **More than enough** for testing and development

### Caching

Posty caches domain availability results for 6 hours to:
- Reduce API calls
- Speed up repeated checks
- Stay well under rate limits

### Multiple Environments

For production, create a separate API token:

```env
# .env.production
CLOUDFLARE_API_TOKEN=prod_token_here
CLOUDFLARE_ACCOUNT_ID=same_account_id
```

---

## Security Best Practices

### API Token Security

✅ **DO**:
- Create tokens with minimum required permissions
- Use different tokens for dev/staging/prod
- Rotate tokens every 90 days
- Keep tokens in `.env` (not committed to git)

❌ **DON'T**:
- Share tokens in Slack/email
- Commit tokens to git repositories
- Use the same token across multiple apps
- Give tokens more permissions than needed

### .gitignore

Verify `.env` is in your `.gitignore`:

```bash
# Check if .env is ignored
git check-ignore .env
# Should output: .env
```

---

## Cost Breakdown

### FREE Forever
- ✅ Domain availability checking
- ✅ Email routing (unlimited)
- ✅ DNS management
- ✅ API access

### Pay Only When Used
- 💰 Domain registration: ~$9-12/year per domain
- 💰 Domain renewal: Same price as registration
- 💰 Domain transfer: Usually free or $9-12

### Example Costs (per customer)

If a customer buys `john@johndoe.com`:

```
Domain registration (johndoe.com): $9.77/year
Email routing:                      $0.00/year
DNS hosting:                        $0.00/year
API usage:                          $0.00/year
─────────────────────────────────────────────
Total cost to you:                  $9.77/year
```

If you charge $99/year, your margin is **90%** ($89.23 profit).

---

## Next Steps

1. ✅ Set up Cloudflare API (you're here)
2. 📝 Test domain availability checking
3. 🎨 Build domain recommendation UI
4. 💳 Add payment processing (Stripe)
5. 🚀 Launch MVP
6. 📧 Set up email routing for customers

---

## Resources

- [Cloudflare Registrar API Docs](https://developers.cloudflare.com/registrar/api/)
- [Email Routing Setup Guide](https://developers.cloudflare.com/email-routing/)
- [API Token Permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
- [Rate Limits Documentation](https://developers.cloudflare.com/fundamentals/api/reference/limits/)

---

## Support

Having issues? Check:

1. [Cloudflare Community](https://community.cloudflare.com/)
2. [Posty GitHub Issues](https://github.com/your-repo/posty/issues)
3. This documentation's troubleshooting section above

---

**Last Updated**: November 2025
**Cloudflare Plan Required**: Free tier is sufficient for development and testing
