/**
 * Customer messages ("every step lands in your current inbox") and ops alerts.
 * Sends through emailService when it is set up; console otherwise (today's state).
 */
const { maskEmail } = require('./mail/forwardingBackend');

const MESSAGES = {
  domain_registered: o => ({
    subject: `${o.domain_name} is yours`,
    text: `Good news: ${o.domain_name} is registered in your name. We are setting up your mail now.\n\nFollow along: ${o._statusUrl}`
  }),
  action_needed: o => ({
    subject: `One step for you: ${o.customer_action?.title || 'finish setup'}`,
    text: `${o.customer_action?.body || ''}\n\nIt takes about a minute: ${o._statusUrl}`
  }),
  ready: o => ({
    subject: `${o.email_address || o.domain_name} is ready`,
    text: `Your new address is ready. Send yourself a letter to see it work.\n\n${o._statusUrl}`
  }),
  refunded: o => ({
    subject: `We could not get ${o.domain_name}, so we refunded you`,
    text: `Someone registered ${o.domain_name} moments before we could. We refunded your payment in full and cancelled the subscription. Search again any time: ${o._frontendUrl}`
  }),
  needs_human: o => ({
    subject: `A person is finishing ${o.domain_name} for you`,
    text: `Setting up ${o.domain_name} needs a human touch. Someone from Posty will take it from here and write to you, usually the same day.\n\n${o._statusUrl}`
  })
};

class Notifier {
  constructor({ emailService = null, frontendUrl, log = console } = {}) {
    this.emailService = emailService;
    this.frontendUrl = frontendUrl;
    this.log = log;
    this.sent = []; // for tests
  }

  statusUrl(order) { return `${this.frontendUrl}/order/${order.status_token}`; }

  async customer(order, kind) {
    const tpl = MESSAGES[kind];
    if (!tpl) return;
    const msg = tpl({ ...order, _statusUrl: this.statusUrl(order), _frontendUrl: this.frontendUrl });
    this.sent.push({ to: order.buyer_email, kind, subject: msg.subject });
    try {
      if (this.emailService?.initialized) {
        await this.emailService._sendEmail({ to: order.buyer_email, subject: msg.subject, text: msg.text, html: null,
          metadata: { type: `fulfilment_${kind}`, domain: order.domain_name } });
      } else {
        this.log.log(`📧 [fulfilment:${kind}] to ${maskEmail(order.buyer_email)}: ${msg.subject}`);
      }
    } catch (err) {
      // A failed email must never break fulfilment.
      this.log.error(`Notifier failed (${kind}) for order ${order.id}: ${err.message}`);
    }
  }

  async ops(order, code, detail) {
    this.sent.push({ to: 'ops', kind: code });
    this.log.error(`🚨 FULFILMENT NEEDS HUMAN [${code}] order=${order.id} domain=${order.domain_name} ${detail || ''}`);
  }
}

module.exports = { Notifier };
