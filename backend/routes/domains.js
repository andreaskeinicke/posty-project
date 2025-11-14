const express = require('express');
const router = express.Router();
const domainController = require('../controllers/domainController');

// POST /api/domains/check - Check domain availability
router.post('/check', domainController.checkAvailability);

// POST /api/domains/bulk-check - Check multiple domains
router.post('/bulk-check', domainController.bulkCheckAvailability);

// GET /api/domains/suggestions - Get domain suggestions based on input
router.get('/suggestions', domainController.getSuggestions);

module.exports = router;
