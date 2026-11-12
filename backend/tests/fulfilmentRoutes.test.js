const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const { createRouter } = require('../routes/fulfilment');
const { FulfilmentWorkflow } = require('../fulfilment/workflow');
const { MemoryOrderStore } = require('../fulfilment/store/memoryStore');
const { buildProviders } = require('../fulfilment');
const { Notifier } = require('../fulfilment/notifier');
const { loadConfig } = require('../fulfilment/config');

async function withServer(getF, fn) {
  const app = express();
  app.use(express.json());
  app.use('/api/fulfilment', createRouter(getF));
  app.use((err, req, res, next) => res.status(500).json({ error: 'boom' }));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/fulfilment`;
  try { await fn(base); } finally { server.close(); }
}

function makeF() {
  const config = loadConfig({ FULFILMENT_ENABLED: 'true', FULFILMENT_ADMIN_TOKEN: 'sekret' });
  const workflow = new FulfilmentWorkflow({
    store: new MemoryOrderStore(), config, providersFor: buildProviders(config),
    notifier: new Notifier({ frontendUrl: 'https://posty.club', log: { log() {}, error() {} } })
  });
  return { config, workflow };
}

test('routes are hidden while the flag is off', async () => {
  await withServer(() => null, async base => {
    const r = await fetch(`${base}/orders/by-session/cs_test_1`);
    assert.strictEqual(r.status, 404);
  });
});

test('success page flow: by-session, then paste the Google code', async () => {
  const f = makeF();
  await withServer(() => f, async base => {
    let r = await fetch(`${base}/orders/by-session/cs_test_abc`);
    assert.strictEqual(r.status, 202, 'webhook not landed yet');

    const { order } = await f.workflow.createFromCheckout({
      id: 'cs_test_abc', customer_details: { email: 'anna@example.com' },
      metadata: { domainName: 'anna-k.com', domainPrice: '12', mailTier: 'workspace' }
    }, { livemode: false, contact: { email: 'anna@example.com' } });
    await f.workflow.advance(order.id);

    r = await fetch(`${base}/orders/by-session/cs_test_abc`);
    const view = await r.json();
    assert.strictEqual(view.status, 'waiting_on_you');
    assert.strictEqual(view.testMode, true);

    r = await fetch(`${base}/orders/${view.token}/workspace`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification: 'nonsense' }) });
    assert.strictEqual(r.status, 400);

    r = await fetch(`${base}/orders/${view.token}/workspace`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification: 'google-site-verification=AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde' }) });
    assert.strictEqual(r.status, 200);
    assert.strictEqual((await r.json()).status, 'done');

    assert.strictEqual((await fetch(`${base}/orders/by-session/not-a-session`)).status, 400);
  });
});

test('ops endpoints need the admin token and redact PII', async () => {
  const f = makeF();
  await f.workflow.createFromCheckout({ id: 'cs_test_q', metadata: { domainName: 'q.com', domainPrice: '9' } },
    { livemode: false, contact: { email: 'x@y.z' } });
  await withServer(() => f, async base => {
    assert.strictEqual((await fetch(`${base}/admin/orders`)).status, 401);
    assert.strictEqual((await fetch(`${base}/admin/orders`, { headers: { Authorization: 'Bearer wrong' } })).status, 401);
    const r = await fetch(`${base}/admin/orders`, { headers: { Authorization: 'Bearer sekret' } });
    const { orders } = await r.json();
    assert.strictEqual(orders.length, 1);
    assert.strictEqual(orders[0].registrant, '[redacted]');
    assert.strictEqual(orders[0].status_token, undefined);
  });
});
