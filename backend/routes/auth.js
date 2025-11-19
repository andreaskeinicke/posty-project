const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { supabaseAuth } = require('../middleware/supabaseAuth');

/**
 * Authentication Routes
 * Base path: /api/auth
 */

// Public routes (no authentication required)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes (require authentication)
router.get('/me', supabaseAuth, authController.getProfile);
router.patch('/profile', supabaseAuth, authController.updateProfile);
router.post('/link-session', supabaseAuth, authController.linkSession);
router.post('/logout', supabaseAuth, authController.logout);

module.exports = router;
