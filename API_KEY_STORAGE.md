# API Key Storage & Recovery Guide

## Anthropic API Key Location

Your Anthropic API key for the Posty project is stored in **multiple secure locations** to prevent loss:

### 1. Active Configuration (In Use)
**Location:** `/Users/andreaskeinicke/Desktop/posty-project/.env`
```bash
ANTHROPIC_API_KEY=sk-ant-api03-[REDACTED FOR SECURITY]
```

**Status:** ✅ Currently in use by the backend server
**Note:** The actual key is stored in `.env` and `.credentials/ANTHROPIC_API_KEY.txt` (both gitignored)

### 2. Local Backup (Gitignored)
**Location:** `/Users/andreaskeinicke/Desktop/posty-project/.credentials/ANTHROPIC_API_KEY.txt`

This file contains:
- The full API key
- Key metadata (name, created date, workspace)
- Usage instructions
- Recovery steps

**Security:** This directory is added to `.gitignore` and will **never be committed to git**

### 3. Anthropic Console
**Location:** https://console.anthropic.com/settings/keys

**Key Details:**
- **Key Name:** posty-project
- **Created:** Nov 17, 2025
- **Last Used:** 30+ days ago (as of Jun 3, 2026)
- **Workspace:** Default
- **Partial Key:** `sk-ant-api03-CD6...IwAA` (first/last chars visible)

**Note:** You can always view or regenerate this key from the Anthropic Console.

---

## Recovery Instructions

### If You Lose the API Key:

#### Option 1: Use Local Backup (Fastest)
```bash
cd ~/Desktop/posty-project
cat .credentials/ANTHROPIC_API_KEY.txt
# Copy the key and update .env if needed
```

#### Option 2: Use Existing .env File
```bash
cd ~/Desktop/posty-project
grep ANTHROPIC_API_KEY .env
```

#### Option 3: Get from Anthropic Console
1. Go to https://console.anthropic.com/settings/keys
2. Find the "posty-project" key
3. Click to reveal and copy the full key
4. Update `.env` file:
   ```bash
   ANTHROPIC_API_KEY=<paste-key-here>
   ```

#### Option 4: Create New Key
1. Go to https://console.anthropic.com/settings/keys
2. Click "+ Create key"
3. Name it "posty-project-v2" or similar
4. Copy the new key
5. Update `.env` and `.credentials/ANTHROPIC_API_KEY.txt`

---

## Security Best Practices

### ✅ Protected Locations
- `.env` files are gitignored (never committed)
- `.credentials/` directory is gitignored
- API keys are not stored in code or public docs

### ⚠️ Do NOT Store Keys In:
- Git commits
- Public documentation
- Screenshots shared publicly
- Unencrypted cloud storage
- Shared code snippets

### 🔒 Key Safety Tips
1. **Never commit `.env` files** - Already configured in `.gitignore`
2. **Keep `.credentials/` local** - Already gitignored
3. **Use environment variables** - Production servers use secure env vars
4. **Rotate keys if exposed** - Generate new key in Anthropic Console
5. **Monitor usage** - Check Anthropic Console for unexpected API usage

---

## Verification

### Check if Key is Configured Correctly:

```bash
cd ~/Desktop/posty-project

# Check .env has the key
grep ANTHROPIC_API_KEY .env

# Verify it starts with 'sk-ant-'
grep "^ANTHROPIC_API_KEY=sk-ant-" .env && echo "✅ Key format is correct"

# Test backend initialization
npm run server
# Look for: "🧠 Running with REAL Claude API"
```

### Test Claude API Connection:

```bash
# Start the backend server
npm run server

# In another terminal, test the chat endpoint
curl -X POST http://localhost:3001/api/questionnaire/suggest \
  -H "Content-Type: application/json" \
  -d '{"entity":"photographer","context":{}}'
```

If you see creative suggestions, the API key is working correctly.

---

## All API Keys for Posty Project

| Service | Environment Variable | Location | Status |
|---------|---------------------|----------|---------|
| Anthropic Claude | `ANTHROPIC_API_KEY` | .env line 9 | ✅ Configured |
| Cloudflare | `CLOUDFLARE_API_TOKEN` | .env line 12 | ✅ Configured |
| Cloudflare | `CLOUDFLARE_ACCOUNT_ID` | .env line 13 | ✅ Configured |
| Namecheap | `NAMECHEAP_API_KEY` | .env line 17 | ✅ Configured |
| Stripe | `STRIPE_SECRET_KEY` | .env line 40 | ✅ Configured |
| Stripe | `STRIPE_WEBHOOK_SECRET` | .env line 41 | ✅ Configured |
| Supabase | `SUPABASE_URL` | .env line 47 | ✅ Configured |
| Supabase | `SUPABASE_SERVICE_ROLE_KEY` | .env line 49 | ✅ Configured |

---

## Backup Checklist

✅ API key saved in `.env`
✅ API key backed up in `.credentials/`
✅ `.gitignore` configured to exclude credentials
✅ `.env.example` updated with instructions
✅ Recovery instructions documented
✅ Key verified working in Claude service

**Last Updated:** June 3, 2026
**Verified By:** Claude Code

---

## Quick Reference

**To restore the Anthropic API key:**
```bash
# Copy from backup
cat ~/Desktop/posty-project/.credentials/ANTHROPIC_API_KEY.txt

# Or check current .env
grep ANTHROPIC_API_KEY ~/Desktop/posty-project/.env
```

**Key Format:**
```
sk-ant-api03-[64 characters]-[4 chars]
```

**Length:** 96 characters total
**Starts with:** `sk-ant-api03-`
**Your key starts with:** `sk-ant-api03-[FIRST_7_CHARS_REDACTED]...`
**Your key ends with:** `...[LAST_8_CHARS_REDACTED]`
**Note:** Check `.credentials/ANTHROPIC_API_KEY.txt` for the full key (local only, gitignored)

---

## Support

If you need help with API keys:
- **Anthropic Support:** https://support.anthropic.com
- **API Documentation:** https://docs.anthropic.com
- **Console:** https://console.anthropic.com

**Project maintained by:** Andreas Keinicke (andreaskeinicke@hotmail.com)
