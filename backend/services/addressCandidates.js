// Server copy of frontend/src/landing/names.js (CRA cannot import outside src).
// Keep the two in sync: the /api/suggest endpoint and the website must suggest the same addresses.
// backend/tests/addressCandidates.test.js fails if they drift apart.

// Turns a typed name into candidate email addresses for the landing search.
// Pure functions only: the landing page asks the API which domains are free
// and shows only those (never show a taken domain).

const TLD_PRICE = {
  // Fallback yearly price estimates in USD, used only if the API returns no price.
  // Renewal prices (what you pay every year after the first), checked Nov 2026.
  '.com': 12, '.me': 20, '.dev': 13, '.co': 30, '.xyz': 13, '.email': 28,
  '.club': 19, '.family': 36, '.page': 12, '.io': 45
};

// Letters that have a common two-way spelling in addresses. The first option is
// what we lead with; the second is checked too, since people use both
// (soren and soeren, mueller and muller).
const VARIANT_MAP = {
  'ø': ['o', 'oe'], 'ö': ['o', 'oe'], 'ü': ['ue', 'u'], 'ä': ['ae', 'a'],
  'å': ['aa', 'a'], 'æ': ['ae'], 'ß': ['ss'], 'œ': ['oe'], 'þ': ['th'], 'ð': ['d'],
  'ł': ['l'], 'đ': ['d'], 'ı': ['i']
};

// Basic transliteration so Cyrillic and Greek names still get suggestions.
const SCRIPT_MAP = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z',
  'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
  'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
  'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'і': 'i',
  'ї': 'yi', 'є': 'ye', 'ґ': 'g',
  'α': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'i', 'θ': 'th', 'ι': 'i',
  'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'ο': 'o', 'π': 'p', 'ρ': 'r', 'σ': 's',
  'ς': 's', 'τ': 't', 'υ': 'y', 'φ': 'f', 'χ': 'ch', 'ψ': 'ps', 'ω': 'o'
};

// Surname particles: kept with the surname (dasilva, vanderberg, alrashid),
// and the bare surname is tried as well.
const PARTICLES = new Set([
  'van', 'von', 'der', 'den', 'de', 'da', 'das', 'do', 'dos', 'di', 'del', 'della', 'la', 'le',
  'du', 'al', 'el', 'bin', 'ibn', 'ter', 'ten', 'af', 'zu', 'mac', 'st'
]);

// Short forms for long first names, offered as an extra ("if you go by Bart").
const NICKNAMES = {
  alexander: 'alex', alexandra: 'alex', bartholomew: 'bart', benjamin: 'ben', christian: 'chris',
  christina: 'tina', christopher: 'chris', daniela: 'dani', elizabeth: 'liz', frederik: 'frede',
  gabriella: 'gaby', jonathan: 'jon', katherine: 'kate', catherine: 'cat', margaret: 'maggie',
  nicholas: 'nick', nikolaj: 'niko', samantha: 'sam', sebastian: 'seb', stephanie: 'steph',
  theodore: 'theo', valentina: 'vale', victoria: 'tori', william: 'will', maximilian: 'max',
  johannes: 'jo', mathilde: 'thilde', josephine: 'josie', charlotte: 'lotte'
};

// Three-letter strings that are famous brands: never build a domain on them.
const BRANDS = new Set([
  'bmw', 'ibm', 'hbo', 'cnn', 'bbc', 'kfc', 'ups', 'dhl', 'amd', 'aol', 'msn', 'nba', 'nfl',
  'ufc', 'nyt', 'cbs', 'abc', 'nbc', 'fox', 'hsbc', 'sas', 'ikea', 'lego', 'vw', 'hp', 'mtv'
]);

const MIN_LABEL = 4;  // 1-3 character domains are registry premium (ob.me costs $22,000)
const MAX_LABEL = 18; // past this an address stops passing the say-it-out-loud test

