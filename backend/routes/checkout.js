const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { supabaseAuth } = require('../middleware/supabaseAuth');

// Create session - auth optional (will handle guest checkout)
router.post('/create-session', checkoutController.createCheckoutSession);
router.get('/session/:sessionId', supabaseAuth, checkoutController.getCheckoutSession);
router.get('/success', checkoutController.checkoutSuccess);

// Webhook route - no auth (Stripe signs the request)
// IMPORTANT: This route needs raw body, so it should be registered with express.raw() middleware in server.js
router.post('/webhook', checkoutController.handleWebhook);

module.exports = router;
