/**
 * Read-only setup diagnostics: looks up a domain's public mail records and says, in plain
 * words, what is right, what is missing and what to do. Never writes DNS and never reads
 * mail. The resolver is injectable so tests run without the network.
 */
const dnsPromises = require('dns').promises;

const DOMAIN_RE = /^(?=.{1,253}$)(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/i;

const EXPECT = {
  workspace: {
    mx: ex => /(^|\.)google\.com$/i.test(ex) || /(^|\.)googlemail\.com$/i.test(ex),
    mxLabel: 'Google (smtp.google.com)',
    spfInclude: '_spf.google.com',
    dkimSelector: 'google'
  },
  forward: {
    mx: ex => /mx\.cloudflare\.net$/i.test(ex),
    mxLabel: 'Cloudflare Email Routing',
    spfInclude: '_spf.mx.cloudflare.net',
    dkimSelector: null // forwarding only, nothing is sent from the domain
  }
};

const txtJoin = rows => (rows || []).map(parts => (Array.isArray(parts) ? parts.join('') : String(parts)));

async function safe(fn) {
  try { return { ok: true, value: await fn() }; } catch (err) {
    if (['ENODATA', 'ENOTFOUND', 'ENOENT'].includes(err.code)) return { ok: true, value: [] };
    return { ok: false, error: err.code || 'lookup_failed' };
  }
}

/**
 * @param {string} domain
 * @param {object} opts { tier: 'workspace'|'forward', resolver, expectVerification: bool }
 * @returns {Promise<{domain, tier, checks: Array, summary: 'ok'|'action_needed'|'waiting'|'unknown', nextStep}>}
 */
async function diagnose(domain, { tier = 'workspace', resolver = dnsPromises, expectVerification = tier === 'workspace' } = {}) {
  const d = String(domain || '').trim().toLowerCase().replace(/\.$/, '');
  if (!DOMAIN_RE.test(d)) throw Object.assign(new Error('invalid_domain'), { code: 'invalid_domain' });
  const want = EXPECT[tier] || EXPECT.workspace;

  const [mx, txt, dmarc, dkim] = await Promise.all([
    safe(() => resolver.resolveMx(d)),
    safe(() => resolver.resolveTxt(d)),
    safe(() => resolver.resolveTxt(`_dmarc.${d}`)),
    want.dkimSelector ? safe(() => resolver.resolveTxt(`${want.dkimSelector}._domainkey.${d}`)) : Promise.resolve(null)
  ]);

  const checks = [];
  const add = (key, label, status, detail, fix = null) => checks.push({ key, label, status, detail, fix });

  // MX
  if (!mx.ok) add('mx', 'Mail servers (MX)', 'unknown', 'Could not look up the mail servers right now.');
  else {
    const hosts = mx.value.map(r => String(r.exchange).replace(/\.$/, '').toLowerCase());
    const good = hosts.filter(want.mx);
    if (!hosts.length) add('mx', 'Mail servers (MX)', 'missing', 'No mail servers are set yet, so mail cannot arrive.', 'We add these for you once the setup step before it is done.');
    else if (good.length && good.length === hosts.length) add('mx', 'Mail servers (MX)', 'ok', `Mail goes to ${want.mxLabel}.`);
    else if (good.length) add('mx', 'Mail servers (MX)', 'warn', `Mail goes to ${want.mxLabel}, but other mail servers are listed too, so some mail may go elsewhere.`, 'Ask us to tidy the records.');
    else add('mx', 'Mail servers (MX)', 'wrong', `Mail goes to ${hosts[0]}, not ${want.mxLabel}.`, 'Ask us to fix the records.');
  }

  const rootTxt = txt.ok ? txtJoin(txt.value) : null;

  // SPF
  if (!rootTxt) add('spf', 'Sender check (SPF)', 'unknown', 'Could not look up the SPF record right now.');
  else {
    const spf = rootTxt.filter(v => /^v=spf1\b/i.test(v));
    if (!spf.length) add('spf', 'Sender check (SPF)', 'missing', 'No SPF record, so other providers cannot tell your mail is genuine.', 'We add it with the mail records.');
    else if (spf.length > 1) add('spf', 'Sender check (SPF)', 'wrong', 'There are two SPF records. Providers then ignore both.', 'Ask us to merge them into one.');
    else if (!spf[0].toLowerCase().includes(`include:${want.spfInclude}`)) add('spf', 'Sender check (SPF)', tier === 'forward' ? 'warn' : 'wrong', `The SPF record does not include ${want.spfInclude}.`, 'Ask us to fix the records.');
    else add('spf', 'Sender check (SPF)', 'ok', 'Other providers can tell your mail is genuine.');
  }

  // Google verification
  if (expectVerification && rootTxt) {
    const has = rootTxt.some(v => v.startsWith('google-site-verification='));
    add('verification', 'Google verification', has ? 'ok' : 'missing',
      has ? 'Google can see the verification record.' : 'Google cannot see a verification record yet.',
      has ? null : 'Paste the code from Google on your Moving in page.');
  }

  // DKIM
  if (dkim) {
    if (!dkim.ok) add('dkim', 'Signature (DKIM)', 'unknown', 'Could not look up DKIM right now.');
    else {
      const has = txtJoin(dkim.value).some(v => /^v=DKIM1/i.test(v) || /\bp=[A-Za-z0-9+/]{40,}/.test(v));
      add('dkim', 'Signature (DKIM)', has ? 'ok' : 'warn',
        has ? 'Your mail is signed, so it is less likely to land in spam.' : 'Not added yet. Mail still works, but it lands in spam more often.',
        has ? null : 'In Google Admin, open Apps, Google Workspace, Gmail, Authenticate email, copy the DKIM record and paste it on your Moving in page.');
    }
  }

  // DMARC
  if (!dmarc.ok) add('dmarc', 'Spoofing policy (DMARC)', 'unknown', 'Could not look up DMARC right now.');
  else {
    const recs = txtJoin(dmarc.value).filter(v => /^v=DMARC1/i.test(v));
    if (!recs.length) add('dmarc', 'Spoofing policy (DMARC)', 'missing', 'No DMARC policy, so it is easier for others to fake your address.', 'We add it with the mail records.');
    else if (recs.length > 1) add('dmarc', 'Spoofing policy (DMARC)', 'wrong', 'There are two DMARC records. Providers then ignore both.', 'Ask us to fix the records.');
    else add('dmarc', 'Spoofing policy (DMARC)', 'ok', 'A policy tells other providers what to do with fakes.');
  }

  const bad = checks.filter(c => c.status === 'missing' || c.status === 'wrong');
  const unknown = checks.filter(c => c.status === 'unknown');
  const summary = bad.length ? 'action_needed' : unknown.length ? 'unknown' : 'ok';
  const first = bad[0] || checks.find(c => c.status === 'warn');
  return {
    domain: d,
    tier,
    checks,
    summary,
    nextStep: first ? first.fix || first.detail : 'Everything we can see from outside looks right.'
  };
}

/** Plain-language next step for an order, from the public order view plus diagnostics. */
function coachNextStep(view, diag) {
  if (!view) return null;
  if (view.status === 'done') {
    const dkimMissing = diag?.checks.find(c => c.key === 'dkim' && c.status !== 'ok');
    return dkimMissing ? 'Your inbox is ready. One optional step left: add DKIM so your mail lands in fewer spam folders.' : 'Your inbox is ready. Send yourself a letter to see it work.';
  }
  if (view.status === 'waiting_on_you') {
    return view.tier === 'forward'
      ? 'Your turn: open the Cloudflare email in your current inbox and press the confirm link. Check spam if it is not there.'
      : 'Your turn: start Google Workspace signup on your new domain, choose to verify with a TXT record, and paste the code that starts with google-site-verification= on this page.';
  }
  if (view.status === 'person_on_it') return 'A person is looking at your order and will email you. There is nothing you need to do.';
  if (view.status === 'refunded') return 'This order was refunded. Search again to pick another address.';
  return 'We are working on it. This page updates by itself, and we email you when it is your turn.';
}

module.exports = { diagnose, coachNextStep, DOMAIN_RE };
