const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { getSupport } = require('../support');
const { getFulfilment } = require('../fulfilment');
const { publicView } = require('../fulfilment/view');
const { diagnose, coachNextStep } = require('../support/diagnostics');
const { weeklyReport, reportMarkdown } = require('../support/signals');
const { stalledOrders } = require('../support/coach');
const { AutoRefunder } = require('../support/refunds');

/**
 * Support agent and setup coach.
 *   GET  /api/support/status                       { enabled } (the widget asks first)
 *   POST /api/support/chat                         { messages, orderToken?, context? } -> { reply, escalated, nextStep }
 *                                                  context = { stage: search|checkout|order|welcome|help, query?, address?, plan?, addresses? }
 *   GET  /api/support/orders/:token/diagnostics    read-only DNS checks for that order's domain
 *   GET  /api/support/admin/weekly[?format=md]     learning-loop report (SUPPORT_ADMIN_TOKEN)
 *   GET  /api/support/admin/escalations            open escalations
 *   GET  /api/support/admin/stalled                orders waiting on the customer, with drafted nudges
 * Everything except /status answers 404 while SUPPORT_AGENT_ENABLED is off.
 */
const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;

function createRouter({ getS = getSupport, getF = getFulfilment, resolver } = {}) {
  const router = express.Router();

  router.get('/status', (req, res) => res.json({ enabled: Boolean(getS()) }));

  router.use((req, res, next) => {
    const s = getS();
    if (!s) return res.status(404).json({ error: 'Not found' });
    req.support = s;
    next();
  });

  // An order link (status token) is the only proof of who someone is. Without it the agent
  // knows nothing about any order.
  async function orderFor(token) {
    if (!token || !TOKEN_RE.test(token)) return null;
    const f = getF();
    if (!f) return null;
    const order = await f.workflow.store.getByToken(token);
    return order ? { id: order.id, view: publicView(order) } : null;
  }

  // Small automatic refunds (support/refunds.js). One per router so the daily cap holds.
  let refunder = null;
  function refunderFor(config) {
    const f = getF();
    if (!f || !config || !(config.autoRefundMaxUsd > 0)) return null;
    if (!refunder) {
      refunder = new AutoRefunder({ store: f.workflow.store, payments: f.workflow.payments || null,
        maxUsd: config.autoRefundMaxUsd, dailyCap: config.autoRefundDailyCap });
    }
    return refunder;
  }

  const chatLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
  router.post('/chat', chatLimiter, h(async (req, res) => {
    const { messages, orderToken, context } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages required' });
    if (messages.length > 40) return res.status(400).json({ error: 'conversation too long' });
    const order = await orderFor(orderToken);
    const out = await req.support.agent.respond({ messages, order, source: order ? 'order_page' : 'site', page: context, refunder: order ? refunderFor(req.support.config) : null });
    res.json(out);
  }));

  const diagLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
  router.get('/orders/:token/diagnostics', diagLimiter, h(async (req, res) => {
    const order = await orderFor(req.params.token);
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (order.view.testMode) {
      // Dry-run orders use fake DNS, so public lookups would only confuse.
      return res.json({ domain: order.view.domain, tier: order.view.tier, testMode: true, checks: [], summary: 'unknown', nextStep: coachNextStep(order.view, null) });
    }
    const diag = await diagnose(order.view.domain, { tier: order.view.tier, resolver });
    res.json({ ...diag, nextStep: coachNextStep(order.view, diag) || diag.nextStep });
  }));

  const requireAdmin = (req, res, next) => {
    const expected = req.support.config.adminToken;
    const given = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!expected || !given) return res.status(401).json({ error: 'Unauthorized' });
    const a = crypto.createHash('sha256').update(given).digest();
    const b = crypto.createHash('sha256').update(expected).digest();
    if (!crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Unauthorized' });
    next();
  };

  router.get('/admin/weekly', requireAdmin, h(async (req, res) => {
    const days = Math.min(parseInt(req.query.days, 10) || 7, 31);
    const rows = await req.support.signals.since(new Date(Date.now() - days * 864e5));
    const rep = weeklyReport(rows);
    if (req.query.format === 'md') return res.type('text/markdown').send(reportMarkdown(rep));
    res.json(rep);
  }));

  router.get('/admin/escalations', requireAdmin, h(async (req, res) => {
    res.json({ escalations: await req.support.escalations.listOpen(Math.min(parseInt(req.query.limit, 10) || 50, 200)) });
  }));

  router.get('/admin/stalled', requireAdmin, h(async (req, res) => {
    const f = getF();
    if (!f) return res.json({ orders: [], note: 'Fulfilment is off.' });
    const orders = await f.workflow.store.list({ state: 'awaiting_customer', limit: 200 });
    res.json({ orders: stalledOrders(orders), note: 'Drafts only. Nothing has been sent.' });
  }));

  return router;
}

module.exports = createRouter();
module.exports.createRouter = createRouter;
