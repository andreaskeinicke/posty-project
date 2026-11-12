const test = require('node:test');
const assert = require('node:assert');
const { FulfilmentWorkflow } = require('../fulfilment/workflow');
const { MemoryOrderStore } = require('../fulfilment/store/memoryStore');
const { FakeRegistrar } = require('../fulfilment/registrars/fakeRegistrar');
const { FakeDns } = require('../fulfilment/dns/fakeDns');
const { buildProviders } = require('../fulfilment');
const { Notifier } = require('../fulfilment/notifier');
const { loadConfig } = require('../fulfilment/config');
const { publicView } = require('../fulfilment/view');
const { normaliseVerification, normaliseDkim } = require('../fulfilment/mail/workspaceBackend');

const VERIFY = 'google-site-verification=AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde';
const DKIM_KEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA' + 'x'.repeat(120) + 'IDAQAB';
const quiet = { log() {}, error() {} };

function contact() {
  return { email: 'anna@example.com', phone: '+45.12345678',
    postal_info: { name: 'Anna K', address: { street: 'Vej 1', city: 'Silkeborg', state: '', postal_code: '8600', country_code: 'DK' } } };
}

function session(overrides = {}) {
  return {
    id: 'cs_test_abc123',
    customer: 'cus_1', subscription: 'sub_1', invoice: 'in_1', payment_intent: null,
    customer_details: { email: 'anna@example.com' },
    metadata: { userId: 'guest', domainName: 'keinicke-anna.com', domainPrice: '12.00', domainPurchaseRequired: 'true', mailTier: 'workspace', emailAddress: 'anna@keinicke-anna.com' },
    ...overrides
  };
}

function setup({ env = {}, live = null, registrar, dns, payments = null } = {}) {
  let now = new Date('2026-11-11T15:00:00Z');
  const clock = () => new Date(now);
  const config = loadConfig({ FULFILMENT_ENABLED: 'true', FRONTEND_URL: 'https://posty.club', ...env });
  const fakeRegistrar = registrar || new FakeRegistrar();
  const fakeDns = dns || new FakeDns();
  const store = new MemoryOrderStore();
  const notifier = new Notifier({ frontendUrl: config.frontendUrl, log: quiet });
  const wf = new FulfilmentWorkflow({
    store, notifier, config, clock, payments,
    providersFor: buildProviders(config, { fakeRegistrar, fakeDns, live })
  });
  return { wf, store, notifier, fakeRegistrar, fakeDns, config, advanceClock: ms => { now = new Date(now.getTime() + ms); } };
}

async function newOrder(t, s = session(), opts = { livemode: false, contact: contact() }) {
  const { order } = await t.wf.createFromCheckout(s, opts);
  return order;
}

test('workspace: registers, waits for Google, writes DNS, finishes', async () => {
  const t = setup();
  let order = await newOrder(t);
  assert.strictEqual(order.dry_run, true, 'test-mode payments are always dry runs');

  order = await t.wf.advance(order.id);
  assert.strictEqual(order.state, 'awaiting_customer');
  assert.strictEqual(order.step, 'mail_setup');
  assert.strictEqual(order.customer_action.type, 'approve_workspace');
  assert.ok(t.fakeRegistrar.registrations.has('keinicke-anna.com'));
  assert.deepStrictEqual(t.fakeRegistrar.registrations.get('keinicke-anna.com').contact, contact());
  assert.deepStrictEqual(t.notifier.sent.map(m => m.kind), ['domain_registered', 'action_needed']);

  let view = publicView(order);
  assert.strictEqual(view.status, 'waiting_on_you');
  assert.strictEqual(view.doneCount, 2);
  assert.strictEqual(view.action.input, 'workspace_verification');
  assert.ok(!JSON.stringify(view).includes('anna@example.com'), 'buyer email is masked');

  const out = await t.wf.submitWorkspaceDetails(order.status_token, { verification: VERIFY }, { normaliseVerification, normaliseDkim });
  order = out.order;
  assert.strictEqual(order.state, 'done');
  const recs = t.fakeDns.recordsFor('keinicke-anna.com');
  assert.ok(recs.some(r => r.type === 'TXT' && r.content === VERIFY));
  assert.ok(recs.some(r => r.type === 'MX' && r.content === 'smtp.google.com' && r.priority === 1));
  assert.ok(recs.some(r => r.content === 'v=spf1 include:_spf.google.com ~all'));
  assert.ok(recs.some(r => r.name === '_dmarc.keinicke-anna.com'));
  view = publicView(order);
  assert.strictEqual(view.status, 'done');
  assert.strictEqual(view.doneCount, 5);
  assert.strictEqual(view.canAddDkim, true);
  assert.ok(t.notifier.sent.some(m => m.kind === 'ready'));
});

