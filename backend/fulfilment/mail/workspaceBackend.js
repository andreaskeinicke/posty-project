/**
 * Google Workspace, phase 1: the customer buys Business Starter directly from Google
 * (Google bills them). Posty owns the DNS, so once Google gives the customer a domain
 * verification code, Posty writes every record. DKIM is optional and can come later
 * (Google only shows the key in the Admin console after setup).
 */
const VERIFICATION_RE = /^google-site-verification=[A-Za-z0-9_-]{20,100}$/;
const DKIM_RE = /^v=DKIM1;\s*k=rsa;\s*p=[A-Za-z0-9+/=]{100,}$/;

function normaliseVerification(input) {
  if (!input) return null;
  let v = String(input).trim().replace(/^"|"$/g, '').trim();
  if (!v.startsWith('google-site-verification=')) v = `google-site-verification=${v}`;
  return VERIFICATION_RE.test(v) ? v : null;
}

function normaliseDkim(input) {
  if (!input) return null;
  // The Admin console wraps long keys and people paste with quotes and line breaks.
  const v = String(input).replace(/["\s]+/g, ' ').replace(/;\s*/g, '; ').trim().replace(/;\s*$/, '');
  const compact = v.replace(/p=\s*([A-Za-z0-9+/=\s]+)$/, (m, key) => `p=${key.replace(/\s+/g, '')}`);
  return DKIM_RE.test(compact) ? compact : null;
}

class WorkspaceBackend {
  constructor() { this.tier = 'workspace'; }

  async provision(order, { config }) {
    if (order.mail?.workspaceVerification) return { ready: true };
    return {
      ready: false,
      action: {
        type: 'approve_workspace',
        title: 'Approve Google Workspace',
        body: 'Sign in with Google and accept their terms. Google bills you from here. When Google shows a verification code, paste it here and we do the rest.',
        url: config.workspaceSignupUrl,
        input: 'workspace_verification'
      }
    };
  }

  records(order) {
    const d = order.domain_name;
    const out = [
      { type: 'TXT', name: d, content: order.mail.workspaceVerification },
      { type: 'MX', name: d, content: 'smtp.google.com', priority: 1 },
      { type: 'TXT', name: d, content: 'v=spf1 include:_spf.google.com ~all', exclusivePrefix: 'v=spf1' },
      { type: 'TXT', name: `_dmarc.${d}`, content: 'v=DMARC1; p=none; adkim=r; aspf=r', exclusivePrefix: 'v=DMARC1' }
    ];
    if (order.mail?.dkim) {
      out.push({ type: 'TXT', name: `google._domainkey.${d}`, content: order.mail.dkim, exclusivePrefix: 'v=DKIM1' });
    }
    return out;
  }

  async verify(order, { resolver }) {
    const mx = await resolver.resolveMx(order.domain_name).catch(() => []);
    const ok = mx.some(r => /(^|\.)google\.com$/i.test(String(r.exchange).replace(/\.$/, '')));
    return { ok, detail: ok ? 'Google MX visible in public DNS' : 'Google MX not visible yet' };
  }
}

module.exports = { WorkspaceBackend, normaliseVerification, normaliseDkim };
