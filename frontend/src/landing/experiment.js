import config from './headlines.json';

// Home headline test. Anonymous, first-party, no cookies and no browser storage:
// a visitor gets a random headline per page load, and we count what that page load
// did (saw it, searched, pressed "Get this email", started checkout). Nothing about the
// person is sent, only experiment, variant and event name.
// Rotation and results: docs/HEADLINE_TESTS.md.

const EVENTS = ['view', 'search', 'get', 'checkout'];
const sent = new Set();
let chosen = null;

function isBot() {
  if (typeof navigator === 'undefined') return true;
  if (navigator.webdriver) return true;
  return /bot|crawl|spider|slurp|headless|lighthouse|preview|prerender/i.test(navigator.userAgent || '');
}

export function pickVariant(variants, rand = Math.random) {
  const winner = variants.find(v => v.status === 'winner');
  if (winner) return { variant: winner, testing: false };
  const active = variants.filter(v => v.status === 'active');
  if (!active.length) return { variant: variants[0], testing: false };
  return { variant: active[Math.floor(rand() * active.length) % active.length], testing: active.length > 1 };
}

// ?headline=b previews a variant without counting anything.
export function headline() {
  if (chosen) return chosen;
  const forced = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('headline') : null;
  const preview = forced && config.variants.find(v => v.id === forced);
  if (preview) chosen = { variant: preview, testing: false, preview: true };
  else chosen = pickVariant(config.variants);
  chosen.count = chosen.testing && !chosen.preview && !isBot();
  return chosen;
}

// Each event is counted at most once per page load, and only after the home page
// (and so the headline) was seen in this page load.
export function track(event) {
  const h = headline();
  if (!h.count || !EVENTS.includes(event) || sent.has(event)) return;
  if (event !== 'view' && !sent.has('view')) return;
  sent.add(event);
  try {
    fetch('/api/experiments/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experiment: config.experiment, variant: h.variant.id, event }),
      keepalive: true
    }).catch(() => {});
  } catch (e) { /* counting must never break the page */ }
}
