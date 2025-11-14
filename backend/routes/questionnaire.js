const express = require('express');
const router = express.Router();
const questionnaireController = require('../controllers/questionnaireController');

// GET /api/questionnaire/flow - Get questionnaire flow structure
router.get('/flow', questionnaireController.getFlow);

// POST /api/questionnaire/analyze - Analyze user responses
router.post('/analyze', questionnaireController.analyzeResponses);

// POST /api/questionnaire/suggest - Get creative suggestions based on entity research
router.post('/suggest', questionnaireController.getCreativeSuggestions);

module.exports = router;
