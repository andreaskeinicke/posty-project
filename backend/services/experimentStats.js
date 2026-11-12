// Headline test maths: per-variant rates and a Bayesian "chance to be best".
// Each variant's rate gets a Beta(1 + hits, 1 + misses) posterior; we draw from
// all posteriors many times and count how often each variant comes out on top.

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Marsaglia-Tsang gamma sampler (shape >= 1, which always holds with the +1 prior).
function gamma(shape, rand) {
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { x = normal(rand); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function beta(a, b, rand) {
  const x = gamma(a, rand);
  return x / (x + gamma(b, rand));
}

function chanceToBeBest(arms, draws = 20000, seed = 42) {
  const rand = mulberry32(seed);
  const wins = arms.map(() => 0);
  if (!arms.length) return wins;
  for (let i = 0; i < draws; i++) {
    let best = -1, bestVal = -1;
    arms.forEach((arm, j) => {
      const val = beta(1 + arm.hits, 1 + Math.max(0, arm.trials - arm.hits), rand);
      if (val > bestVal) { bestVal = val; best = j; }
    });
    wins[best] += 1;
  }
  return wins.map(w => w / draws);
}

const EVENTS = ['view', 'search', 'get', 'checkout'];

// counts: [{ variant, event, n }]. config: headlines.json.
function summarize(config, counts) {
  const primary = config.primary || 'search';
  const minViews = config.minViewsPerVariant || 250;
  const rows = config.variants.map(v => {
    const c = Object.fromEntries(EVENTS.map(e => [e, 0]));
    counts.filter(x => x.variant === v.id).forEach(x => { if (x.event in c) c[x.event] += Number(x.n) || 0; });
    const rate = e => (c.view ? c[e] / c.view : 0);
    return { id: v.id, status: v.status, headline: v.headline, ...c, searchRate: rate('search'), getRate: rate('get'), checkoutRate: rate('checkout') };
  });
  const live = rows.filter(r => r.status === 'active');
  const p = chanceToBeBest(live.map(r => ({ trials: r.view, hits: r[primary] })));
  live.forEach((r, i) => { r.chanceBest = p[i]; });

  let verdict = 'keep running';
  const enough = live.length > 1 && live.every(r => r.view >= minViews);
  const leader = live.slice().sort((x, y) => y.chanceBest - x.chanceBest)[0];
  const retire = live.filter(r => r.view >= minViews && r.chanceBest < 0.05).map(r => r.id);
  if (live.length < 2) verdict = 'not testing (fewer than two active headlines)';
  else if (enough && leader.chanceBest >= 0.95) verdict = `winner: ${leader.id}`;
  else if (retire.length) verdict = `retire: ${retire.join(', ')}`;
  else if (!enough) verdict = `keep running (need ${minViews} views per headline)`;

  return { experiment: config.experiment, started: config.started, primary, minViewsPerVariant: minViews, verdict, variants: rows };
}

const pct = x => (x * 100).toFixed(1) + '%';

function toMarkdown(s) {
  const lines = [
    `# Headline test ${s.experiment}`,
    '',
    `Started ${s.started}. Primary metric: ${s.primary} per view. Verdict: **${s.verdict}**.`,
    '',
    '| | Headline | Status | Views | Searched | Got | Checkout | Chance best |',
    '|---|---|---|---:|---:|---:|---:|---:|'
  ];
  s.variants.forEach(r => lines.push(`| ${r.id} | ${r.headline} | ${r.status} | ${r.view} | ${r.search} (${pct(r.searchRate)}) | ${r.get} (${pct(r.getRate)}) | ${r.checkout} | ${r.chanceBest == null ? '–' : pct(r.chanceBest)} |`));
  return lines.join('\n') + '\n';
}

module.exports = { summarize, toMarkdown, chanceToBeBest, EVENTS };