test('duplicate webhooks and repeated runs never register twice', async () => {
  const t = setup();
  const a = await t.wf.createFromCheckout(session(), { livemode: false, contact: contact() });
  const b = await t.wf.createFromCheckout(session(), { livemode: false, contact: contact() });
  assert.strictEqual(a.created, true);
  assert.strictEqual(b.created, false);
  assert.strictEqual(a.order.id, b.order.id);
  await t.wf.advance(a.order.id);
  await t.wf.advance(a.order.id);
  await t.wf.tick();
  assert.strictEqual(t.fakeRegistrar.calls.register, 1);
  assert.strictEqual((await t.store.list()).length, 1);
});

test('a second worker cannot work an order while it is leased', async () => {
  const t = setup();
  const order = await newOrder(t);
  const claimed = await t.store.claim(order.id, 'other-worker', 60000, new Date());
  assert.ok(claimed);
  const after = await t.wf.advance(order.id);
  assert.strictEqual(after.step, 'register_domain');
  assert.strictEqual(t.fakeRegistrar.calls.register, 0);
});

test('forwarding: waits for the inbox click, polls, then finishes', async () => {
  const t = setup();
  const s = session({ metadata: { ...session().metadata, mailTier: 'forward' } });
  let order = await newOrder(t, s);
  order = await t.wf.advance(order.id);
  assert.strictEqual(order.state, 'awaiting_customer');
  assert.strictEqual(order.customer_action.type, 'verify_forwarding');
  assert.ok(order.next_attempt_at, 'forwarding verification is polled');

  // not due yet
  assert.strictEqual((await t.wf.tick()).length, 0);
  t.fakeDns.verifyDestination('anna@example.com');
  t.advanceClock(6 * 60 * 1000);
  [order] = await t.wf.tick();
  assert.strictEqual(order.state, 'done');
  const zone = t.fakeDns.zones.get('keinicke-anna.com');
  assert.strictEqual(zone.routing, true);
  assert.strictEqual(zone.catchAll, 'anna@example.com');
  assert.strictEqual(t.notifier.sent.filter(m => m.kind === 'action_needed').length, 1, 'one nudge, not one per poll');
});

test('name taken after payment: refund + cancel when auto-refund is on (live order)', async () => {
  const refunds = [];
  const payments = { refundAndCancel: async o => { refunds.push(o.id); return { refunded: true, cancelled: true }; } };
  const liveRegistrar = new FakeRegistrar();
  const liveDns = new FakeDns();
  const t = setup({
    env: { FULFILMENT_REGISTRAR: 'cloudflare', FULFILMENT_ALLOW_LIVE_REGISTRATION: 'true', FULFILMENT_AUTO_REFUND: 'true' },
    live: { registrar: liveRegistrar, dns: liveDns, resolver: { resolveMx: async () => [] } },
    payments
  });
  const s = session({ id: 'cs_live_x', metadata: { ...session().metadata, domainName: 'taken-name.com' } });
  let order = await newOrder(t, s, { livemode: true, contact: contact() });
  assert.strictEqual(order.dry_run, false);
  order = await t.wf.advance(order.id);
  assert.strictEqual(order.state, 'refunded');
  assert.deepStrictEqual(refunds, [order.id]);
  assert.strictEqual(liveRegistrar.calls.register, 0);
  assert.ok(t.notifier.sent.some(m => m.kind === 'refunded'));
});

