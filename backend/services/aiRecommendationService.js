const Anthropic = require('@anthropic-ai/sdk');

/**
 * AI Recommendation Service (v2 engine)
 *
 * Replaces the rule-based 11-category engine with a single Claude call.
 * The naming conventions live in the prompt as guidance, not as code.
 * See docs/RECOMMENDATION_MODEL_V2.md for the design.
 */

const CATEGORY_PRIORITY = {
  'short-handle': 1,
  'personal-brand': 2,
  'professional': 3,
  'location': 4,
  'fun': 5
};

const SYSTEM_PROMPT = `You are Posty's email address designer. Given a person's details, you invent complete email addresses on domains they could buy, so they can finally replace their old hotmail/gmail address with one they're proud to say out loud.

Conventions to apply (guidance, not rules — spin freely):
- Short wins. Aim for 6-12 characters total for the domain. The address should be easy to say on the phone.
- Do the name + initials arithmetic most people never think of: initials as the domain (ak.io), first name @ surname-domain (andreas@keinicke.dk), single letters where the TLD carries meaning, syllable handles (2+2 patterns like "anke", first syllables like "keini").
- Corporate IT conventions read as professional: first@last.tld, f.last@, flast@. A personal address like andreas@keinicke.dk looks exactly like a company email — that's a feature.
- The left side of the @ is free once you own the domain. Vary it: hello@, hi@, me@, you@, first-name@. Pick the prefix that makes each address sing.
- Use the TLD as part of the word when it works (.me, .email, .io, country TLDs for locals). Never sacrifice pronounceability.
- If interests/free text give you material, include 1-3 playful "fun" suggestions with a one-line rationale. Use your own knowledge for creative connections (clubs, bands, years, nicknames).
- Only suggest plausibly registrable domains: avoid dictionary words and 1-3 char .com/.io (taken or premium). Prefer surname-based, handle-based and combination domains where availability odds are real.

Categories (use exactly these ids): short-handle, personal-brand, professional, location, fun.

Output: ONLY a JSON array, no prose, no markdown fences. 25-35 items. Each item:
{"domain": "keinicke.dk", "prefix": "andreas", "category": "personal-brand", "note": "Your surname as your domain — reads like a company address."}

Notes must be short (max 12 words), concrete, and sell the idea. Never repeat a domain.`;

class AIRecommendationService {
  constructor() {
    this.client = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
    this.model = process.env.CLAUDE_MODEL || 'claude-sonnet-5';
  }

  isReady() {
    return !!this.client;
  }

  /**
   * Generate email address candidates for a profile.
   * @param {Object} profile - analyzed questionnaire profile (with _metadata)
   * @returns {Promise<Array>} - [{ domain, prefix, category, note, priority }]
   */
  async generateCandidates(profile) {
    if (!this.client) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Generous budget: Claude 5 models spend part of max_tokens on internal reasoning
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 12000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: this._buildUserPrompt(profile) }]
    });

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    const candidates = this._parseCandidates(text);
    console.log(`🤖 AI engine generated ${candidates.length} candidates (${this.model})`);
    return candidates;
  }

  _buildUserPrompt(profile) {
    const meta = profile._metadata || {};
    const lines = [`Full name: ${profile.name}`];

    if (meta.normalizedName && meta.normalizedName !== profile.name?.toLowerCase()) {
      lines.push(`ASCII-normalized name (use this in domains): ${meta.normalizedName}`);
    }
    if (meta.firstName) lines.push(`First name: ${meta.firstName}`);
    if (meta.middleName) lines.push(`Middle name: ${meta.middleName}`);
    if (meta.lastName) lines.push(`Last name: ${meta.lastName}`);
    if (meta.handles?.length) lines.push(`Pre-computed handles: ${meta.handles.join(', ')}`);
    if (profile.type) lines.push(`Use case: ${profile.type}`);
    if (meta.country) lines.push(`Country: ${meta.country}`);
    if (meta.city) lines.push(`City: ${meta.city}${meta.cityAbbreviation ? ` (${meta.cityAbbreviation})` : ''}`);
    if (meta.tlds?.length) lines.push(`Preferred TLDs (prioritize, but add others that fit): ${meta.tlds.join(', ')}`);
    if (meta.professions?.length || profile.profession) {
      lines.push(`Profession(s): ${(meta.professions || [profile.profession]).filter(Boolean).join(', ')}`);
    }
    if (meta.interests?.length) lines.push(`Interests: ${meta.interests.join(', ')}`);
    if (profile.values) lines.push(`About them (free text): ${profile.values}`);
    if (profile.inspiration?.specialMeaning) lines.push(`Special meaning: ${profile.inspiration.specialMeaning}`);
    if (profile.inspiration?.avoid) lines.push(`Avoid: ${profile.inspiration.avoid}`);

    return lines.join('\n');
  }

  _parseCandidates(text) {
    const start = text.indexOf('[');
    if (start === -1) {
      throw new Error('AI response contained no JSON array');
    }
    let end = text.lastIndexOf(']');
    let jsonText;
    if (end > start) {
      jsonText = text.slice(start, end + 1);
    } else {
      // Truncated response: salvage all complete items up to the last '}'
      const lastBrace = text.lastIndexOf('}');
      if (lastBrace <= start) {
        throw new Error('AI response contained no JSON array');
      }
      jsonText = text.slice(start, lastBrace + 1) + ']';
    }

    const parsed = JSON.parse(jsonText);
    const seen = new Set();
    const candidates = [];

    for (const item of parsed) {
      if (!item || typeof item.domain !== 'string') continue;
      const domain = item.domain.toLowerCase().trim();
      // basic sanity: label.tld, ascii, no spaces
      if (!/^[a-z0-9][a-z0-9-]*\.[a-z.]{2,12}$/.test(domain)) continue;
      if (seen.has(domain)) continue;
      seen.add(domain);

      const category = CATEGORY_PRIORITY[item.category] ? item.category : 'personal-brand';
      candidates.push({
        domain,
        prefix: (typeof item.prefix === 'string' && /^[a-z0-9._-]+$/i.test(item.prefix.trim()))
          ? item.prefix.trim().toLowerCase()
          : 'hello',
        category,
        priority: CATEGORY_PRIORITY[category],
        note: typeof item.note === 'string' ? item.note : ''
      });
    }

    if (candidates.length === 0) {
      throw new Error('AI response parsed but contained no valid candidates');
    }
    return candidates;
  }
}

module.exports = new AIRecommendationService();