function words(input, variant) {
  let s = (input || '').toLowerCase().normalize('NFC');
  s = s.replace(/[’'`´]/g, ''); // O'Connor -> oconnor
  s = s.replace(/./gu, c => {
    if (VARIANT_MAP[c]) return VARIANT_MAP[c][variant] || VARIANT_MAP[c][0];
    if (SCRIPT_MAP[c] !== undefined) return SCRIPT_MAP[c];
    return c;
  });
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/[^a-z\s-]/g, ' ').trim();
  // Each word keeps its hyphen pieces: "anna-sofie" -> ['anna', 'sofie']
  return s.split(/\s+/).filter(Boolean).map(w => w.split('-').filter(Boolean)).filter(w => w.length);
}

function hasVariant(input) {
  return /[øöüäå]/i.test(input || '');
}

// Splits a name into first name, middle names and surname forms.
function parseName(input, variant = 0) {
  const w = words(input, variant).slice(0, 6);
  if (!w.length) return null;
  const firstPieces = w[0];
  const first = firstPieces[0];
  const firstFull = firstPieces.join('');
  const pieces = w.flat();
  if (w.length === 1) return { first, firstFull, middles: [], surnames: [], pieces };

  // Walk back from the end: the last word plus any particles before it is the surname.
  let i = w.length - 1;
  const lastPieces = w[i];
  const particles = [];
  while (i - 1 >= 1 && w[i - 1].length === 1 && PARTICLES.has(w[i - 1][0])) {
    particles.unshift(w[i - 1][0]);
    i--;
  }
  const middles = w.slice(1, i).map(p => p.join(''));
  const core = lastPieces.join('');
  const surnames = [];
  const push = s => { if (s && !surnames.includes(s)) surnames.push(s); };
  if (particles.length) push(particles.join('') + core); // dasilva
  push(core);                                             // lundhansen / silva
  if (lastPieces.length > 1) push(lastPieces[lastPieces.length - 1]); // hansen
  return { first, firstFull, middles, surnames, pieces };
}

// Kept for callers that want the plain parts: first, middles..., surname.
function nameParts(input) {
  const p = parseName(input);
  if (!p) return [];
  return [p.first, ...p.middles, ...(p.surnames.length ? [p.surnames[0]] : [])].slice(0, 4);
}

// Why a name gives no suggestions, if it gives none (for the empty state).
function nameProblem(input) {
  if (!(input || '').trim()) return null;
  if (parseName(input)) return null;
  if (/[぀-ヿ㐀-鿿가-힯؀-ۿ֐-׿฀-๿ऀ-ॿ]/.test(input)) {
    return 'Type your name in Latin letters, the way you would spell it in an email.';
  }
  return 'Type a name with at least one letter.';
}

// A domain that is just one name word (bennett, smith, zhang) is often priced as
// premium on the newer endings: bennett.page is $65 a year, taylor.family $2,750.
// Until the lookup returns real prices, single words only go on .com and .me,
// which have no premium tier for names. Combined forms (obennett, oliverbennett)
// are safe everywhere.
const SAFE_FOR_WORDS = ['.com', '.me'];

const okLabel = l => l.length >= MIN_LABEL && l.length <= MAX_LABEL && !BRANDS.has(l);

// Each candidate: { local, base, tlds, style, label }
// Order is the ranking. Rules (see docs/CONCIERGE_PLAYBOOK.md): the domain carries
// the surname and the username the first name; never repeat a name part across the @;
// no 1-3 letter domains; hyphens and modifiers only as a last resort.
function candidates(input) {
  const p = parseName(input);
  if (!p) return [];
  const out = [];
  const seen = new Set();
  const f = p.first;
  const nick = f.length >= 7 ? NICKNAMES[f] : null;
  const words1 = new Set(p.pieces); // single name words, not joined forms like lundhansen
  const add = (local, base, tlds, style, label) => {
    if (!okLabel(base)) return;
    if (words1.has(base) || (nick && base === nick)) tlds = tlds.filter(t => SAFE_FOR_WORDS.includes(t));
    if (!tlds.length) return;
    const key = local + '@' + base + tlds.join('');
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ local, base, tlds, style, label });
  };

  if (!p.surnames.length) {
    add('hi', f, ['.me', '.com'], 'fun', 'Friendly hello');
    add(f, f + 'mail', ['.com', '.me'], 'pro', 'Your own mail brand');
    add(f, f + 'mail', ['.email'], 'short', 'Minimal');
    add(f, 'its' + f, ['.com', '.me'], 'fun', 'Playful');
    add(f, 'hey' + f, ['.com', '.me'], 'fun', 'Say hey');
    if (p.firstFull !== f) add('hi', p.firstFull, ['.me', '.com'], 'fun', 'Your full first name');
    return out;
  }

  // Lead surname: the longest form that still fits (lundhansen before hansen),
  // falling back to the last piece for very long double-barrelled names.
  const s0 = p.surnames.find(s => s.length <= 12) || p.surnames[p.surnames.length - 1];
  const l0 = s0[0];
  const ini = f[0] + p.middles.map(m => m[0]).join('') + l0;

  // 1. first@surname and its single-letter twin (same domains, no extra lookups)
  p.surnames.forEach((s, i) => {
    add(f, s, ['.com', '.me', '.dev', '.page'], 'pro', i === 0 ? 'Your surname as the domain' : 'Your surname as the domain, shorter');
    add(f[0], s, ['.com', '.me', '.dev', '.page'], 'short', 'One letter at your surname');
  });
  // 2. initial + surname: the classic company pattern
  add(f, f[0] + s0, ['.com', '.me', '.dev', '.page', '.email'], 'pro', 'Classic professional');
  // 3. full name as the domain, with a short greeting in front (never first@firstlast)
  add('hi', f + s0, ['.me', '.com', '.page', '.email', '.xyz'], 'fun', 'Your full name');
  if (p.firstFull !== f) add('hi', p.firstFull + s0, ['.me', '.com'], 'fun', 'Your full first name');
  p.surnames.filter(s => s !== s0 && s.length < s0.length).forEach(s => add('hi', f + s, ['.me', '.com'], 'fun', 'Your full name, shorter'));
  // 4. a family home on the surname
  add(f, s0, ['.family'], 'family', 'Room for the whole family');
  add(f, s0 + 'family', ['.com', '.me'], 'family', 'Room for the whole family');
  // 5. middle name as the domain, when there is one
  p.middles.forEach(m => add(f, m, ['.com', '.me'], 'pro', 'Your middle name as the domain'));
  // 6. nickname, if a long first name has a common short form
  if (nick) {
    add(nick, s0, ['.com', '.me'], 'short', `If you go by ${nick[0].toUpperCase() + nick.slice(1)}`);
    add('hi', nick + s0, ['.me', '.com'], 'short', `If you go by ${nick[0].toUpperCase() + nick.slice(1)}`);
  }
  // 7. short and playful
  add(f, ini + 'mail', ['.com', '.me'], 'short', 'Short and sweet');
  add(f, ini, ['.me', '.co'], 'short', 'Initials domain');
  if (f[f.length - 1] !== l0) add('hello', f + l0, ['.me', '.club', '.xyz'], 'fun', 'Playful and short');
  add(f, s0 + 'mail', ['.com', '.me', '.email'], 'fun', 'Your own mail brand');
  // 8. last resort: hyphenated full name
  add('hi', f + '-' + s0, ['.com', '.email'], 'pro', 'Hyphenated full name');

  // Second spelling (soeren vs soren): the two strongest patterns again.
  if (hasVariant(input)) {
    const q = parseName(input, 1);
    if (q && q.surnames.length && (q.first !== f || q.surnames[0] !== s0)) {
      add(q.first, q.surnames[0], ['.com', '.me', '.dev'], 'pro', 'Your surname as the domain, other spelling');
      add(q.first[0], q.surnames[0], ['.com', '.me', '.dev'], 'short', 'One letter at your surname, other spelling');
      add('hi', q.first + q.surnames[0], ['.me', '.com'], 'fun', 'Your full name, other spelling');
      add(q.first, q.first[0] + q.surnames[0], ['.com', '.me'], 'pro', 'Classic professional, other spelling');
    }
  }
  return out;
}

