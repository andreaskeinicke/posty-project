/**
 * Classic pattern ladder — v3 concierge engine, deterministic half.
 *
 * The best email addresses are arithmetic on the person's REAL name parts
 * (surname domain, single-letter prefix, first-name domain, name combos) —
 * no AI needed, no latency. Generated instantly, ranked professional-first.
 * The AI adds creative extras and the pick/pitch on top (aiRecommendationService).
 *
 * Founder taste (case #1, 2026-07-27): a@keinicke.com and andreas@keinicke.dk
 * beat invented syllable blends every time. Blends are wildcard material only.
 */

const ASCII_MAP = {
  'æ': 'ae', 'ø': 'o', 'å': 'aa', 'ü': 'ue', 'ö': 'oe', 'ä': 'ae', 'ß': 'ss',
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'à': 'a', 'â': 'a', 'á': 'a',
  'ç': 'c', 'ñ': 'n', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ô': 'o', 'î': 'i'
};

function normalize(part) {
  return (part || '')
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, ch => ASCII_MAP[ch] || '')
    .replace(/[^a-z]/g, '');
}

class ClassicLadderService {
  /**
   * @param {Object} profile - analyzed questionnaire profile
   * @returns {Array} candidates: { domain, prefix, category, priority, confidence, note, pattern }
   */
  generate(profile) {
    const meta = profile._metadata || {};
    const nameParts = (profile.name || '').trim().split(/\s+/);
    const first = normalize(meta.firstName || nameParts[0]);
    const middle = normalize(meta.middleName || (nameParts.length > 2 ? nameParts[1] : ''));
    const last = normalize(meta.lastName || nameParts[nameParts.length - 1]);
    if (!first) return [];

    const f = first[0];
    const professional = profile.type && profile.type !== 'personal';

    // TLD order: country TLD first (locals trust it), then .com, then style
    const tlds = [...new Set(
      (meta.tlds || ['.com']).map(t => (t.startsWith('.') ? t : `.${t}`))
    )];

    const candidates = [];
    const seen = new Set();
    const add = (label, prefix, priority, confidence, note) => {
      if (!label || label.length < 3 || label.length > 20) return;
      // H9: never repeat a name component across the @ (andreas@andreaskeinicke,
      // akg@akg). Single letters are exempt (a@akeinicke reads fine).
      if (prefix.length > 1 && label.includes(prefix)) return;
      for (const tld of tlds.slice(0, 3)) {
        const domain = `${label}${tld}`;
        const key = `${prefix}@${domain}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push({
          domain,
          prefix,
          category: 'classic',
          priority,
          confidence,
          note,
          pattern: `${prefix}@${label}${tld}`
        });
      }
    };

    // Rung 1 — surname domains. H8: the domain carries the surname, the
    // username carries the first name. andreas@keinicke.dk is the archetype.
    const surnames = [...new Set([last, middle].filter(s => s && s.length >= 3))];
    for (const surname of surnames) {
      add(surname, first, 1, 5, 'Your name as a company-style address - first name @ surname.');
      add(surname, f, 1, 4, `Single letter, maximum brevity - ${f}@${surname}.`);
    }

    // Rung 2 — first-name domain
    add(first, professional ? 'contact' : 'hey', 2, 4, 'Your first name as the domain itself.');

    // Rung 3 — initial + surname domains (akeinicke.dk)
    for (const surname of surnames) {
      add(`${f}${surname}`, first, 3, 4, 'Initial + surname - the classic scaling-company pattern.');
    }

    // Rung 4 — full-name domain: pairs with functional prefixes (H9 bans
    // repeating the first name), mail@/hello@ read cleanest
    if (last && last !== first && (first + last).length <= 16) {
      add(`${first}${last}`, 'mail', 4, 3, 'Full name as one domain - mail@ keeps it clean.');
      add(`${first}${last}`, 'hello', 4, 3, 'Full name as one domain - friendly and unmistakably you.');
    }

    // Rung 5 — initials domain (3+ letters only; shorter is registry-premium)
    const initials = [first, middle, last].filter(Boolean).map(p => p[0]).join('');
    if (initials.length >= 3) {
      add(initials, first, 5, 3, 'Your initials - short to say, short to type.');
    }

    return candidates;
  }
}

module.exports = new ClassicLadderService();
