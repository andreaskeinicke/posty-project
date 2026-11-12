const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { getFulfilment } = require('../fulfilment');
const { publicView } = require('../fulfilment/view');
const { normaliseVerification, normaliseDkim } = require('../fulfilment/mail/workspaceBackend');

/**
 * Customer status ("Moving in") and ops endpoints for the fulfilment workflow.
 * All routes answer 404 while FULFILMENT_ENABLED is off.
 */
// Express 4 does not catch rejected promises; send them to the error handler.
const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function createRouter(getF = getFulfilment) {
  const router = express.Router();

  router.use((req, res, next) => {
    const f = getF();
    if (!f) return res.status(404).json({ error: 'Not found' });
    req.fulfilment = f;
    next();
  });

  // The success page only knows the Stripe session id; trade it for the status token.
  router.get('/orders/by-session/:sessionId', h(async (req, res, next) => {
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(req.params.sessionId)) return res.status(400).json({ error: 'Bad session id' });
    const order = await req.fulfilment.workflow.store.getBySession(req.params.sessionId);
    // The webhook may not have landed yet: tell the page to try again shortly.
    if (!order) return res.status(202).json({ pending: true });
    res.json(publicView(order));
  }));

  router.get('/orders/:token', h(async (req, res, next) => {
    const order = await req.fulfilment.workflow.store.getByToken(req.params.token);
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json(publicView(order));
  }));

  const inputLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
  router.post('/orders/:token/workspace', inputLimiter, h(async (req, res, next) => {
    const { verification, dkim } = req.body || {};
    if (verification === undefined && dkim === undefined) return res.status(400).json({ error: 'Nothing to save' });
    const out = await req.fulfilment.workflow.submitWorkspaceDetails(req.params.token, { verification, dkim },
      { normaliseVerification, normaliseDkim });
    if (out.error === 'not_found') return res.status(404).json({ error: 'Not found' });
    if (out.error) {
      const msg = {
        invalid_verification: 'That does not look like a Google verification code. It starts with google-site-verification=',
        invalid_dkim: 'That does not look like a DKIM record. It starts with v=DKIM1;',
        wrong_tier: 'This order does not use Google Workspace.'
      }[out.error] || 'Could not save that';
      return res.status(400).json({ error: out.error, message: msg });
    }
    res.json(publicView(out.order));
  }));

  // ---- ops (for people and ops agents). Off unless FULFILMENT_ADMIN_TOKEN is set.
  const requireAdmin = (req, res, next) => {
    const expected = req.fulfilment.config.adminToken;
    const given = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!expected || !given) return res.status(401).json({ error: 'Unauthorized' });
    const a = crypto.createHash('sha256').update(given).digest();
    const b = crypto.createHash('sha256').update(expected).digest();
    if (!crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Unauthorized' });
    next();
  };

  router.get('/admin/orders', requireAdmin, h(async (req, res, next) => {
    const orders = await req.fulfilment.workflow.store.list({ state: req.query.state, limit: Math.min(parseInt(req.query.limit, 10) || 50, 200) });
    res.json({ orders: orders.map(o => ({ ...o, registrant: o.registrant ? '[redacted]' : null, status_token: undefined })) });
  }));

  router.get('/admin/orders/:id/events', requireAdmin, h(async (req, res, next) => {
    res.json({ events: await req.fulfilment.workflow.store.events(req.params.id) });
  }));

  router.post('/admin/orders/:id/retry', requireAdmin, h(async (req, res, next) => {
    const order = await req.fulfilment.workflow.retry(req.params.id, { step: req.body?.step });
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json({ id: order.id, state: order.state, step: order.step });
  }));

  return router;
}

module.exports = createRouter();
module.exports.createRouter = createRouter;
