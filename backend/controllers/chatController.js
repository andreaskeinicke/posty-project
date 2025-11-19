const claudeService = require('../services/claudeService');
const mockClaudeService = require('../services/mockClaudeService');

// Debug: Log environment variables
console.log('🔧 DEBUG - MOCK_MODE:', process.env.MOCK_MODE);
console.log('🔧 DEBUG - Has API Key:', !!process.env.ANTHROPIC_API_KEY);

// Use mock service if MOCK_MODE is enabled or if API key is missing
const USE_MOCK = process.env.MOCK_MODE === 'true' || !process.env.ANTHROPIC_API_KEY;
const activeService = USE_MOCK ? mockClaudeService : claudeService;

if (USE_MOCK) {
  console.log('🎭 Running in MOCK MODE - no API calls will be made');
} else {
  console.log('🧠 Running with REAL Claude API');
}

// In-memory session storage (in production, use Redis or similar)
const sessions = new Map();

// System prompt for Posty conversation
const SYSTEM_PROMPT = `You are Posty, an AI assistant that helps people find perfect email domain names.

Your goal is to guide users through a natural conversation to collect:
1. Their full name
2. Their location (country, city, and state if US)
3. Their profession(s)
4. Their interests (optional)

Then generate personalized domain suggestions.

CONVERSATION TONE:
- Warm and friendly, NOT corporate
- Conversational, like a helpful friend
- No excessive enthusiasm ("Awesome! That's great!")
- Natural transitions

QUESTIONNAIRE FLOW:
1. **Name**: Ask "What's your full name?" - Parse into firstName, middleName, lastName
2. **Location**: Ask "What country and city are you in?" - If US, also ask for state
3. **Profession**: Ask "What do you do professionally? (you can mention several occupations or positions if relevant)"
4. **Interests** (Optional): Ask "This is optional, but it helps me get creative: What are you interested in? (or say 'skip')"
5. **Generate & Present**: Show categorized domain suggestions with grouped TLDs

IMPORTANT RULES:
- Parse names carefully (handle middle names, special characters)
- Split multiple professions separately
- For international names with special characters (ø, æ, ü, etc.), tell user you'll convert them for domains
- After collecting info, generate domain suggestions in these categories:
  1. **Your Name** (name variations)
  2. **Short Handles** (grouped TLDs like: akg (.com / .io / .me))
  3. **Your Location** (if city has abbreviation)
  4. **For [Profession]** (separate per profession)
  5. **Creative** (based on interests if provided)

After showing suggestions, ask: "Do any of these feel just right? Or would you like me to explore some different directions?"

Be helpful in guiding them to choose or explore more options.`;

/**
 * Get or create session
 */
function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      messages: [],
      userInfo: {
        fullName: '',
        firstName: '',
        middleName: '',
        lastName: '',
        preferredName: '',
        normalizedName: '',
        country: '',
        city: '',
        state: '',
        cityAbbreviation: null,
        locationString: '',
        tlds: [],
        professions: [],
        interests: [],
        handles: []
      },
      stage: 'welcome', // welcome, location, profession, interests, review
      createdAt: new Date(),
      lastActivity: new Date()
    });
  }

  const session = sessions.get(sessionId);
  session.lastActivity = new Date();
  return session;
}

/**
 * Send a message to Claude and get a response
 */
