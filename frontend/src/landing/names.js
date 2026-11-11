// Turns a typed name into candidate email addresses for the landing search.
// Pure functions only: the landing page asks the API which domains are free
// and shows only those (never show a taken domain).

export const TLD_PRICE = {
  // Fallback yearly price estimates in USD, used only if the API returns no price.
  '.com': 11, '.me': 16, '.dev': 13, '.co': 25, '.xyz': 12, '.email': 22,
  '.club': 15, '.family': 25, '.page': 11, '.io': 45
};

const CHAR_MAP = {
  'æ': 'ae', 'ø': 'oe', 'å': 'aa', 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
  'é': 'e', 'è': 'e', 'ê': 'e', 'á': 'a', 'à': 'a', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n', 'ç': 'c'
};

export function nameParts(input) {
  return (input || '')
    .toLowerCase()
    .replace(/[æøåäöüßéèêáàíóúñç]/g, c => CHAR_MAP[c])
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s-]/g, ' ')
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 4);
}

// Each candidate: { local, base, tlds, style, label }
export function candidates(input) {
  const p = nameParts(input);
  if (!p.length) return [];
  const f = p[0];
  const l = p.length > 1 ? p[p.length - 1] : '';
  const mid = p.length > 2 ? p.slice(1, -1) : [];
  const ini = f[0] + mid.map(x => x[0]).join('') + (l ? l[0] : '');
  const out = [];
  const add = (local, base, tlds, style, label) => out.push({ local, base, tlds, style, label });

  if (l) {
    add(f, l, ['.com', '.me', '.dev'], 'pro', 'Your surname as the domain');
    add(f, f + l, ['.com', '.me', '.page'], 'pro', 'Your full name');
    add('hi', f + l, ['.me', '.com', '.xyz'], 'fun', 'Friendly hello');
    add(f[0] + l, f[0] + l, ['.com', '.me', '.dev'], 'pro', 'Classic professional');
    add(ini, ini + 'mail', ['.com', '.me'], 'short', 'Short and sweet');
    add(f, ini, ['.me', '.co', '.xyz'], 'short', 'Initials domain');
    add(f, 'the' + l + 's', ['.com', '.family'], 'family', 'Room for the whole family');
    add('hello', f + l[0], ['.me', '.club', '.xyz'], 'fun', 'Playful and short');
    add(f, l + 'mail', ['.com', '.me'], 'fun', 'Your own mail brand');
    add(f, f + '-' + l, ['.com', '.email'], 'pro', 'Hyphenated full name');
  } else {
    add('hi', f, ['.me', '.com', '.xyz', '.dev'], 'fun', 'Friendly hello');
    add(f, f + 'mail', ['.com', '.me'], 'pro', 'Your own mail brand');
    add('me', f, ['.email', '.club', '.page'], 'short', 'Minimal');
    add(f, 'its' + f, ['.com', '.me'], 'fun', 'Playful');
    add(f, 'hey' + f, ['.com', '.me'], 'fun', 'Say hey');
  }
  return out;
}

export function domainsFor(list) {
  const set = new Set();
  list.forEach(c => c.tlds.forEach(t => set.add(c.base + t)));
  return [...set];
}

// availability: { [domain]: { available: bool, price?: number } }
// Returns candidates that have at least one free ending, best first, with `avail` endings.
export function rank(list, availability, style) {
  const seen = {};
  const picked = [];
  for (const c of list) {
    if (style !== 'all' && c.style !== style) continue;
    const avail = c.tlds.filter(t => availability[c.base + t] && availability[c.base + t].available);
    if (!avail.length) continue;
    seen[c.local] = (seen[c.local] || 0) + 1;
    if (style === 'all' && seen[c.local] > 2) continue; // keep prefixes varied
    picked.push({ ...c, avail });
  }
  return picked;
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
export function addressRows(ranked, availability) {
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

export function priceOf(domain, availability) {
  const a = availability[domain];
  if (a && typeof a.price === 'number' && a.price > 0) return a.price;
  const tld = domain.slice(domain.lastIndexOf('.'));
  return TLD_PRICE[tld] || 20;
}

export const money = n => '$' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '');
