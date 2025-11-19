const { verifyToken } = require('../config/supabase');

/**
 * Supabase JWT Authentication Middleware
 *
 * Validates JWT token from Authorization header
 * and attaches user to req.user
 *
 * Usage:
 *   app.get('/api/protected', supabaseAuth, (req, res) => {
 *     console.log(req.user); // { id, email, ... }
 *   });
 */
async function supabaseAuth(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'No authorization header provided',
        code: 'NO_AUTH_HEADER'
      });
    }

    // Extract Bearer token
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Invalid authorization header format. Expected: Bearer <token>',
        code: 'INVALID_AUTH_FORMAT'
      });
    }

    const token = parts[1];

    // Verify token with Supabase
    const user = await verifyToken(token);

    // Attach user to request
    req.user = user;
    req.userId = user.id; // Convenience

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);

    return res.status(401).json({
      error: 'Authentication failed',
      message: error.message,
      code: 'AUTH_FAILED'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 *
 * Useful for endpoints that work for both authenticated and anonymous users
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      req.user = null;
      req.userId = null;
      return next();
    }

    const parts = authHeader.split(' ');

    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const user = await verifyToken(token);

      req.user = user;
      req.userId = user.id;
    }

    next();
  } catch (error) {
    // Don't fail, just continue without user
    req.user = null;
    req.userId = null;
    next();
  }
}

module.exports = {
  supabaseAuth,
  optionalAuth
};
