/**
 * Setup coach: finds orders that are stuck on the customer's step and drafts a nudge for
 * each, on the 1 hour, 24 hours and 3 days schedule from the operating model.
 * Drafts only. Nothing is sent from here; sending waits for an email provider and an okay.
 */
const NUDGES = [
  { after: 3 * 24 * 3600e3, key: 'day3', subject: 'Your new address is almost ready', body: d => `Your domain ${d} is registered to you and waiting for one step: approving Google Workspace. It takes about five minutes. Reply to this email if anything is unclear and a person will help.` },
  { after: 24 * 3600e3, key: 'day1', subject: 'One step left for your new address', body: d => `${d} is registered in your name. The last step is starting Google Workspace signup and pasting the verification code on your Moving in page. We do the rest.` },
  { after: 3600e3, key: 'hour1', subject: 'Your turn: approve Google Workspace', body: d => `We have set up ${d}. Open your Moving in page to finish the Google step. It is the only part we cannot do for you.` }
];

const FORWARD_BODY = d => `${d} is ready to forward mail. Confirm the Cloudflare email in your current inbox (check spam if you do not see it) and you are done.`;

function waitingSince(order) {
  const s = order.steps || {};
  const t = s.mail_records?.at || s.dns_zone?.at || order.updated_at || order.created_at;
  return t ? new Date(t) : null;
}

/** @returns Array of { orderId, domain, tier, waitingHours, nudge: {key, subject, body} | null } */
function stalledOrders(orders, now = new Date()) {
  return orders
    .filter(o => o.state === 'awaiting_customer')
    .map(o => {
      const since = waitingSince(o);
      const age = since ? now - since : 0;
      const due = NUDGES.find(n => age >= n.after);
      const sent = (o.meta && o.meta.nudges) || [];
      const nudge = due && !sent.includes(due.key)
        ? { key: due.key, subject: due.subject, body: o.tier === 'forward' ? FORWARD_BODY(o.domain_name) : due.body(o.domain_name) }
        : null;
      return { orderId: o.id, domain: o.domain_name, tier: o.tier, waitingHours: Math.round(age / 360e3) / 10, nudge };
    })
    .sort((a, b) => b.waitingHours - a.waitingHours);
}

module.exports = { stalledOrders, NUDGES };
