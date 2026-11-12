/**
 * Forwarding tier ("claim your name"): Cloudflare Email Routing forwards everything sent to
 * the new domain into the customer's current inbox. Receive-only: from January 2027 Gmail
 * no longer offers "Send mail as" for outside addresses, so this tier cannot promise sending.
 */
class ForwardingBackend {
  constructor() { this.tier = 'forward'; }

  async provision(order, { dns }) {
    const dest = order.forward_to || order.buyer_email;
    await dns.enableEmailRouting(order.zone_id);
    const { verified } = await dns.ensureDestination(dest);
    if (!verified) {
      return {
        ready: false,
        action: {
          type: 'verify_forwarding',
          title: `Confirm ${maskEmail(dest)}`,
          body: 'Cloudflare, our mail partner, just sent you an email. Click the link in it so we may forward your new mail there.',
          url: null,
          input: null
        }
      };
    }
    await dns.ensureCatchAll(order.zone_id, dest);
    return { ready: true };
  }

  records(order) {
    // Email Routing adds its own MX + SPF on enable; we only add DMARC.
    return [
      { type: 'TXT', name: `_dmarc.${order.domain_name}`, content: 'v=DMARC1; p=none', exclusivePrefix: 'v=DMARC1' }
    ];
  }

  async verify(order, { resolver }) {
    const mx = await resolver.resolveMx(order.domain_name).catch(() => []);
    const ok = mx.some(r => /mx\.cloudflare\.net\.?$/i.test(r.exchange));
    return { ok, detail: ok ? 'Cloudflare MX visible in public DNS' : 'Cloudflare MX not visible yet' };
  }
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return 'your inbox';
  const [user, host] = email.split('@');
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(1, user.length - 2))}@${host}`;
}

module.exports = { ForwardingBackend, maskEmail };