test('name taken and auto-refund off: a person decides', async () => {
  const t = setup();
  const s = session({ metadata: { ...session().metadata, domainName: 'taken-name.com' } });
  const order = await t.wf.advance((await newOrder(t, s)).id);
  assert.strictEqual(order.state, 'needs_human');
  assert.strictEqual(order.needs_human_reason, 'domain_unavailable');
  assert.ok(t.notifier.sent.some(m => m.to === 'ops'));
});

test('extensions the API cannot register go to a person, not a refund', async () => {
  const t = setup({ env: { FULFILMENT_AUTO_REFUND: 'true' } });
  const s = session({ metadata: { ...session().metadata, domainName: 'keinicke.dk' } });
  const order = await t.wf.advance((await newOrder(t, s)).id);
  assert.strictEqual(order.needs_human_reason, 'not_registrable_via_api');
});

test('registry price above what the customer paid: stop before buying', async () => {
  const t = setup({ registrar: new FakeRegistrar({ priceUsd: 30 }) });
  const order = await t.wf.advance((await newOrder(t)).id);
  assert.strictEqual(order.needs_human_reason, 'price_above_paid');
  assert.strictEqual(t.fakeRegistrar.calls.register, 0);
});

test('no registrant contact: never registers the domain to Posty by default', async () => {
  const t = setup();
  const { order } = await t.wf.createFromCheckout(session(), { livemode: false, contact: null, contactMissing: ['phone'] });
  const after = await t.wf.advance(order.id);
  assert.strictEqual(after.needs_human_reason, 'registrant_incomplete');
  assert.match(after.last_error, /phone/);
  assert.strictEqual(t.fakeRegistrar.calls.register, 0);
});

test('transient errors back off, then go to a person', async () => {
  const flaky = new FakeRegistrar();
  flaky.check = async () => { throw new Error('Cloudflare 503'); };
  const t = setup({ registrar: flaky, env: { FULFILMENT_MAX_ATTEMPTS: '3' } });
  let order = await t.wf.advance((await newOrder(t)).id);
  assert.strictEqual(order.state, 'active');
  assert.strictEqual(order.attempts, 1);
  assert.strictEqual(new Date(order.next_attempt_at) - new Date('2026-11-11T15:00:00Z'), 30000);
  t.advanceClock(31000);
  [order] = await t.wf.tick();
  assert.strictEqual(order.attempts, 2);
  t.advanceClock(61000);
  [order] = await t.wf.tick();
  assert.strictEqual(order.state, 'needs_human');
  assert.strictEqual(order.needs_human_reason, 'too_many_errors');
});

test('slow registrations are polled, not re-sent', async () => {
  const t = setup({ registrar: new FakeRegistrar({ asyncRegistrations: true }) });
  let order = await t.wf.advance((await newOrder(t)).id);
  assert.strictEqual(order.step, 'register_domain');
  assert.strictEqual(order.registration.state, 'in_progress');
  t.advanceClock(61000);
  await t.wf.tick();
  assert.strictEqual(t.fakeRegistrar.calls.register, 1);
  t.fakeRegistrar.complete('keinicke-anna.com');
  t.advanceClock(61000);
  [order] = await t.wf.tick();
  assert.strictEqual(order.step, 'mail_setup');
  assert.strictEqual(t.fakeRegistrar.calls.register, 1);
});

