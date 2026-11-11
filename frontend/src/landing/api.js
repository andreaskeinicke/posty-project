import axios from 'axios';

// Real backend adapter for the landing page.
// Availability uses the RDAP-backed bulk check (max 20 domains per request).
export const landingApi = {
  demo: false,
  async checkDomains(domains) {
    const chunks = [];
    for (let i = 0; i < domains.length; i += 20) chunks.push(domains.slice(i, i + 20));
    const replies = await Promise.all(chunks.map(c => axios.post('/api/domains/bulk-check', { domains: c })));
    const out = {};
    replies.forEach(r => (r.data.results || []).forEach(x => {
      out[x.domain] = { available: x.available === true && x.status !== 'premium', price: x.price };
    }));
    return out;
  },
  async startCheckout({ address, domain, price, plan, firstName, lastName, contactEmail, country }) {
    const r = await axios.post('/api/checkout/create-session', {
      domainName: domain, domainPrice: price, address, workspacePlan: plan, firstName, lastName, contactEmail, country
    });
    if (!r.data || !r.data.url) throw new Error('No checkout URL');
    return { url: r.data.url };
  }
};
