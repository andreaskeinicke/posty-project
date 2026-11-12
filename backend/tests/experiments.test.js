const test = require('node:test');
const assert = require('node:assert');
const { summarize, chanceToBeBest } = require('../services/experimentStats');
const config = require('../../frontend/src/landing/headlines.json');

const counts = (rows) => rows.flatMap(([variant, view, search]) => [
  { variant, event: 'view', n: view }, { variant, event: 'search', n: search }
]);

test('headline config is valid', () => {
  const ids = config.variants.map(v => v.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  config.variants.forEach(v => {
    assert.ok(['active', 'queued', 'winner', 'retired'].includes(v.status));
    assert.ok(v.headline.length > 5 && v.headline.length <= 60, v.headline);
  });
  assert.ok(config.variants.filter(v => v.status === 'winner').length <= 1);
});

test('chance to be best sums to 1 and favours the better arm', () => {
  const p = chanceToBeBest([{ trials: 1000, hits: 100 }, { trials: 1000, hits: 160 }]);
  assert.ok(Math.abs(p[0] + p[1] - 1) < 1e-9);
  assert.ok(p[1] > 0.99);
});

test('keeps running until every headline has enough views', () => {
  const s = summarize(config, counts([['a', 30, 9], ['b', 30, 3], ['c', 30, 3], ['d', 30, 3]]));
  assert.match(s.verdict, /^keep running/);
});

test('declares a clear winner', () => {
  const s = summarize(config, counts([['a', 600, 60], ['b', 600, 150], ['c', 600, 62], ['d', 600, 58]]));
  assert.strictEqual(s.verdict, 'winner: b');
});

test('suggests retiring a clear loser before there is a winner', () => {
  const s = summarize(config, counts([['a', 400, 80], ['b', 400, 78], ['c', 400, 20], ['d', 400, 76]]));
  assert.match(s.verdict, /^retire: c$/);
});
