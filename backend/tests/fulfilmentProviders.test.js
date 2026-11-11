const test = require('node:test');
const assert = require('node:assert');
const { CloudflareClient } = require('../fulfilment/cloudflareClient');
const { CloudflareRegistrar } = require('../fulfilment/registrars/cloudflareRegistrar');
const { CloudflareDns } = require('../fulfilment/dns/cloudflareDns');
const { planUpsert } = require('../fulfilment/dns/records');
const { contactFromStripe, formatPhone } = require('../fulfilment/contact');

function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, init) => {
    const path = url.replace('https://api.cloudflare.com/client/v4', '');
    calls.push({ method: init.method, path, headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
    const key = `${init.method} ${path.split('?')[0]}`;
    const r = routes[key];
    if (!r) return { ok: false, status: 404, json: async () => ({ success: false, errors: [{ message: 'not found' }] }) };
    const out = typeof r === 'function' ? r(calls[calls.length - 1]) : r;
    return { ok: (out.status || 200) < 400, status: out.status || 200, json: async () => out.body };
  };
  fn.calls = calls;
  return fn;
}

const ACC = '/accounts/acc1';

test('Cloudflare registrar: check parses price and reasons', async () => {
  const f = fakeFetch({
    [`POST ${ACC}/registrar/domain-check`]: { body: { success: true, result: { domains: [
      { name: 'acme.dev', registrable: true, tier: 'standard', pricing: { currency: 'USD', registration_cost: '10.11', renewal_cost: '10.11' } }
    ] } } }
  });
  const reg = new CloudflareRegistrar(new CloudflareClient({ apiToken: 't', accountId: 'acc1', fetchImpl: f }));
  const c = await reg.check('acme.dev');
  assert.deepStrictEqual(c, { registrable: true, reason: null, tier: 'standard', priceUsd: 10.11, renewalUsd: 10.11, currency: 'USD' });
  assert.deepStrictEqual(f.calls[0].body, { domains: ['acme.dev'] });
  assert.strictEqual(f.calls[0].headers.Authorization, 'Bearer t');
});

test('Cloudflare registrar: register is async and carries the customer as registrant', async () => {
  const f = fakeFetch({
    [`POST ${ACC}/registrar/registrations`]: { status: 202, body: { success: true, result: { domain_name: 'acme.dev', state: 'in_progress', completed: false } } },
    [`GET ${ACC}/registrar/registrations/acme.dev/registration-status`]: { body: { success: true, result: {
      state: 'succeeded', completed: true, context: { registration: { expires_at: '2027-11-11T00:00:00Z' } } } } }
  });
  const reg = new CloudflareRegistrar(new CloudflareClient({ apiToken: 't', accountId: 'acc1', fetchImpl: f }));
  const r = await reg.register('acme.dev', { contact: { email: 'a@b.c' } });
  assert.strictEqual(r.state, 'in_progress');
  assert.strictEqual(f.calls[0].headers.Prefer, 'respond-async');
  assert.deepStrictEqual(f.calls[0].body, { domain_name: 'acme.dev', contacts: { registrant: { email: 'a@b.c' } } });
  const s = await reg.getStatus('acme.dev');
  assert.deepStrictEqual(s, { state: 'succeeded', expiresAt: '2027-11-11T00:00:00Z', error: null });
});

test('Cloudflare registrar: status 404 means never requested', async () => {
  const reg = new CloudflareRegistrar(new CloudflareClient({ apiToken: 't', accountId: 'acc1', fetchImpl: fakeFetch({}) }));
  assert.strictEqual(await reg.getStatus('nope.dev'), null);
});

test('Cloudflare errors: 4xx is permanent, 5xx is transient', async () => {
  const f = fakeFetch({
    [`POST ${ACC}/registrar/domain-check`]: { status: 403, body: { success: false, errors: [{ code: 10000, message: 'Authentication error' }] } },
    [`GET ${ACC}/registrar/registrations/x.dev/registration-status`]: { status: 502, body: null }
  });
  const reg = new CloudflareRegistrar(new CloudflareClient({ apiToken: 't', accountId: 'acc1', fetchImpl: f }));
  await assert.rejects(reg.check('x.dev'), err => err.transient === false && /Authentication error/.test(err.message));
  await assert.rejects(reg.getStatus('x.dev'), err => err.transient === true);
});

test('Cloudflare DNS: upsert creates missing records and replaces a clashing SPF', async () => {
  const f = fakeFetch({
    'GET /zones/z1/dns_records': { body: { success: true, result: [
      { id: 'r1', type: 'TXT', name: 'acme.dev', content: '"v=spf1 include:_spf.mx.cloudflare.net ~all"' },
      { id: 'r2', type: 'MX', name: 'acme.dev', content: 'smtp.google.com', priority: 1 }
    ] } },
    'POST /zones/z1/dns_records': { body: { success: true, result: {} } },
    'PATCH /zones/z1/dns_records/r1': { body: { success: true, result: {} } }
  });
  const dns = new CloudflareDns(new CloudflareClient({ apiToken: 't', accountId: 'acc1', fetchImpl: f }));
  const out = await dns.upsertRecords('z1', [
    { type: 'MX', name: 'acme.dev', content: 'smtp.google.com.', priority: 1 },
    { type: 'TXT', name: 'acme.dev', content: 'v=spf1 include:_spf.google.com ~all', exclusivePrefix: 'v=spf1' },
    { type: 'TXT', name: '_dmarc.acme.dev', content: 'v=DMARC1; p=none', exclusivePrefix: 'v=DMARC1' }
  ]);
  assert.deepStrictEqual(out, { created: 1, replaced: 1, unchanged: 1 });
  const post = f.calls.find(c => c.method === 'POST');
  assert.strictEqual(post.body.name, '_dmarc.acme.dev');
});

test('planUpsert keeps MX priorities apart', () => {
  const plan = planUpsert([{ id: 'a', type: 'MX', name: 'x.com', content: 'smtp.google.com', priority: 5 }],
    [{ type: 'MX', name: 'x.com', content: 'smtp.google.com', priority: 1 }]);
  assert.strictEqual(plan.create.length, 1);
});

test('registrant contact from Stripe Checkout details', () => {
  const { contact, missing } = contactFromStripe({
    name: 'Anna Keinicke', email: 'anna@example.com', phone: '+4512345678',
    address: { line1: 'Vestergade 1', line2: '2. tv', city: 'Silkeborg', postal_code: '8600', country: 'DK', state: null }
  });
  assert.deepStrictEqual(missing, []);
  assert.strictEqual(contact.phone, '+45.12345678');
  assert.strictEqual(contact.postal_info.address.street, 'Vestergade 1, 2. tv');
  assert.strictEqual(contact.postal_info.address.country_code, 'DK');
  assert.deepStrictEqual(contactFromStripe({ email: 'a@b.c' }).missing,
    ['name', 'phone', 'address.line1', 'address.city', 'address.postal_code', 'address.country']);
  assert.strictEqual(formatPhone('+14155550100', 'US'), '+1.4155550100');
  assert.strictEqual(formatPhone('+3581234567', null), '+358.1234567');
  assert.strictEqual(formatPhone('12345', 'DK'), null);
});
