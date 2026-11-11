const test = require('node:test');
const assert = require('node:assert');
const { candidates, domainsFor, rank, nameParts } = require('../services/addressCandidates');

test('normalizes Nordic and accented names', () => {
  assert.deepStrictEqual(nameParts('Søren Ågård'), ['soeren', 'aagaard']);
  assert.deepStrictEqual(nameParts('  José   Núñez '), ['jose', 'nunez']);
});

test('builds varied candidates for a two-part name', () => {
  const list = candidates('Maya Lindqvist');
  assert.ok(list.some(c => c.local === 'maya' && c.base === 'lindqvist'));
  assert.ok(list.some(c => c.local === 'hi'));
  assert.ok(domainsFor(list).includes('lindqvist.me'));
});

test('rank only returns free domains and keeps full rows', () => {
  const list = candidates('Maya Lindqvist');
  const avail = {};
  domainsFor(list).forEach((d, i) => { avail[d] = { available: i % 2 === 0 }; });
  const out = rank(list, avail, 'all');
  assert.ok(out.length === 3 || out.length === 6 || out.length < 3);
  out.forEach(c => c.avail.forEach(t => assert.strictEqual(avail[c.base + t].available, true)));
});

test('empty or symbol-only names give no candidates', () => {
  assert.deepStrictEqual(candidates(''), []);
  assert.deepStrictEqual(candidates('123 !!'), []);
});
