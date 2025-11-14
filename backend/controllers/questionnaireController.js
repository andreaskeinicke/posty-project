const questionnaireService = require('../services/questionnaireService');

/**
 * Get questionnaire flow structure
 */
exports.getFlow = async (req, res) => {
  try {
    const flow = questionnaireService.getQuestionnaireFlow();
    res.json(flow);
  } catch (error) {
    console.error('Get flow error:', error);
    res.status(500).json({
      error: 'Failed to get questionnaire flow',
      message: error.message
    });
  }
};

/**
 * Analyze user responses and generate domain suggestions
 */
exports.analyzeResponses = async (req, res) => {
  try {
    const { responses } = req.body;

    if (!responses) {
      return res.status(400).json({
        error: 'Responses object is required'
      });
    }

    // Validate responses
    const validation = questionnaireService.validateResponses(responses);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid or incomplete responses',
        details: validation.errors
      });
    }

    // Analyze responses
    const profile = questionnaireService.analyzeResponses(responses);

    // Generate domain suggestions
    const result = await questionnaireService.generateSuggestions(profile);

    if (result.success) {
      res.json({
        profile: result.profile,
        suggestions: result.suggestions
      });
    } else {
      res.status(500).json({
        error: 'Failed to generate suggestions',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Analyze responses error:', error);
    res.status(500).json({
      error: 'Failed to analyze responses',
      message: error.message
    });
  }
};

/**
 * Get creative suggestions based on entity research
 */
exports.getCreativeSuggestions = async (req, res) => {
  try {
    const { entity, context } = req.body;

    if (!entity) {
      return res.status(400).json({
        error: 'Entity parameter is required'
      });
    }

    const result = await questionnaireService.getCreativeSuggestions(
      entity,
      context || {}
    );

    if (result.success) {
      res.json({
        entity: result.entity,
        suggestions: result.suggestions
      });
    } else {
      res.status(500).json({
        error: 'Failed to get creative suggestions',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Creative suggestions error:', error);
    res.status(500).json({
      error: 'Failed to get creative suggestions',
      message: error.message
    });
  }
};
