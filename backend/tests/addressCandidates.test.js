const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { candidates, domainsFor, rank, nameParts, parseName, nameProblem } = require('../services/addressCandidates');

const addresses = name => candidates(name).flatMap(c => c.tlds.map(t => `${c.local}@${c.base}${t}`));

test('server copy matches the website copy of names.js', () => {
  const front = fs.readFileSync(path.join(__dirname, '../../frontend/src/landing/names.js'), 'utf8')
    .replace(/^export (function|const) /gm, '$1 ');
  const back = fs.readFileSync(path.join(__dirname, '../services/addressCandidates.js'), 'utf8');
  assert.ok(back.includes(front.trim()), 'run the sync: backend/services/addressCandidates.js is out of date');
});

test('normalizes Nordic, accented, Polish and Cyrillic names', () => {
  assert.deepStrictEqual(nameParts('Søren Ågård'), ['soren', 'aagaard']);
  assert.deepStrictEqual(nameParts('  José   Núñez '), ['jose', 'nunez']);
  assert.deepStrictEqual(nameParts('Łukasz Wiśniewski'), ['lukasz', 'wisniewski']);
  assert.deepStrictEqual(nameParts('Александр Иванов'), ['aleksandr', 'ivanov']);
});

test('checks both spellings of ø, ü and friends', () => {
  const all = addresses('Søren Østergaard');
  assert.ok(all.includes('soren@ostergaard.com'));
  assert.ok(all.includes('soeren@oestergaard.com'));
});

test('keeps apostrophes, particles and double-barrelled names together', () => {
  assert.deepStrictEqual(parseName("Siobhán O'Connor").surnames, ['oconnor']);
  assert.deepStrictEqual(parseName('José da Silva').surnames, ['dasilva', 'silva']);
  assert.deepStrictEqual(parseName('Mohammed Al-Rashid').surnames, ['alrashid', 'rashid']);
  assert.deepStrictEqual(parseName('Anna-Sofie Lund-Hansen').surnames, ['lundhansen', 'hansen']);
  assert.strictEqual(parseName('Anna-Sofie Lund-Hansen').first, 'anna');
});

test('builds the surname patterns first, with a one-letter twin', () => {
  const list = candidates('Maya Lindqvist');
  assert.strictEqual(list[0].local, 'maya');
  assert.strictEqual(list[0].base, 'lindqvist');
  assert.ok(list.some(c => c.local === 'm' && c.base === 'lindqvist'));
  assert.ok(domainsFor(list).includes('lindqvist.me'));
});

test('never repeats a name across the @', () => {
  for (const name of ['Oliver Bennett', 'Maria Garcia', 'Søren Østergaard', 'Wei Zhang']) {
    candidates(name).forEach(c => {
      if (c.local.length > 1) assert.ok(!c.base.includes(c.local), `${c.local}@${c.base}`);
    });
  }
});

test('no 1-3 letter domains, no brand initials, no overlong labels', () => {
  for (const name of ['Oliver Bennett', 'Ida Bo', 'Zoë', 'Bartholomew Montgomery-Wellington', 'Wei Zhang']) {
    candidates(name).forEach(c => {
      assert.ok(c.base.length >= 4 && c.base.length <= 18, c.base);
      assert.ok(!c.base.startsWith('bmw'), c.base);
    });
  }
});

test('single name words only go on endings without premium name pricing', () => {
  candidates('Oliver Bennett').filter(c => c.base === 'bennett')
    .forEach(c => c.tlds.forEach(t => assert.ok(['.com', '.me'].includes(t), `bennett${t}`)));
});

test('long first names also get the common short form', () => {
  assert.ok(addresses('Bartholomew Wellington').includes('bart@wellington.com'));
});

test('rank only returns free domains', () => {
  const list = candidates('Maya Lindqvist');
  const avail = {};
  domainsFor(list).forEach((d, i) => { avail[d] = { available: i % 2 === 0 }; });
  const out = rank(list, avail, 'all');
  assert.ok(out.length > 0);
  out.forEach(c => c.avail.forEach(t => assert.strictEqual(avail[c.base + t].available, true)));
});

test('empty, symbol-only and non-Latin names give no candidates and a reason', () => {
  assert.deepStrictEqual(candidates(''), []);
  assert.deepStrictEqual(candidates('123 !!'), []);
  assert.deepStrictEqual(candidates('山田太郎'), []);
  assert.match(nameProblem('山田太郎'), /Latin letters/);
  assert.strictEqual(nameProblem('Oliver Bennett'), null);
});
