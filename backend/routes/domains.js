const express = require('express');
const router = express.Router();
const domainController = require('../controllers/domainController');

// POST /api/domains/check - Check domain availability
router.post('/check', domainController.checkAvailability);

// POST /api/domains/bulk-check - Check multiple domains
router.post('/bulk-check', domainController.bulkCheckAvailability);

// GET /api/domains/cache-stats - Get cache statistics
router.get('/cache-stats', domainController.getCacheStats);

// POST /api/domains/clear-cache - Clear the domain cache
router.post('/clear-cache', domainController.clearCache);

module.exports = router;
