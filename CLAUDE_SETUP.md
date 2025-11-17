# Claude API Setup Guide

This guide will help you set up and configure the Claude API integration for the Posty conversational questionnaire.

## Prerequisites

- Node.js installed (v14 or higher)
- An Anthropic API key (see below)
- Git (for cloning the repository)

## Getting Your Anthropic API Key

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** in the dashboard
4. Click **Create Key** and give it a descriptive name (e.g., "Posty Development")
5. Copy the generated API key (it starts with `sk-ant-`)
6. Store it securely - you won't be able to see it again

## Environment Configuration

### Step 1: Create `.env` file

Copy the example environment file:

```bash
cp .env.example .env
```

### Step 2: Configure your settings

Open `.env` and update the following:

```bash
# Required: Your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here

# Service Mode
# Set to 'true' for mock service (free, no API costs)
# Set to 'false' for real Claude API (costs per request)
MOCK_MODE=false

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

## Service Modes

### Mock Mode (Default)

**When to use:** Development, testing, demo purposes

**Pros:**
- No API costs
- Instant responses
- No internet connection needed
- Predictable behavior

**Cons:**
- Limited conversation quality
- No creative "magic moments"
- Rigid questionnaire flow

**Configuration:**
```bash
MOCK_MODE=true
# API key not required in mock mode
```

### Real Claude API Mode

**When to use:** Production, final testing, full feature experience

**Pros:**
- Natural, intelligent conversation
- Creative domain suggestions
- Adaptive to user responses
- "Magic moments" with entity research (future)

**Cons:**
- Costs per API request (~$0.003 per conversation)
- Requires internet connection
- Slightly slower responses (1-2 seconds)

**Configuration:**
```bash
MOCK_MODE=false
ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here
```

## Installation & Running

### Backend Setup

```bash
# Install dependencies
npm install

# Start the backend server
npm start
# Or with nodemon for auto-reload:
npm run dev
```

The backend will start on `http://localhost:3001`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the React app
npm start
```

The frontend will start on `http://localhost:3000`

## Testing the Integration

### 1. Check Service Status

The backend logs will show which service is active:

```
🤖 Using MOCK Claude Service (no API costs)
```

or

```
🧠 Using REAL Claude API Service
```

### 2. Test a Conversation

1. Open `http://localhost:3000` in your browser
2. Click the microphone or type a message
3. Complete the 5-stage questionnaire:
   - **Stage 1:** Provide your full name
   - **Stage 2:** Provide your location
   - **Stage 3:** Mention your profession(s)
   - **Stage 4:** Share your interests (optional)
   - **Stage 5:** Review domain recommendations

### 3. Verify Claude Responses

**Mock Service responses are:**
- Consistent and predictable
- Follow exact templates
- Fast (< 100ms)

**Real Claude API responses are:**
- Natural and conversational
- Adaptive to user input
- Slightly slower (1-2 seconds)
- More creative and personal

## Troubleshooting

### Error: "Invalid API Key"

**Cause:** API key is incorrect or not set

**Fix:**
1. Check your `.env` file has the correct `ANTHROPIC_API_KEY`
2. Ensure the key starts with `sk-ant-`
3. Verify the key is active in Anthropic Console
4. Restart the backend server after changing `.env`

### Error: "Rate limit exceeded"

**Cause:** Too many API requests in short time

**Fix:**
1. Wait 60 seconds before retrying
2. Switch to mock mode temporarily: `MOCK_MODE=true`
3. Check your Anthropic Console for rate limits

### Response takes too long

**Cause:** Network latency or API processing time

**Fix:**
1. Check your internet connection
2. Verify Anthropic API status: [status.anthropic.com](https://status.anthropic.com)
3. Consider increasing timeout in `claudeService.js` if needed

### Mock mode not working

**Cause:** Environment variable not set correctly

**Fix:**
1. Ensure `.env` has `MOCK_MODE=true` (no quotes, lowercase true)
2. Restart the backend server
3. Check backend logs for "Using MOCK Claude Service"

## API Costs

Current pricing (as of 2025):
- **Claude Sonnet 4.5:** ~$3 per million input tokens, ~$15 per million output tokens
- **Average conversation:** ~2,000 tokens total = ~$0.003 per conversation
- **1,000 conversations:** ~$3.00

Mock mode is recommended for development to avoid costs.

## Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore` for safety
2. **Keep API keys private** - Don't share or expose them
3. **Rotate keys regularly** - Generate new keys every few months
4. **Use separate keys** - Different keys for development/production
5. **Monitor usage** - Check Anthropic Console for unexpected activity

## Next Steps

Once Claude API is working:

1. **Test conversation quality** - Try different inputs
2. **Monitor API costs** - Track usage in Anthropic Console
3. **Implement entity research** - Add web search for "magic moments"
4. **Expand to 10 categories** - Enhanced recommendation engine
5. **Add purchase flow** - Domain registration integration

## Support

- **Anthropic Documentation:** [docs.anthropic.com](https://docs.anthropic.com)
- **API Reference:** [docs.anthropic.com/reference](https://docs.anthropic.com/reference)
- **Posty Documentation:** See `posty_questionnaire_structure.md` and `posty_recommendation_engine.md`

---

**Last Updated:** 2025-11-17
**Claude Model:** claude-sonnet-4-5-20250929
