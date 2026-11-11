const express = require('express');
const router = express.Router();
const domainAvailabilityService = require('../services/domainAvailabilityService');
const { candidates, domainsFor, rank, priceOf } = require('../services/addressCandidates');

const SITE = process.env.FRONTEND_URL || 'https://posty.club';
const STYLES = ['all', 'pro', 'short', 'fun', 'family'];

/**
 * GET /api/suggest?name=Maya%20Lindqvist[&style=pro]
 * Public, agent-friendly: returns addresses whose domains are free right now,
 * with yearly domain price and a get_url that opens checkout for that address.
 * Described in frontend/public/openapi.json.
 */
router.get('/', async (req, res) => {
  const name = String(req.query.name || req.query.q || '').trim().slice(0, 60);
  const style = STYLES.includes(req.query.style) ? req.query.style : 'all';
  if (!name) {
    return res.status(400).json({ error: 'Pass your name as ?name=, for example /api/suggest?name=Maya%20Lindqvist' });
  }
  try {
    const cands = candidates(name);
    if (!cands.length) {
      return res.status(400).json({ error: 'The name needs at least one letter (a to z after accents are removed).' });
    }
    const results = await domainAvailabilityService.checkMultipleDomains(domainsFor(cands));
    const availability = {};
    results.forEach(r => {
      if (r && r.domain) availability[r.domain] = { available: r.available === true && r.status !== 'premium', price: r.price };
    });

    // Every free ending of every style, best first, capped at 12.
    const addresses = [];
    rank(cands, availability, style === 'all' ? 'all' : style).forEach(c => {
      c.avail.forEach(tld => {
        const domain = c.base + tld;
        const address = `${c.local}@${domain}`;
        addresses.push({
          address,
          domain,
          style: c.label,
          domain_price_usd_per_year: priceOf(domain, availability),
          get_url: `${SITE}/get?address=${encodeURIComponent(address)}`
        });
      });
    });

    res.set('Cache-Control', 'public, max-age=300');
    res.set('Access-Control-Allow-Origin', '*'); // open to any agent or site
    res.json({
      name,
      checked_at: new Date().toISOString(),
      addresses: addresses.slice(0, 12),
      pricing: {
        posty_usd_per_month: 5,
        google_workspace_usd_per_month_from: 7,
        domain: 'at registrar cost, usually 11 to 25 USD a year'
      },
      note: 'Availability can change at any time. Run the search again right before buying.',
      docs: `${SITE}/agents`
    });
  } catch (error) {
    console.error('Suggest error:', error);
    res.status(502).json({ error: 'Could not check domains right now. Try again in a minute.' });
  }
});

module.exports = router;
