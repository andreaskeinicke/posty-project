const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const PROMPT_VERSION = 'v3.0';

// Playbook heuristics distilled from real cases (docs/CONCIERGE_PLAYBOOK.md).
// Loaded once at boot; a playbook edit ships as a redeploy + version bump.
function loadPlaybook() {
  try {
    const raw = fs.readFileSync(
      path.join(__dirname, '..', '..', 'docs', 'CONCIERGE_PLAYBOOK.md'),
      'utf8'
    );
    const heuristics = raw.split('\n').filter(line => /^- H\d+:/.test(line));
    return heuristics.length ? heuristics.join('\n') : '(none yet)';
  } catch {
    return '(none yet)';
  }
}

/**
 * v3 concierge engine — AI half.
 *
 * The classic name-pattern ladder is deterministic (classicLadderService);
 * this service makes ONE fast call (thinking disabled — latency matters more
 * than reasoning depth here) that:
 *   1. picks the single best address among CONFIRMED-AVAILABLE classics,
 *   2. writes the concierge pitch for it,
 *   3. proposes up to 5 creative extras (the wildcard slot).
 */
class AIRecommendationService {
  constructor() {
    this.client = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
    this.model = process.env.CLAUDE_MODEL || 'claude-sonnet-5';
    this.promptVersion = PROMPT_VERSION;
    this.playbook = loadPlaybook();
  }

  isReady() {
    return !!this.client;
  }

  /**
   * @param {Object} profile
   * @param {Array} availableClassics - ladder candidates confirmed available
   * @returns {Promise<{pickEmail: string|null, pitch: string, extras: Array}>}
   */
  async finishRound(profile, availableClassics) {
    if (!this.client) throw new Error('ANTHROPIC_API_KEY not configured');

    const list = availableClassics
      .map((c, i) => `${i + 1}. ${c.prefix}@${c.domain}`)
      .join('\n');

    const system = `You are Posty's email concierge: you help people replace their old hotmail/gmail with an address they're proud to say out loud.

Taste rules (learned from real cases — follow strictly):
${this.playbook}

You will receive a person's details and a list of CONFIRMED-AVAILABLE classic addresses built from their real name. Do three things:
1. "pick": choose the ONE address from the list you would tell them to take. Prefer real-name patterns (first@surname, single-letter@surname) over anything invented.
2. "pitch": 1-2 sentences arguing for the pick with a reason they likely haven't thought of. Concrete, warm, no hype.
3. "extras": up to 5 creative additions the classic ladder can't produce — only if their interests/free text give you real material. Reference what they actually said. Domain labels 4-15 chars, plausibly registrable (no dictionary words, no 1-3 char .com/.io). Empty array is fine.

Reply with ONLY JSON, no prose:
{"pick": "andreas@keinicke.dk", "pitch": "...", "extras": [{"domain": "gulsort.dk", "prefix": "andreas", "note": "max 12 words on why"}]}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1500,
      thinking: { type: 'disabled' },
      system,
      messages: [{
        role: 'user',
        content: `${this._buildUserPrompt(profile)}\n\nConfirmed available:\n${list || '(none — suggest extras only, pick null)'}`
      }]
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    return this._parse(text);
  }

  _buildUserPrompt(profile) {
    const meta = profile._metadata || {};
    const lines = [`Full name: ${profile.name}`];
    if (profile.type) lines.push(`Use case: ${profile.type}`);
    if (meta.country) lines.push(`Country: ${meta.country}`);
    if (meta.city) lines.push(`City: ${meta.city}`);
    if (meta.professions?.length || profile.profession) {
      lines.push(`Profession(s): ${(meta.professions || [profile.profession]).filter(Boolean).join(', ')}`);
    }
    const interests = meta.interests || meta.interestsList || profile.keywords || [];
    if (interests.length) lines.push(`Interests: ${interests.join(', ')}`);
    if (profile.values) lines.push(`About them: ${profile.values}`);
    return lines.join('\n');
  }

  _parse(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response contained no JSON object');
    const parsed = JSON.parse(match[0]);

    const extras = [];
    const seen = new Set();
    for (const item of parsed.extras || []) {
      if (!item || typeof item.domain !== 'string') continue;
      const domain = item.domain.toLowerCase().trim();
      if (!/^[a-z0-9][a-z0-9-]*\.[a-z.]{2,12}$/.test(domain)) continue;
      if (domain.split('.')[0].length < 4) continue; // registry-premium trap
      if (seen.has(domain)) continue;
      seen.add(domain);
      extras.push({
        domain,
        prefix: (typeof item.prefix === 'string' && /^[a-z0-9._-]+$/i.test(item.prefix.trim()))
          ? item.prefix.trim().toLowerCase()
          : 'hello',
        category: 'creative',
        priority: 5,
        confidence: 3,
        note: typeof item.note === 'string' ? item.note : '',
        pattern: domain
      });
    }

    return {
      pickEmail: typeof parsed.pick === 'string' ? parsed.pick.toLowerCase().trim() : null,
      pitch: typeof parsed.pitch === 'string' ? parsed.pitch : '',
      extras
    };
  }
}

module.exports = new AIRecommendationService();
