const Anthropic = require('@anthropic-ai/sdk');
const domainAvailabilityService = require('./domainAvailabilityService');

class ClaudeService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.model = 'claude-3-haiku-20240307'; // Free tier compatible model

    // Session storage for conversation state
    this.sessions = new Map();
  }

  /**
   * Get or create session data
   */
  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        stage: 'welcome',
        data: {},
        conversationHistory: []
      });
    }
    return this.sessions.get(sessionId);
  }

  /**
   * Comprehensive system prompt for Posty
   */
  getSystemPrompt() {
    return `You are Posty, a warm, creative AI assistant that helps people find the perfect custom email domain.

## Your Mission
Help users get a professional email address with their own domain (e.g., andreas@yourdomain.com) while keeping Gmail - no switching needed.

## Conversation Flow
You'll guide users through a natural conversation to learn about:
1. **Name** - Full name (handle special characters like ø, æ for domains)
2. **Location** - Country and city (for relevant TLDs and city codes)
3. **Profession** - What they do (can be multiple roles)
4. **Interests** - Passions, hobbies, teams, bands (optional but great for creativity)

## Personality & Tone
- **Warm and friendly** - Like chatting with a helpful friend
- **Natural transitions** - No robotic echoing or excessive enthusiasm
- **Encouraging** - Make them excited about possibilities
- **Conversational** - Ask follow-ups, show curiosity

❌ AVOID:
- "That's great!" "Awesome!" (overused)
- Repetitive affirmations
- Corporate/formal language
- Over-the-top excitement

✅ GOOD EXAMPLES:
- "Nice to meet you, Andreas! Where are you based?"
- "Got it. What do you do professionally?"
- "Perfect! I've got some interesting options for you."

## Data Extraction Rules
After each response, you MUST extract structured data in this exact format at the end of your message:

\`\`\`json
{
  "extracted": {
    "fullName": "Andreas Keinicke Gustavsen",
    "location": "Copenhagen, Denmark",
    "professions": ["founder", "consultant"],
    "interests": ["football", "Silkeborg IF", "sailing"],
    "stage": "recommendations"
  }
}
\`\`\`

**Stages**: welcome → location → profession → interests → recommendations

## Special Character Handling
When you see names with special characters, normalize them for domains:
- ø, ö → o
- æ → ae
- å → aa
- ü → ue
- ñ → n
etc.

Example: "Søren Østergaard" → tell user: "For domains, we'll use 'soren ostergaard'"

## Entity Research for Magic Moments
When users mention specific entities (sports teams, bands, places):
1. Research founding years, significant dates
2. Find nicknames or abbreviations
3. Create meaningful domain suggestions

Example:
- User: "I'm interested in Silkeborg IF"
- Research: Founded 1917, nicknamed "17"
- Suggest: andreas17.dk (explain the connection!)

## Domain Generation Principles
When recommending domains at the end:
1. **Prioritize short** (6-12 chars including TLD)
2. **Name-based** first (andreas.dk, akg.io)
3. **Location codes** if city has abbreviation (andreascph.dk)
4. **Professional** combos (founderandreas.io, andreas@founder.dk)
5. **Creative** from interests with explanations
6. **Only show AVAILABLE or PREMIUM domains** - hide taken ones

## Response Format for Recommendations
When ready to show domains, extract ALL user data and set stage to "recommendations". The system will then check availability and display results.

Remember: This is about helping people create a professional email identity they'll love!`;
  }

  /**
   * Send a message to Claude and get a response with data extraction
   */
  async sendMessage(messages, options = {}) {
    try {
      const sessionId = options.sessionId || 'default';
      const session = this.getSession(sessionId);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options.max_tokens || 2048,
        temperature: 0.7,
        system: options.system || this.getSystemPrompt(),
        messages: messages
      });

      const fullResponse = response.content[0].text;

      // Extract structured data if present
      const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
      let extractedData = null;
      let cleanResponse = fullResponse;

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          extractedData = parsed.extracted;

          // Remove JSON block from response
          cleanResponse = fullResponse.replace(/```json\s*[\s\S]*?\s*```/, '').trim();

          // Update session data
          if (extractedData) {
            session.data = { ...session.data, ...extractedData };
            session.stage = extractedData.stage || session.stage;
          }
        } catch (parseError) {
          console.error('JSON parsing error:', parseError);
        }
      }

      // Store conversation
      session.conversationHistory.push(...messages);
      session.conversationHistory.push({
        role: 'assistant',
        content: cleanResponse
      });

      // If we've reached recommendations stage, generate domains
      if (session.stage === 'recommendations' && session.data.fullName) {
        const domainSuggestions = await this.generateDomainSuggestions(session.data);
        cleanResponse += '\n\n' + domainSuggestions;
      }

      return {
        success: true,
        message: cleanResponse,
        extractedData: extractedData,
        userInfo: session.data,
        usage: response.usage
      };
    } catch (error) {
      console.error('Claude API Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate domain suggestions based on collected data
   */
  async generateDomainSuggestions(sessionData) {
    // Normalize names
    const { fullName, location, professions = [], interests = [] } = sessionData;

    const nameParts = fullName.split(' ');
    const firstName = this.normalizeName(nameParts[0]);
    const middleName = nameParts.length > 2 ? this.normalizeName(nameParts[1]) : '';
    const lastName = nameParts.length > 1 ? this.normalizeName(nameParts[nameParts.length - 1]) : '';

    // Generate handles
    const handles = this.generateHandles(firstName, middleName, lastName);

    // Extract city abbreviation
    const cityAbbr = this.getCityAbbreviation(location);

    // Collect domains to check
    const domainsToCheck = this.collectDomainsToCheck({
      firstName,
      lastName,
      middleName,
      handles,
      cityAbbr,
      professions,
      interests
    });

    // Check availability
    console.log(`🔍 Checking ${domainsToCheck.length} domains...`);
    const availabilityResults = await domainAvailabilityService.checkMultipleDomains(domainsToCheck);

    // Build availability map
    const availabilityMap = {};
    availabilityResults.forEach(result => {
      availabilityMap[result.domain] = result;
    });

    // Format results
    return this.formatDomainResults({
      firstName,
      lastName,
      handles,
      cityAbbr,
      professions,
      interests,
      availabilityMap
    });
  }

  /**
   * Normalize special characters for domain names
   */
  normalizeName(name) {
    const charMappings = {
      'ø': 'o', 'ö': 'o', 'å': 'aa', 'æ': 'ae',
      'ü': 'ue', 'ä': 'ae', 'ß': 'ss',
      'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a', 'â': 'a', 'ç': 'c',
      'ñ': 'n', 'á': 'a', 'í': 'i', 'ó': 'o', 'ú': 'u'
    };

    let normalized = name.toLowerCase();
    for (const [special, replacement] of Object.entries(charMappings)) {
      normalized = normalized.replace(new RegExp(special, 'g'), replacement);
    }

    return normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Generate handles from name
   */
  generateHandles(firstName, middleName, lastName) {
    const handles = [];

    if (middleName) {
      handles.push(firstName[0] + middleName[0] + lastName[0]); // akg
      handles.push(firstName.slice(0, 2) + middleName.slice(0, 2) + lastName.slice(0, 2)); // ankegu
      handles.push(firstName + lastName[0]); // andreasg
    } else if (lastName) {
      handles.push(firstName[0] + lastName[0]); // ag
      handles.push(firstName.slice(0, 2) + lastName.slice(0, 2)); // angu
      handles.push(firstName + lastName[0]); // andreasg
    }

    return handles;
  }

  /**
   * Get city abbreviation
   */
  getCityAbbreviation(location) {
    if (!location) return null;

    const city = location.toLowerCase();
    const abbrs = {
      'copenhagen': 'cph',
      'barcelona': 'bcn',
      'london': 'ldn',
      'new york': 'nyc',
      'los angeles': 'la',
      'san francisco': 'sf',
      'paris': 'par',
      'berlin': 'ber'
    };

    for (const [name, abbr] of Object.entries(abbrs)) {
      if (city.includes(name)) return abbr;
    }

    return null;
  }

  /**
   * Collect all domains to check
   */
  collectDomainsToCheck({ firstName, lastName, middleName, handles, cityAbbr, professions, interests }) {
    const domains = [];
    const allTlds = ['.dk', '.eu', '.io', '.me', '.com'];

    // Name-based
    allTlds.forEach(tld => {
      if ((firstName + tld).length <= 15) domains.push(`${firstName}${tld}`);
      if (lastName && (lastName + tld).length <= 15) domains.push(`${lastName}${tld}`);
    });

    // Handles
    handles.forEach(handle => {
      allTlds.forEach(tld => {
        if ((handle + tld).length <= 12) domains.push(`${handle}${tld}`);
      });
    });

    // City combinations
    if (cityAbbr) {
      ['.dk', '.io', '.me'].forEach(tld => {
        if ((firstName + cityAbbr + tld).length <= 16) domains.push(`${firstName}${cityAbbr}${tld}`);
      });
    }

    // Professions
    professions.forEach(prof => {
      const profLower = prof.toLowerCase().replace(/\s+/g, '');
      if (profLower.length <= 10) {
        ['.dk', '.io', '.com'].forEach(tld => {
          if ((firstName + profLower + tld).length <= 18) domains.push(`${firstName}${profLower}${tld}`);
        });
      }
    });

    // Interests
    interests.slice(0, 2).forEach(interest => {
      const shortInt = interest.toLowerCase().replace(/\s+/g, '').slice(0, 5);
      ['.io', '.me'].forEach(tld => {
        if ((firstName + shortInt + tld).length <= 18) domains.push(`${firstName}${shortInt}${tld}`);
      });
    });

    return [...new Set(domains)]; // Remove duplicates
  }

  /**
   * Format domain results into nice output
   */
  formatDomainResults({ firstName, lastName, handles, cityAbbr, professions, interests, availabilityMap }) {
    const isAvailable = (domain) => {
      const result = availabilityMap[domain];
      return result && (result.status === 'available' || result.status === 'premium');
    };

    const categories = [];

    // Category 1: Your Name
    const nameOptions = [];
    ['.dk', '.io', '.me'].forEach(tld => {
      const domain = `${firstName}${tld}`;
      if (isAvailable(domain)) nameOptions.push(`${firstName}@${domain}`);
    });
    if (nameOptions.length > 0) {
      categories.push({
        title: '**Your Name:**',
        options: nameOptions.slice(0, 4)
      });
    }

    // Category 2: Location
    if (cityAbbr) {
      const locOptions = [];
      ['.dk', '.io'].forEach(tld => {
        const domain = `${firstName}${cityAbbr}${tld}`;
        if (isAvailable(domain)) locOptions.push(`${firstName}@${domain}`);
      });
      if (locOptions.length > 0) {
        categories.push({
          title: '**Your Location:**',
          options: locOptions
        });
      }
    }

    // Category 3: Professions (separate per profession)
    professions.forEach(prof => {
      const profLower = prof.toLowerCase().replace(/\s+/g, '');
      const profOptions = [];
      ['.dk', '.io'].forEach(tld => {
        const domain = `${firstName}${profLower}${tld}`;
        if (isAvailable(domain)) profOptions.push(`${firstName}@${domain}`);
      });
      if (profOptions.length > 0) {
        const profTitle = prof.charAt(0).toUpperCase() + prof.slice(1);
        categories.push({
          title: `**For ${profTitle}:**`,
          options: profOptions.slice(0, 3)
        });
      }
    });

    // Build output
    if (categories.length === 0) {
      return `Here are some creative alternatives:\n\n• ${firstName}@hey${firstName}.com\n• ${firstName}@${firstName}mail.com\n\nWould you like me to check these or explore other directions?`;
    }

    let output = `Great news! Here are available domains:\n\n`;
    categories.forEach(cat => {
      output += `${cat.title}\n`;
      cat.options.forEach(opt => output += `• ✅ ${opt}\n`);
      output += `\n`;
    });

    const total = categories.reduce((sum, cat) => sum + cat.options.length, 0);
    output += `Found ${total} available option${total !== 1 ? 's' : ''} for you!`;

    return output;
  }

  /**
   * Stream responses from Claude
   */
  async streamMessage(messages, onChunk, options = {}) {
    try {
      const stream = await this.client.messages.stream({
        model: this.model,
        max_tokens: options.max_tokens || 2048,
        temperature: 0.7,
        system: this.getSystemPrompt(),
        messages: messages
      });

      stream.on('text', (text) => {
        onChunk({ type: 'text', data: text });
      });

      stream.on('message', (message) => {
        onChunk({ type: 'complete', data: message });
      });

      stream.on('error', (error) => {
        onChunk({ type: 'error', data: error });
      });

      return stream;
    } catch (error) {
      console.error('Claude Streaming Error:', error);
      throw error;
    }
  }
}

module.exports = new ClaudeService();
