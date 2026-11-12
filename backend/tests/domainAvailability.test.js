const test = require('node:test');
const assert = require('node:assert');
const service = require('../services/domainAvailabilityService');

test('WHOIS responses are classified', () => {
  const cases = [
    ['No entries found for the selected source.', 'available'], // .dk
    ['% .eu Whois\nDomain: x.eu\nScript: LATIN\nStatus: AVAILABLE', 'available'],
    ['Domain: x.de\nStatus: free', 'available'],
    ['NOT FOUND', 'available'],
    ['Domain: keinicke.dk\nRegistered: 2010-01-01', 'taken'],
    ['Domain: x.de\nNserver: ns1.example\nStatus: connect', 'taken'],
    ['Query limit exceeded', 'unknown'],
    ['', 'unknown']
  ];
  for (const [text, expected] of cases) {
    assert.strictEqual(service._parseWhois(text), expected, text);
  }
});

test('unverified results are not cached', async () => {
  service.clearCache();
  service._hasNameservers = async () => false;
  service._checkRDAP = async () => 'unknown';
  service._checkRegistryWhois = async () => 'unknown';
  const result = await service.checkDomain('not-verified-example.dk');
  assert.strictEqual(result.status, 'unknown');
  assert.strictEqual(service.cache.keys().length, 0);
});

test('WHOIS is used when RDAP has no answer, and verified results are cached', async () => {
  service.clearCache();
  service._hasNameservers = async () => false;
  service._checkRDAP = async () => 'unknown';
  service._checkRegistryWhois = async () => 'available';
  const result = await service.checkDomain('free-example.dk');
  assert.strictEqual(result.available, true);
  assert.strictEqual(result.method, 'whois');
  assert.strictEqual(service.cache.keys().length, 1);
});

test('TLDs missing from the IANA bootstrap use the override RDAP server', async () => {
  service._bootstrap = new Map();
  service._bootstrapExpires = Date.now() + 60000;
  const realFetch = global.fetch;
  let requested;
  global.fetch = async url => { requested = url; return { status: 404, ok: false }; };
  try {
    const verdict = await Object.getPrototypeOf(service)._checkRDAP.call(service, 'free-example.io');
    assert.strictEqual(verdict, 'available');
    assert.strictEqual(requested, 'https://rdap.identitydigital.services/rdap/domain/free-example.io');
  } finally {
    global.fetch = realFetch;
  }
});

test('very short names are treated as premium, never as free', async () => {
  for (const d of ['ob.me', 'js.com', 'abc.xyz', 'abc.co']) {
    const r = await service._performCheck(d);
    assert.strictEqual(r.status, 'premium', d);
    assert.strictEqual(r.available, false, d);
  }
  assert.strictEqual(service._isPremiumLength('abc.com'), false);
  assert.strictEqual(service._isPremiumLength('obennett.me'), false);
});