function domainsFor(list) {
  const set = new Set();
  list.forEach(c => c.tlds.forEach(t => set.add(c.base + t)));
  return [...set];
}

// availability: { [domain]: { available: bool, price?: number } }
// Returns candidates that have at least one free ending, best first, with `avail` endings.
// Endings that never lead a row or the list (Andreas, Nov 12: .me looks less attractive).
const LAST_ENDINGS = ['.me'];
const endingRank = t => (LAST_ENDINGS.includes(t) ? 1 : 0);

function rank(list, availability, style) {
  const seen = {};
  const picked = [];
  for (const c of list) {
    if (style !== 'all' && c.style !== style) continue;
    const avail = c.tlds.filter(t => availability[c.base + t] && availability[c.base + t].available)
      .sort((a, b) => endingRank(a) - endingRank(b));
    if (!avail.length) continue;
    seen[c.local] = (seen[c.local] || 0) + 1;
    if (style === 'all' && seen[c.local] > 3) continue; // keep prefixes varied
    picked.push({ ...c, avail });
  }
  // Addresses that are only free on a last-place ending go to the bottom.
  return [...picked.filter(c => !endingRank(c.avail[0])), ...picked.filter(c => endingRank(c.avail[0]))];
}

const TLD_NOTE = {
  '.com': 'the ending everyone types without asking',
  '.me': 'personal, and reads like a name tag',
  '.dev': 'for people who build things',
  '.co': 'short and businesslike',
  '.xyz': 'cheap, cheerful and modern',
  '.email': 'says exactly what it is',
  '.club': 'friendly, for groups and hobbies',
  '.family': 'one home for everyone',
  '.page': 'clean, like a personal page',
  '.io': 'popular with tech folks'
};

// One row per complete address, in ranked order: every free ending of the best
// candidate first, then the next candidate, so each row is something you can buy.
function addressRows(ranked, availability) {
  const rows = [];
  const firstPass = ranked.map(c => [c, c.avail[0]]);
  const rest = [];
  ranked.forEach(c => c.avail.slice(1).forEach(t => rest.push([c, t])));
  [...firstPass, ...rest].forEach(([c, t]) => {
    const domain = c.base + t;
    rows.push({
      local: c.local, domain, address: c.local + '@' + domain, style: c.style,
      note: c.label + ', ' + (TLD_NOTE[t] || 'a good ending') + '.',
      price: priceOf(domain, availability)
    });
  });
  return rows;
}

function priceOf(domain, availability) {
  const a = availability[domain];
  if (a && typeof a.price === 'number' && a.price > 0) return a.price;
  const tld = domain.slice(domain.lastIndexOf('.'));
  return TLD_PRICE[tld] || 20;
}

const money = n => '$' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '');

module.exports = { TLD_PRICE, parseName, nameParts, nameProblem, candidates, domainsFor, rank, addressRows, priceOf, money };
