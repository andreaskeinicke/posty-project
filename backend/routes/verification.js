const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { supabaseAuth } = require('../middleware/supabaseAuth');

/**
 * Email Verification Routes
 */

// Public route - verify email via token link
// GET /api/verification/verify-email?token=xxx&domain=example.com
router.get('/verify-email', verificationController.verifyEmail);

// Protected routes (require authentication)
// POST /api/verification/resend
router.post('/resend', supabaseAuth, verificationController.resendVerification);

// GET /api/verification/status/:domainName
router.get('/status/:domainName', supabaseAuth, verificationController.getVerificationStatus);

module.exports = router;
