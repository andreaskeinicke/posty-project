const express = require('express');
const config = require('../../frontend/src/landing/headlines.json');
const { summarize, toMarkdown, EVENTS } = require('../services/experimentStats');

// Anonymous, first-party headline counting. We store experiment, variant, event and
// a timestamp. No IP, user agent, cookie or any id. See docs/HEADLINE_TESTS.md.
const router = express.Router();

let db = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) db = require('../config/supabase').supabaseAdmin;
} catch (e) { db = null; }

// Fallback while the table does not exist yet: counts since the last deploy.
const memory = new Map();
const bump = (variant, event) => {
  const k = variant + '|' + event;
  memory.set(k, (memory.get(k) || 0) + 1);
};
let tableMissing = false;

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|prerender|curl|wget|python|axios|node-fetch/i;
const ids = new Set(config.variants.map(v => v.id));

router.post('/event', async (req, res) => {
  const { experiment, variant, event } = req.body || {};
  if (experiment !== config.experiment || !ids.has(variant) || !EVENTS.includes(event)) return res.status(204).end();
  if (BOT.test(req.get('user-agent') || '')) return res.status(204).end();
  res.status(204).end();
  if (db && !tableMissing) {
    const { error } = await db.from('experiment_events').insert({ experiment, variant, event });
    if (!error) return;
    if (/does not exist|schema cache/i.test(error.message || '')) {
      tableMissing = true;
      console.warn('experiment_events table missing; counting in memory until it is created');
    } else console.warn('experiment event not stored:', error.message);
  }
  bump(variant, event);
});

async function loadCounts() {
  const fromMemory = [...memory.entries()].map(([k, n]) => { const [variant, event] = k.split('|'); return { variant, event, n }; });
  if (!db || tableMissing) return { counts: fromMemory, source: 'memory (since last deploy)' };
  const { data, error } = await db.from('experiment_counts').select('variant,event,n').eq('experiment', config.experiment);
  if (error) return { counts: fromMemory, source: 'memory (database read failed: ' + error.message + ')' };
  return { counts: data.concat(fromMemory), source: 'database' };
}

function authorized(req) {
  const token = process.env.EXPERIMENTS_TOKEN;
  if (!token) return false;
  const given = (req.get('authorization') || '').replace(/^Bearer\s+/i, '') || req.query.token;
  return given === token;
}

// GET /api/experiments/results?format=md  (Authorization: Bearer $EXPERIMENTS_TOKEN)
router.get('/results', async (req, res) => {
  if (!authorized(req)) return res.status(404).json({ error: 'Route not found' });
  const { counts, source } = await loadCounts();
  const summary = { ...summarize(config, counts), source };
  if (req.query.format === 'md') return res.type('text/markdown').send(toMarkdown(summary) + `\nSource: ${source}.\n`);
  res.json(summary);
});

module.exports = router;
