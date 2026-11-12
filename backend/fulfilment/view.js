/**
 * The customer-facing "Moving in" view of an order (matches the Paper design: five steps).
 * Shows nothing internal: no error text, no ids, no full email address.
 */
const { maskEmail } = require('./mail/forwardingBackend');

function publicView(order) {
  const s = order.steps || {};
  const awaiting = order.state === 'awaiting_customer';
  const at = k => s[k]?.at || null;
  const stepState = (doneKey, activeSteps) => {
    if (s[doneKey]) return 'done';
    if (activeSteps.includes(order.step) && ['active', 'awaiting_customer'].includes(order.state)) return awaiting && order.step === 'mail_setup' ? 'waiting_on_you' : 'working';
    return 'pending';
  };

  const yourTurnTitle = order.tier === 'forward' ? 'Your turn: confirm your inbox' : 'Your turn: approve Google Workspace';
  const steps = [
    { key: 'payment', title: 'Payment received', detail: `Receipt sent to ${maskEmail(order.buyer_email)}.`, state: 'done', at: at('payment_received') },
    { key: 'domain', title: `${order.domain_name} registered in your name`, detail: 'You are the owner on record.',
      state: s.dns_zone ? 'done' : stepState('dns_zone', ['register_domain', 'dns_zone']), at: at('dns_zone') },
    { key: 'your_turn', title: yourTurnTitle, detail: 'This is the only step we cannot do for you.',
      state: stepState('mail_setup', ['mail_setup']), at: at('mail_setup') },
    { key: 'records', title: 'Mail records connected', detail: 'We set up MX, SPF and DMARC so your mail arrives and is trusted.',
      state: stepState('mail_records', ['mail_records']), at: at('mail_records') },
    { key: 'inbox', title: 'Inbox ready', detail: 'Send yourself a letter to see it work.',
      state: s.complete || order.state === 'done' ? 'done' : stepState('verify_mail', ['verify_mail', 'complete']), at: at('complete') }
  ];

  const status = {
    active: 'working', awaiting_customer: 'waiting_on_you', done: 'done',
    needs_human: 'person_on_it', refunded: 'refunded'
  }[order.state] || 'working';

  return {
    token: order.status_token,
    address: order.email_address || null,
    domain: order.domain_name,
    tier: order.tier,
    status,
    doneCount: steps.filter(x => x.state === 'done').length,
    totalSteps: steps.length,
    steps,
    action: awaiting && order.customer_action ? {
      type: order.customer_action.type,
      title: order.customer_action.title,
      body: order.customer_action.body,
      url: order.customer_action.url || null,
      input: order.customer_action.input || null
    } : null,
    // DKIM can be added after setup (Google shows it in the Admin console later).
    canAddDkim: order.tier === 'workspace' && Boolean(order.mail?.workspaceVerification) && !order.mail?.dkim,
    nameservers: order.nameservers || [],
    testMode: Boolean(order.dry_run)
  };
}

module.exports = { publicView };
