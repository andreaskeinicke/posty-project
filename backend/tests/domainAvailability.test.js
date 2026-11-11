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