test('a domain already in the account is never handed to a new order', async () => {
  const t = setup();
  await t.fakeRegistrar.register('keinicke-anna.com', {});
  const order = await t.wf.advance((await newOrder(t)).id);
  assert.strictEqual(order.needs_human_reason, 'already_in_account');
});

test('live order without live providers configured stops safely', async () => {
  const t = setup({ env: { FULFILMENT_REGISTRAR: 'cloudflare', FULFILMENT_ALLOW_LIVE_REGISTRATION: 'true' } });
  // no Cloudflare credentials and no override: live providers are missing
  const s = session({ id: 'cs_live_y' });
  const order = await t.wf.advance((await newOrder(t, s, { livemode: true, contact: contact() })).id);
  assert.strictEqual(order.dry_run, false);
  assert.strictEqual(order.state, 'needs_human');
  assert.strictEqual(order.needs_human_reason, 'permanent_error');
});

test('livemode alone is not enough to spend money', async () => {
  const t = setup({ env: { FULFILMENT_REGISTRAR: 'cloudflare' } }); // ALLOW_LIVE not set
  const order = await newOrder(t, session({ id: 'cs_live_z' }), { livemode: true, contact: contact() });
  assert.strictEqual(order.dry_run, true);
});

test('DKIM pasted after setup re-writes the records', async () => {
  const t = setup();
  let order = await t.wf.advance((await newOrder(t)).id);
  order = (await t.wf.submitWorkspaceDetails(order.status_token, { verification: VERIFY }, { normaliseVerification, normaliseDkim })).order;
  assert.strictEqual(order.state, 'done');
  const out = await t.wf.submitWorkspaceDetails(order.status_token, { dkim: `"v=DKIM1; k=rsa;\n p=${DKIM_KEY}"` }, { normaliseVerification, normaliseDkim });
  assert.strictEqual(out.order.state, 'done');
  const dkim = t.fakeDns.recordsFor('keinicke-anna.com').find(r => r.name === 'google._domainkey.keinicke-anna.com');
  assert.strictEqual(dkim.content, `v=DKIM1; k=rsa; p=${DKIM_KEY}`);
});

test('customer input is validated before it can reach DNS', async () => {
  const t = setup();
  const order = await t.wf.advance((await newOrder(t)).id);
  const bad = await t.wf.submitWorkspaceDetails(order.status_token, { verification: 'x"; DROP' }, { normaliseVerification, normaliseDkim });
  assert.strictEqual(bad.error, 'invalid_verification');
  assert.strictEqual(normaliseVerification('AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'), VERIFY, 'bare code gets the prefix');
  assert.strictEqual(normaliseVerification('google-site-verification=short'), null);
  assert.strictEqual(normaliseDkim('v=DKIM1; k=rsa; p=abc'), null);
  const notFound = await t.wf.submitWorkspaceDetails('nope', { verification: VERIFY }, { normaliseVerification, normaliseDkim });
  assert.strictEqual(notFound.error, 'not_found');
});

test('ops retry puts a stuck order back on the line', async () => {
  const t = setup({ registrar: new FakeRegistrar({ priceUsd: 30 }) });
  let order = await t.wf.advance((await newOrder(t)).id);
  assert.strictEqual(order.state, 'needs_human');
  t.fakeRegistrar.priceUsd = 11;
  order = await t.wf.retry(order.id);
  assert.strictEqual(order.state, 'awaiting_customer');
  const events = (await t.store.events(order.id)).map(e => e.type);
  assert.ok(events.includes('ops_retry'));
  assert.ok(events.includes('needs_human'));
});

test('flags default to off and fake', () => {
  const c = loadConfig({});
  assert.strictEqual(c.enabled, false);
  assert.strictEqual(c.registrar, 'fake');
  assert.strictEqual(c.allowLiveRegistration, false);
  assert.strictEqual(c.autoRefund, false);
  assert.strictEqual(c.requireCustomerRegistrant, true);
  assert.strictEqual(c.defaultTier, 'workspace');
});
