const test = require('node:test');
const assert = require('node:assert');

const { refundEligibility, AutoRefunder } = require('../support/refunds');
const { SupportAgent } = require('../support/agent');
const { MemorySignalStore } = require('../support/signals');
const { MemoryEscalationStore } = require('../support/escalations');
const { loadSupportConfig } = require('../support/config');
const { MemoryOrderStore } = require('../fulfilment/store/memoryStore');

const quiet = { log() {}, error() {}, warn() {} };
const NOW = new Date('2026-11-12T12:00:00Z');
const neverCalled = { messages: { create: async () => { throw new Error('model must not be called'); } } };

const row = (over = {}) => ({
  id: 'ord_1', state: 'active', dry_run: false, domain_price_usd: 4, created_at: '2026-11-11T12:00:00Z',
  steps: { payment_received: { at: '2026-11-11T12:00:00Z' } }, stripe_payment_intent_id: 'pi_1', ...over
});

function setup(orderRow, { maxUsd = 10, payments } = {}) {
  const store = new MemoryOrderStore();
  store.orders.set(orderRow.id, orderRow);
  const calls = [];
  const pay = payments === undefined ? { refundAndCancel: async (o, opts) => { calls.push({ id: o.id, ...opts }); return { refunded: true }; } } : payments;
  const refunder = new AutoRefunder({ store, payments: pay, maxUsd, clock: () => NOW, log: quiet });
  const escalations = new MemoryEscalationStore();
  const config = loadSupportConfig({ SUPPORT_AGENT_ENABLED: 'true' });
  const agent = new SupportAgent({ config, client: neverCalled, signals: new MemorySignalStore(), escalations, log: quiet });
  return { store, calls, refunder, escalations, agent };
}

const ask = (agent, content, refunder, order = { id: 'ord_1', view: { status: 'working', tier: 'workspace' } }) =>
  agent.respond({ messages: [{ role: 'user', content }], order, refunder });

test('default limit is $10 and 0 turns automatic refunds off', () => {
  assert.strictEqual(loadSupportConfig({}).autoRefundMaxUsd, 10);
  assert.strictEqual(loadSupportConfig({ SUPPORT_AUTO_REFUND_MAX_USD: '0' }).autoRefundMaxUsd, 0);
});

test('eligibility: only small, recent, open orders with no registered domain', () => {
  const opt = { maxUsd: 10, now: NOW };
  assert.strictEqual(refundEligibility(row(), opt).eligible, true);
  assert.strictEqual(refundEligibility(row(), opt).amountUsd, 9);
  assert.strictEqual(refundEligibility(row({ domain_price_usd: 12 }), opt).reason, 'over_limit');
  assert.strictEqual(refundEligibility(row({ steps: { register_domain: { at: 'x' } } }), opt).reason, 'domain_registered');
  assert.strictEqual(refundEligibility(row({ state: 'refunded' }), opt).reason, 'already_refunded');
  assert.strictEqual(refundEligibility(row({ state: 'done' }), opt).reason, 'order_closed');
  assert.strictEqual(refundEligibility(row({ created_at: '2026-10-01T00:00:00Z' }), opt).reason, 'too_old');
  assert.strictEqual(refundEligibility(row(), { maxUsd: 0, now: NOW }).reason, 'auto_refunds_off');
  assert.strictEqual(refundEligibility(row(), { ...opt, refundsToday: 5, dailyCap: 5 }).reason, 'daily_cap');
});

test('a plain refund request on a small order is refunded, and Andreas gets a note', async () => {
  const s = setup(row());
  const out = await ask(s.agent, 'I changed my mind, I want a refund', s.refunder);
  assert.strictEqual(out.refunded, true);
  assert.match(out.reply, /refunded \$9\.00/);
  assert.deepStrictEqual(s.calls, [{ id: 'ord_1', cause: 'customer_request_auto' }]);
  assert.strictEqual((await s.store.get('ord_1')).state, 'refunded');
  const notes = await s.escalations.listOpen();
  assert.strictEqual(notes[0].category, 'refund_auto');
  // Asking again does not pay out twice.
  const again = await ask(s.agent, 'refund please', s.refunder);
  assert.strictEqual(again.escalated, true);
  assert.strictEqual(s.calls.length, 1);
});

test('disputes, big orders, registered domains and no order link go to a person', async () => {
  for (const [orderRow, text, order] of [
    [row(), 'I was charged twice, refund it', undefined],
    [row(), 'I will file a chargeback unless you refund', undefined],
    [row({ domain_price_usd: 15 }), 'I want a refund', undefined],
    [row({ steps: { register_domain: { at: 'x' } } }), 'I want a refund', undefined],
    [row(), 'I want a refund', null]
  ]) {
    const s = setup(orderRow);
    const out = await ask(s.agent, text, s.refunder, order);
    assert.strictEqual(out.escalated, true, text);
    assert.strictEqual(out.category, 'refund');
    assert.strictEqual(s.calls.length, 0);
  }
});

test('test orders never move money; a failed refund goes to a person', async () => {
  const dry = setup(row({ dry_run: true }), { payments: null });
  const r = await dry.refunder.tryRefund('ord_1');
  assert.strictEqual(r.refunded, true);
  assert.strictEqual(r.simulated, true);

  const broken = setup(row(), { payments: { refundAndCancel: async () => { throw new Error('stripe down'); } } });
  const out = await ask(broken.agent, 'I want a refund', broken.refunder);
  assert.strictEqual(out.escalated, true);
  assert.strictEqual((await broken.store.get('ord_1')).state, 'active');
});
