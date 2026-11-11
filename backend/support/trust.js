/**
 * Trust rules for the support agent. These run in code before and after the model, so they
 * hold even if a message talks the model into something.
 *
 *  1. Refunds, account access, ownership, contact-email changes, transfer codes, legal and
 *     abuse reports always go to a person (Andreas). The agent never acts on them.
 *  2. Identity claims in chat prove nothing. Order details are shown only to someone holding
 *     the order's private status link (the token from our emails), and even then masked.
 *  3. Secrets never leave: anything that looks like a key, token or card number is redacted
 *     before it is stored or sent to the model, and stripped from replies.
 */

const ESCALATION_RULES = [
  { category: 'refund', re: /\b(refund|money back|chargeback|charge ?back|dispute|cancel (my )?(order|payment|subscription)|overcharg|double charg|charged twice)/i },
  { category: 'account_access', re: /\b(lost access|locked out|can'?t (log|sign) ?in|cannot (log|sign) ?in|hacked|compromis|reset (my )?password|2fa|two.factor|recovery (code|email)|someone else (has|is using)|stolen)/i },
  { category: 'ownership', re: /\b(transfer (the |my )?domain|auth(orization)? ?code|epp ?code|transfer code|unlock (the |my )?domain|change (the )?(owner|registrant)|i am the (real |rightful )?owner|move (the |my )?domain (to|away)|whois (change|update))/i },
  { category: 'contact_change', re: /\b(change|update|replace) (the |my )?(contact|account|recovery|billing)? ?(email|e-mail|phone|address on (the |my )?(order|account))/i },
  { category: 'legal_abuse', re: /\b(lawyer|legal action|court|subpoena|police|law enforcement|gdpr|delete (all )?my data|erase my data|trademark|udrp|phishing|abuse report|spam(ming)? from)/i }
];

/** Deterministic triage. Returns the first escalation category that matches, or null. */
function triage(text) {
  const t = String(text || '');
  for (const rule of ESCALATION_RULES) if (rule.re.test(t)) return rule.category;
  return null;
}

// Phrases that try to change the agent's rules. Logged as a signal; the reply path is unchanged
// because the model never has tools that move money, DNS or account data anyway.
const INJECTION_RE = /(ignore (all |any |the )?(previous|prior|above) (instructions|rules)|you are now|system prompt|developer mode|act as (an? )?admin|reveal (your|the) (prompt|instructions|keys?))/i;
const looksLikeInjection = text => INJECTION_RE.test(String(text || ''));

const SECRET_PATTERNS = [
  /\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{8,}\b/g,           // Stripe keys
  /\bwhsec_[A-Za-z0-9]{8,}\b/g,                              // Stripe webhook secrets
  /\bsk-ant-[A-Za-z0-9_-]{8,}\b/g,                           // Anthropic keys
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, // JWTs (Supabase keys)
  /\b(gh[pousr]_[A-Za-z0-9]{20,})\b/g,                       // GitHub tokens
  /\b(?:\d[ -]?){13,19}\b/g,                                 // card-like numbers
  /\b(password|passwd|pwd|api[_ -]?key|secret|token)\s*[:=]\s*\S+/gi
];

/** Replace anything secret-looking with [redacted]. */
function redact(text) {
  let out = String(text || '');
  for (const re of SECRET_PATTERNS) out = out.replace(re, '[redacted]');
  return out;
}

function maskEmail(email) {
  const m = String(email || '').match(/^([^@]{1,64})@(.+)$/);
  if (!m) return '';
  return `${m[1][0]}${'•'.repeat(Math.max(1, Math.min(m[1].length - 1, 6)))}@${m[2]}`;
}

const ESCALATION_REPLY = {
  refund: 'Refunds are decided by a person, not by me. I have passed your message to Andreas, who runs Posty, and he will reply by email.',
  account_access: 'For your safety, account access is handled by a person, never in chat. I have passed this to Andreas, and he will reply by email to the address on your order.',
  ownership: 'Changes to who owns the domain, transfer codes and unlocking are handled by a person, never in chat, so nobody can take a domain by asking nicely. I have passed this to Andreas, and he will reply by email to the address on your order.',
  contact_change: 'Changes to the contact email or phone on an order are handled by a person, so nobody can take over an address by asking in chat. I have passed this to Andreas, and he will reply by email to the address already on your order.',
  legal_abuse: 'Thanks for telling us. Reports like this are handled by a person. I have passed it to Andreas, and he will reply by email.',
  other: 'I have passed this to Andreas, who runs Posty, and he will reply by email.'
};

function escalationReply(category, { hasOrder, contactEmail } = {}) {
  const base = ESCALATION_REPLY[category] || ESCALATION_REPLY.other;
  if (hasOrder) return base;
  return `${base.replace(/ to the address (already )?on your order/, '')} If you have not written to us before, please send a short note to ${contactEmail || 'hello@posty.club'} so he can reach you.`;
}

module.exports = { triage, looksLikeInjection, redact, maskEmail, escalationReply, ESCALATION_RULES };
