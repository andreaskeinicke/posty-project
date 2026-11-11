// Server copy of frontend/src/landing/names.js (CRA cannot import outside src).
// Keep the two in sync: the /api/suggest endpoint and the website must suggest the same addresses.

// Turns a typed name into candidate email addresses for the landing search.
// Pure functions only: the landing page asks the API which domains are free
// and shows only those (never show a taken domain).

const TLD_PRICE = {
  // Fallback yearly price estimates in USD, used only if the API returns no price.
  '.com': 11, '.me': 16, '.dev': 13, '.co': 25, '.xyz': 12, '.email': 22,
  '.club': 15, '.family': 25, '.page': 11, '.io': 45
};

const CHAR_MAP = {
  'æ': 'ae', 'ø': 'oe', 'å': 'aa', 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
  'é': 'e', 'è': 'e', 'ê': 'e', 'á': 'a', 'à': 'a', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n', 'ç': 'c'
};

function nameParts(input) {
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
function candidates(input) {
  const p = nameParts(input);
  if (!p.length) return [];
  const f = p[0];
  const l = p.length > 1 ? p[p.length - 1] : '';
  const mid = p.length > 2 ? p.slice(1, -1) : [];
  const ini = f[0] + mid.map(x => x[0]).join('') + (l ? l[0] : '');
  const out = [];
  const add = (local, base, tlds, style, label) => out.push({ local, base, tlds, style, label });

  if (l) {
    add(f, l, ['.me', '.com', '.dev'], 'pro', 'Your surname as the domain');
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

function domainsFor(list) {
  const set = new Set();
  list.forEach(c => c.tlds.forEach(t => set.add(c.base + t)));
  return [...set];
}

// availability: { [domain]: { available: bool, price?: number } }
function rank(list, availability, style) {
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
  // Full rows of three on desktop: 3 or 6 when there are enough.
  const n = picked.length > 3 ? Math.min(6, picked.length - (picked.length % 3)) : picked.length;
  return picked.slice(0, n);
}

function priceOf(domain, availability) {
  const a = availability[domain];
  if (a && typeof a.price === 'number' && a.price > 0) return a.price;
  const tld = domain.slice(domain.lastIndexOf('.'));
  return TLD_PRICE[tld] || 20;
}

const money = n => '$' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '');

module.exports = { TLD_PRICE, nameParts, candidates, domainsFor, rank, priceOf };
