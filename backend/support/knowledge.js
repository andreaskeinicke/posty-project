/**
 * Help content the support agent is grounded in.
 * The FAQ is the same file the Questions page renders (frontend/src/landing/faq.json), so a
 * copy fix on the site is a fix for the agent too. SETUP_ARTICLES covers the setup questions
 * the FAQ does not (Google verification, DKIM, DNS timing, spam folder).
 */
const FAQ = require('../../frontend/src/landing/faq.json');

const SETUP_ARTICLES = [
  ['Setup', 'Where do I find the Google verification code?',
    'After you start Google Workspace signup on your new domain, Google asks you to verify that you own it. Choose the option to add a TXT record and copy the whole value, which starts with google-site-verification=. Paste it on your Moving in page and we add the record for you. You never need to log in to a DNS provider.'],
  ['Setup', 'How long does setup take after I paste the code?',
    'Usually a few minutes. DNS changes can take up to an hour to show everywhere, and in rare cases up to 48 hours. Your Moving in page updates on its own, and we email you when the inbox is ready.'],
  ['Setup', 'Google says it cannot verify my domain yet.',
    'That normally means the record is still spreading through DNS. Wait 10 to 15 minutes and press Verify in Google again. If your Moving in page shows the records as connected and Google still refuses after an hour, ask us and we check the records for you.'],
  ['Setup', 'What is DKIM and do I need it?',
    'DKIM signs the mail you send so other providers trust it and it does not land in spam. Google shows a DKIM record in the Admin console under Apps, Google Workspace, Gmail, Authenticate email, about a day after signup. Paste it on your Moving in page and we add it.'],
  ['Setup', 'My mail goes to spam or does not arrive.',
    'First check that setup is finished on your Moving in page. Mail can be marked as spam for the first days on a new domain. Adding DKIM helps a lot. Ask us to check your setup and we look at your MX, SPF, DKIM and DMARC records.'],
  ['Setup', 'I did not get the confirmation email for forwarding.',
    'Look in the spam folder of the inbox you forward to, and search for Cloudflare. The link in it confirms that the address can receive forwarded mail. If it is not there after 10 minutes, ask us to resend it.'],
  ['Account', 'I lost access or want to change who owns the domain.',
    'For your safety, changes to ownership, the contact email, transfer codes or account access are handled by a person, never in chat. We reply by email to the address on your order.'],
  ['Billing', 'I want a refund.',
    'Small orders (up to $10) that we have not registered a domain for yet can be refunded right away: ask for a refund in the chat on your order page. Everything else is handled by a person, who replies by email. Once a domain is registered it cannot be returned to the registry, but you keep it either way.']
];

/** Flat list of { group, q, a } used for search and for the agent's system prompt. */
function allArticles() {
  const faq = FAQ.flatMap(([group, , , items]) => items.map(([q, a]) => ({ group, q, a })));
  return [...faq, ...SETUP_ARTICLES.map(([group, q, a]) => ({ group, q, a }))];
}

const STOP = new Set(['i', 'a', 'an', 'the', 'my', 'me', 'is', 'it', 'to', 'do', 'does', 'can', 'how', 'what', 'and', 'or', 'of', 'in', 'on', 'for', 'with', 'you', 'your', 'we', 'be', 'if', 'at', 'not', 'get', 'this', 'that']);
const words = s => String(s).toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)
  .filter(w => w.length > 1 && !STOP.has(w));

/** Plain keyword search. Questions weigh double; light prefix matching handles plurals. */
function searchHelp(query, limit = 3) {
  const q = words(query);
  if (!q.length) return [];
  return allArticles()
    .map(art => {
      const tq = words(art.q);
      const ta = words(art.a);
      const hit = (list, w) => list.some(t => t === w || (w.length > 3 && (t.startsWith(w) || w.startsWith(t)) && Math.min(t.length, w.length) > 3));
      let score = q.reduce((s, w) => s + (hit(tq, w) ? 2 : 0) + (hit(ta, w) ? 1 : 0), 0);
      // Word pairs in the same order as the question break ties ("own the domain").
      for (let i = 1; i < q.length; i++) {
        const j = tq.indexOf(q[i - 1]);
        if (j >= 0 && tq[j + 1] === q[i]) score += 1;
      }
      return { ...art, score };
    })
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function knowledgeText() {
  return allArticles().map(a => `[${a.group}] Q: ${a.q}\nA: ${a.a}`).join('\n\n');
}

module.exports = { allArticles, searchHelp, knowledgeText, SETUP_ARTICLES };
