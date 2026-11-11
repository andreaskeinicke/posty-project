/**
 * DNS record helpers shared by the DNS providers.
 * A record is { type, name, content, priority?, ttl?, exclusivePrefix? }.
 * exclusivePrefix (e.g. 'v=spf1') means: at most one record of this type+name may start
 * with that prefix, so an existing different one is replaced instead of duplicated.
 */
function sameRecord(a, b) {
  return a.type === b.type &&
    a.name.toLowerCase() === b.name.toLowerCase() &&
    normaliseContent(a) === normaliseContent(b) &&
    (a.type !== 'MX' || Number(a.priority) === Number(b.priority));
}

function normaliseContent(r) {
  let c = String(r.content || '').trim();
  if (r.type === 'TXT') c = c.replace(/^"|"$/g, '');
  if (r.type === 'MX' || r.type === 'CNAME') c = c.replace(/\.$/, '').toLowerCase();
  return c;
}

/**
 * Work out what to create and what to replace, given existing records.
 * Pure function so it can be tested without any provider.
 */
function planUpsert(existing, wanted) {
  const create = [];
  const replace = [];
  const unchanged = [];
  for (const w of wanted) {
    if (existing.some(e => sameRecord(e, w))) { unchanged.push(w); continue; }
    if (w.exclusivePrefix) {
      const clash = existing.find(e => e.type === w.type &&
        e.name.toLowerCase() === w.name.toLowerCase() &&
        normaliseContent(e).startsWith(w.exclusivePrefix));
      if (clash) { replace.push({ id: clash.id, record: w }); continue; }
    }
    create.push(w);
  }
  return { create, replace, unchanged };
}

module.exports = { planUpsert, sameRecord, normaliseContent };
