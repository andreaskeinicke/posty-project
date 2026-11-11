/**
 * Build the registrant contact from what Stripe Checkout collected, so the customer is the
 * owner on record (part of Posty's trust promise). Cloudflare wants phone as +CC.NUMBER.
 */
const CALLING_CODES = {
  DK: '45', SE: '46', NO: '47', FI: '358', IS: '354', DE: '49', NL: '31', BE: '32', FR: '33',
  ES: '34', PT: '351', IT: '39', AT: '43', CH: '41', IE: '353', GB: '44', PL: '48', CZ: '420',
  US: '1', CA: '1', AU: '61', NZ: '64'
};

function formatPhone(e164, country) {
  if (!e164) return null;
  const digits = String(e164).replace(/[^\d+]/g, '');
  if (!digits.startsWith('+')) return null;
  const rest = digits.slice(1);
  // Prefer the billing country's code; otherwise try every known code, longest first.
  const candidates = [CALLING_CODES[country], ...Object.values(CALLING_CODES).sort((a, b) => b.length - a.length)]
    .filter(Boolean);
  const cc = candidates.find(c => rest.startsWith(c) && rest.length - c.length >= 4);
  return cc ? `+${cc}.${rest.slice(cc.length)}` : null;
}

/**
 * @returns {{ contact: object|null, missing: string[] }}
 */
function contactFromStripe(details) {
  const missing = [];
  const addr = details?.address || {};
  const phone = formatPhone(details?.phone, addr.country);
  if (!details?.name) missing.push('name');
  if (!details?.email) missing.push('email');
  if (!phone) missing.push('phone');
  if (!addr.line1) missing.push('address.line1');
  if (!addr.city) missing.push('address.city');
  if (!addr.postal_code) missing.push('address.postal_code');
  if (!addr.country) missing.push('address.country');
  if (missing.length) return { contact: null, missing };
  return {
    missing,
    contact: {
      email: details.email,
      phone,
      postal_info: {
        name: details.name,
        address: {
          street: [addr.line1, addr.line2].filter(Boolean).join(', '),
          city: addr.city,
          state: addr.state || '',
          postal_code: addr.postal_code,
          country_code: addr.country
        }
      }
    }
  };
}

module.exports = { contactFromStripe, formatPhone };
