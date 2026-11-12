const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ override: true }); // Force override environment variables

const app = express();

// Behind Railway/Cloudflare proxy: trust X-Forwarded-* so rate limiting sees real IPs
app.set('trust proxy', 1);

// Security middleware (CSP off: CRA inline runtime chunks would be blocked)
app.use(helmet({ contentSecurityPolicy: false }));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Stripe webhook route needs raw body
// Must be registered BEFORE express.json()
app.use('/api/checkout/webhook', express.raw({ type: 'application/json' }));

// Body parser for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/domains', require('./routes/domains'));
app.use('/api/questionnaire', require('./routes/questionnaire'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/verification', require('./routes/verification'));
app.use('/api/fulfilment', require('./routes/fulfilment'));
app.use('/api/suggest', require('./routes/suggest'));
app.use('/api/support', require('./routes/support'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Posty API' });
});

// Deep health check: database reachable and domain lookups answering.
// Called daily by .github/workflows/health-check.yml, which also keeps the
// Supabase project from being paused for inactivity.
app.get('/health/deep', async (req, res) => {
  const checks = {};
  try {
    const { supabaseAdmin } = require('./config/supabase');
    const { error } = await supabaseAdmin
      .from('recommendation_cases')
      .select('id', { count: 'exact', head: true });
    if (error) console.error('Health check database error:', error.message);
    checks.database = error ? 'error' : 'ok';
  } catch (error) {
    console.error('Health check database error:', error.message);
    checks.database = 'error';
  }
  try {
    const availability = require('./services/domainAvailabilityService');
    const bootstrap = await availability._rdapBootstrap();
    checks.lookups = bootstrap.size > 0 ? 'ok' : 'error';
  } catch (error) {
    console.error('Health check lookup error:', error.message);
    checks.lookups = 'error';
  }
  const healthy = Object.values(checks).every(value => value === 'ok');
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', checks });
});

// Serve the built frontend (single-host deploy: same origin as the API).
// index.html must never be cached or users keep the old bundle after deploys;
// hashed static assets can cache forever.
const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(frontendBuild, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (/\.(js|css|png|svg|woff2?)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));
app.get(/^\/(?!api\/|health).*/, (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(frontendBuild, 'index.html'), err => {
    if (err) next(); // no build present (local API-only dev) → fall through to 404
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Posty API server running on port ${PORT}`);
  console.log(`📧 Environment: ${process.env.NODE_ENV || 'development'}`);
  // Automated setup after payment; no-op unless FULFILMENT_ENABLED=true
  require('./fulfilment').startRunner();
});

module.exports = app;
