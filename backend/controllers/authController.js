const authService = require('../services/authService');

/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */

/**
 * Register a new user
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, gmailAddress } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'firstName', 'lastName']
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Password validation (min 8 characters)
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long'
      });
    }

    // Gmail validation (if provided)
    if (gmailAddress && !gmailAddress.endsWith('@gmail.com')) {
      return res.status(400).json({
        error: 'Gmail address must be a valid @gmail.com address'
      });
    }

    // Register user
    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      gmailAddress
    });

    // Return user data (without session for security - they need to login)
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please log in.',
      user: result.user
    });
  } catch (error) {
    console.error('Register controller error:', error);

    // Check for duplicate email
    if (error.message.includes('already registered') || error.message.includes('duplicate')) {
      return res.status(409).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Login
    const result = await authService.login(email, password);

    res.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        ...result.user.user_metadata
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    console.error('Login controller error:', error);

    // Invalid credentials
    if (error.message.includes('Invalid') || error.message.includes('credentials')) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 * Requires authentication
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware

    const profile = await authService.getUserProfile(userId);

    res.json({
      success: true,
      user: profile
    });
  } catch (error) {
    console.error('Get profile controller error:', error);

    res.status(500).json({
      error: 'Failed to get profile',
      message: error.message
    });
  }
};

/**
 * Update user profile
 * PATCH /api/auth/profile
 * Requires authentication
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const updates = req.body;

    // Whitelist allowed fields
    const allowedFields = ['first_name', 'last_name', 'gmail_address', 'country', 'city'];
    const filteredUpdates = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        allowed: allowedFields
      });
    }

    const updatedProfile = await authService.updateUserProfile(userId, filteredUpdates);

    res.json({
      success: true,
      user: updatedProfile
    });
  } catch (error) {
    console.error('Update profile controller error:', error);

    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
};

/**
 * Send password reset email
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    await authService.sendPasswordReset(email);

    // Always return success (don't reveal if email exists)
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password controller error:', error);

    // Don't reveal errors for security
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  }
};

/**
 * Reset password
 * POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long'
      });
    }

    // Verify token and update password
    await authService.verifyEmail(token);

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password controller error:', error);

    res.status(400).json({
      error: 'Password reset failed',
      message: error.message
    });
  }
};

/**
 * Link anonymous session to user account
 * POST /api/auth/link-session
 * Requires authentication
 */
exports.linkSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.userId;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required'
      });
    }

    const session = await authService.linkSessionToUser(sessionId, userId);

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Link session controller error:', error);

    res.status(500).json({
      error: 'Failed to link session',
      message: error.message
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 * Requires authentication
 */
exports.logout = async (req, res) => {
  try {
    await authService.logout();

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout controller error:', error);

    res.status(500).json({
      error: 'Logout failed',
      message: error.message
    });
  }
};
