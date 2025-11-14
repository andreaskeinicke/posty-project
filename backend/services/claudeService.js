const Anthropic = require('@anthropic-ai/sdk');

class ClaudeService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.model = 'claude-3-5-sonnet-20241022';
  }

  /**
   * System prompt for Posty - the email domain finder assistant
   */
  getSystemPrompt() {
    return `You are Posty, a friendly and creative AI assistant that helps people find the perfect custom email domain while keeping their Gmail account.

Your role:
- Guide users through questions about their business, profession, or personal brand
- Understand their identity, values, and what makes them unique
- Research entities and concepts to provide creative, meaningful domain suggestions
- Suggest domains that are short, memorable, and reflect their professional identity
- Explain why certain domains work well for their needs
- Check domain availability and provide alternatives

Key principles:
- Be conversational and encouraging
- Ask clarifying questions when needed
- Think creatively about domain names (consider wordplay, abbreviations, meaningful terms)
- Focus on domains that work for professional email addresses
- Consider SEO and brand recognition
- Suggest both exact matches and creative variations

Remember: Users want to keep Gmail but have a custom domain for their email address (like name@customdomain.com that forwards to Gmail).`;
  }

  /**
   * Send a message to Claude and get a response
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options (temperature, max_tokens, etc.)
   * @returns {Promise<Object>} - Response from Claude
   */
  async sendMessage(messages, options = {}) {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options.max_tokens || 4096,
        temperature: options.temperature || 0.7,
        system: this.getSystemPrompt(),
        messages: messages
      });

      return {
        success: true,
        message: response.content[0].text,
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
   * Stream responses from Claude
   * @param {Array} messages - Array of message objects
   * @param {Function} onChunk - Callback for each chunk
   * @param {Object} options - Additional options
   */
  async streamMessage(messages, onChunk, options = {}) {
    try {
      const stream = await this.client.messages.stream({
        model: this.model,
        max_tokens: options.max_tokens || 4096,
        temperature: options.temperature || 0.7,
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

  /**
   * Analyze user responses and generate domain suggestions
   * @param {Object} userProfile - User's questionnaire responses
   * @returns {Promise<Object>} - Domain suggestions with reasoning
   */
  async analyzeDomainNeeds(userProfile) {
    const analysisPrompt = `Based on this user profile, suggest 10 creative custom email domain names:

User Profile:
${JSON.stringify(userProfile, null, 2)}

For each domain suggestion:
1. Provide the domain name
2. Explain why it's a good fit
3. Rate it (1-5 stars)
4. Note any potential concerns

Focus on:
- Professional appeal
- Memorability
- Brevity (shorter is better)
- Relevance to their identity/business
- Availability likelihood (avoid very common words)

Format your response as JSON with this structure:
{
  "suggestions": [
    {
      "domain": "example.com",
      "reasoning": "Why this works...",
      "rating": 4,
      "concerns": "Any potential issues..."
    }
  ],
  "insights": "Overall insights about the user's needs..."
}`;

    const messages = [
      {
        role: 'user',
        content: analysisPrompt
      }
    ];

    const response = await this.sendMessage(messages);

    if (response.success) {
      try {
        // Try to parse JSON from the response
        const jsonMatch = response.message.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        // If no JSON found, return the raw response
        return { raw: response.message };
      } catch (parseError) {
        return { raw: response.message };
      }
    }

    return response;
  }

  /**
   * Get creative domain suggestions based on entity research
   * @param {string} entity - Entity or concept to research
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Creative suggestions
   */
  async getCreativeSuggestions(entity, context = {}) {
    const prompt = `Research and provide creative domain name suggestions related to: "${entity}"

Context: ${JSON.stringify(context)}

Consider:
- Related concepts and metaphors
- Industry terminology
- Historical or cultural references
- Wordplay and portmanteaus
- Short, memorable combinations

Provide 5-8 creative domain suggestions with explanations.`;

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.sendMessage(messages);
  }
}

module.exports = new ClaudeService();