exports.sendMessage = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({
        error: 'Message and sessionId are required'
      });
    }

    // Get or create session
    const session = getSession(sessionId);

    // Add user message to session
    session.messages.push({
      role: 'user',
      content: message
    });

    // Call Claude API (or mock) with system prompt and conversation history
    const response = await activeService.sendMessage(
      session.messages,
      {
        system: SYSTEM_PROMPT,
        max_tokens: 1024,
        sessionId: sessionId
      }
    );

    if (!response.success) {
      return res.status(500).json({
        error: 'Failed to get response from Claude',
        details: response.error
      });
    }

    // Add assistant response to session
    session.messages.push({
      role: 'assistant',
      content: response.message
    });

    // Extract user info from the conversation using patterns
    const userInfo = extractUserInfo(message, session);

    // Update session with extracted info
    if (userInfo) {
      Object.assign(session.userInfo, userInfo);
    }

    // Return response
    res.json({
      reply: response.message,
      userInfo: session.userInfo,
      options: response.options, // Pass through button options from mock service
      usage: response.usage
    });

  } catch (error) {
    console.error('Chat controller error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Extract user information from messages
 */
function extractUserInfo(message, session) {
  const updates = {};
  const stage = session.stage;

  // Simple pattern matching (in a real implementation, Claude could extract this)
  if (stage === 'welcome' && message.trim().split(' ').length >= 2) {
    // Likely a name
    const nameParts = message.trim().split(/\s+/);
    if (nameParts.length === 2) {
      updates.firstName = nameParts[0];
      updates.lastName = nameParts[1];
      updates.fullName = message.trim();
    } else if (nameParts.length >= 3) {
      updates.firstName = nameParts[0];
      updates.middleName = nameParts.slice(1, -1).join(' ');
      updates.lastName = nameParts[nameParts.length - 1];
      updates.fullName = message.trim();
    }
    updates.preferredName = updates.firstName?.toLowerCase() || '';
    updates.normalizedName = normalizeName(updates.firstName || '');
    session.stage = 'location';
  } else if (stage === 'location') {
    // Extract location
    const locationParts = message.split(',').map(s => s.trim());
    if (locationParts.length >= 2) {
      updates.city = locationParts[0];
      updates.country = locationParts[locationParts.length - 1];
      updates.locationString = message.trim();

      // Check if US (might need to ask for state)
      const isUS = updates.country.toLowerCase().includes('united states') ||
                   updates.country.toLowerCase().includes('usa') ||
                   updates.country.toLowerCase() === 'us';

      if (!isUS) {
        session.stage = 'profession';
      }
    } else if (locationParts.length === 1) {
      updates.country = locationParts[0];
      updates.locationString = message.trim();
      session.stage = 'profession';
    }
  } else if (stage === 'profession') {
    // Extract professions
    const professions = message
      .split(/,|\band\b/i)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    updates.professions = professions;
    session.stage = 'interests';
  } else if (stage === 'interests') {
    // Extract interests
    if (message.toLowerCase() !== 'skip' && message.toLowerCase() !== 'none') {
      const interests = message
        .split(/,|\band\b/i)
        .map(i => i.trim())
        .filter(i => i.length > 0);
      updates.interests = interests;
    }
    session.stage = 'review';
  }

  return Object.keys(updates).length > 0 ? updates : null;
}

/**
 * Normalize name (remove special characters)
 */
function normalizeName(name) {
  const charMappings = {
    'ø': 'o', 'ö': 'o', 'å': 'aa', 'æ': 'ae',
    'ü': 'ue', 'ä': 'ae', 'ß': 'ss',
    'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a', 'â': 'a', 'ç': 'c',
    'ñ': 'n', 'á': 'a', 'í': 'i', 'ó': 'o', 'ú': 'u',
    'ã': 'a', 'õ': 'o',
    'ł': 'l', 'ż': 'z', 'ź': 'z', 'ś': 's', 'č': 'c', 'ć': 'c'
  };

  let normalized = name.toLowerCase();
  for (const [special, replacement] of Object.entries(charMappings)) {
    normalized = normalized.replace(new RegExp(special, 'g'), replacement);
  }

  // Remove any remaining non-ASCII
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return normalized;
}

/**
 * Stream responses from Claude
 */
exports.streamMessage = async (req, res) => {
  try {
    const { messages, options } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required'
      });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await activeService.streamMessage(
      messages,
      (chunk) => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);

        if (chunk.type === 'complete' || chunk.type === 'error') {
          res.end();
        }
      },
      options
    );
  } catch (error) {
    console.error('Stream controller error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

// Clean up old sessions periodically (older than 1 hour)
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [sessionId, session] of sessions.entries()) {
    if (session.lastActivity < oneHourAgo) {
      sessions.delete(sessionId);
    }
  }
}, 15 * 60 * 1000); // Every 15 minutes
