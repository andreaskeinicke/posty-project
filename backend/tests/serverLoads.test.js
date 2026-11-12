const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Every route module must at least load (catches syntax errors from merges).
test('all route modules load', () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:9';
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test';
  const dir = path.join(__dirname, '..', 'routes');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    assert.doesNotThrow(() => require(path.join(dir, f)), `routes/${f}`);
  }
});
