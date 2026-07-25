const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const PROMPT_VERSION = 'v2.1';

// Playbook heuristics distilled from real cases (docs/CONCIERGE_PLAYBOOK.md).
// Loaded once at boot; a playbook edit ships as a redeploy + version bump.
function loadPlaybook() {
  try {
    const raw = fs.readFileSync(
      path.join(__dirname, '..', '..', 'docs', 'CONCIERGE_PLAYBOOK.md'),
      'utf8'
    );
    const heuristics = raw.split('\n').filter(line => /^- H\d+:/.test(line));
    return heuristics.length ? heuristics.join('\n') : '';
  } catch {
    return '';
  }
}

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

Learned heuristics from real cases (follow these — they outrank the general guidance above):
{{PLAYBOOK}}

You are a concierge, not a search engine. Score every item with "confidence" 1-5:
how strongly YOU would argue this exact person should pick it (5 = you'd say
"take this one" to their face). Mark exactly ONE item "pick": true — your
personal recommendation — and write a top-level "pitch": 1-2 sentences arguing
for it with a reason the person likely hasn't thought of. Include one wildcard:
a creative idea outside the safe patterns (category "fun", any confidence).

Output: ONLY a JSON object, no prose, no markdown fences:
{"pitch": "...", "items": [{"domain": "keinicke.dk", "prefix": "andreas", "category": "personal-brand", "confidence": 5, "pick": true, "note": "Your surname as your domain — reads like a company address."}, ...]}

25-35 items. Notes max 12 words, concrete, selling the idea. Never repeat a domain.`;

class AIRecommendationService {
  constructor() {
    this.client = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
    this.model = process.env.CLAUDE_MODEL || 'claude-sonnet-5';
    this.promptVersion = PROMPT_VERSION;
    this.systemPrompt = SYSTEM_PROMPT.replace('{{PLAYBOOK}}', loadPlaybook() || '(none yet)');
  }

  isReady() {
    return !!this.client;
  }

  /**
   * Generate email address candidates for a profile.
   * @param {Object} profile - analyzed questionnaire profile (with _metadata)
   * @returns {Promise<Object>} - { pitch, candidates: [{ domain, prefix, category, note, priority, confidence, pick }] }
   */
  async generateCandidates(profile) {
    if (!this.client) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Generous budget: Claude 5 models spend part of max_tokens on internal reasoning
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 12000,
      system: this.systemPrompt,
      messages: [{ role: 'user', content: this._buildUserPrompt(profile) }]
    });

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    const result = this._parseCandidates(text);
    console.log(`🤖 AI engine generated ${result.candidates.length} candidates (${this.model}, prompt ${this.promptVersion})`);
    return result;
  }

  /**
   * The model's original pick turned out unavailable: have it re-pick among
   * the available candidates and write a fresh pitch. Cheap, fast call.
   * @returns {Promise<{email: string, pitch: string}|null>}
   */
  async choosePick(profile, availableCandidates) {
    if (!this.client || availableCandidates.length === 0) return null;
    try {
      const list = availableCandidates
        .map(c => `${c.prefix}@${c.domain} (${c.category}: ${c.note})`)
        .join('\n');
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        system: 'You are Posty\'s email concierge. Reply with ONLY a JSON object, no prose.',
        messages: [{
          role: 'user',
          content: `${this._buildUserPrompt(profile)}\n\nThese addresses are confirmed available:\n${list}\n\nPick the ONE you would tell this person to take, with a 1-2 sentence pitch giving a reason they likely haven't thought of. Reply: {"email": "...", "pitch": "..."}`
        }]
      });
      const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]);
      if (typeof parsed.email !== 'string' || typeof parsed.pitch !== 'string') return null;
      return parsed;
    } catch (error) {
      console.warn('choosePick failed (non-fatal):', error.message);
      return null;
    }
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
    // Pitch: parse independently so a truncated items array can't lose it
    const pitchMatch = text.match(/"pitch"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const pitch = pitchMatch ? JSON.parse(`"${pitchMatch[1]}"`) : '';

    // Items array: from the first '[' after "items" (fallback: first '[' anywhere)
    const itemsKey = text.indexOf('"items"');
    const start = text.indexOf('[', itemsKey === -1 ? 0 : itemsKey);
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
      // 1-2 char labels are registry-premium (RDAP says free, price says $$$$) — skip
      if (domain.split('.')[0].length < 3) continue;
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
        confidence: Number.isFinite(item.confidence) ? Math.min(5, Math.max(1, item.confidence)) : 3,
        pick: item.pick === true,
        note: typeof item.note === 'string' ? item.note : ''
      });
    }

    if (candidates.length === 0) {
      throw new Error('AI response parsed but contained no valid candidates');
    }
    return { pitch, candidates };
  }
}

module.exports = new AIRecommendationService();
