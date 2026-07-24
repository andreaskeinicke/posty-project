const claudeService = require('./claudeService');
const emailGenerator = require('./emailGenerator');
const domainRecommendationEngine = require('./domainRecommendationEngine');
const domainAvailabilityService = require('./domainAvailabilityService');
const aiRecommendationService = require('./aiRecommendationService');

class QuestionnaireService {
  /**
   * Get the questionnaire flow structure
   * @returns {Object} - Questionnaire flow with questions
   */
  getQuestionnaireFlow() {
    return {
      version: '2.0',
      sections: [
        {
          id: 'basics',
          title: 'Let\'s Find Your Perfect Email',
          description: 'Just a few quick questions',
          questions: [
            {
              id: 'name',
              type: 'text',
              question: 'What\'s your full name?',
              placeholder: 'e.g., Andreas Keinicke',
              required: true
            },
            {
              id: 'tld_preference',
              type: 'multi-choice',
              question: 'Which domain extensions do you prefer?',
              options: [
                { value: 'com', label: '.com' },
                { value: 'io', label: '.io' },
                { value: 'co', label: '.co' },
                { value: 'email', label: '.email' },
                { value: 'me', label: '.me' }
              ],
              required: true
            }
          ]
        }
      ],
      completion: {
        message: 'Perfect! Let\'s find your available email addresses.',
        action: 'generate_suggestions'
      }
    };
  }

  /**
   * Analyze user responses and extract key information
   * @param {Object} responses - User's questionnaire responses
   * @returns {Object} - Analyzed profile
   */
  analyzeResponses(responses) {
    const profile = {
      type: responses.type || 'personal',
      name: responses.name || '',
      profession: responses.profession || '',
      values: responses.values || '',
      specialty: responses.specialty || '',
      keywords: responses.keywords || [],
      preferences: {
        length: responses.length || 'any',
        style: responses.style || [],
        includeName: responses.include_name !== false,
        tlds: responses.tld_preference || ['com', 'net', 'io']
      },
      inspiration: {
        admireBrands: responses.brands_admire || '',
        avoid: responses.avoid || '',
        specialMeaning: responses.special_meaning || ''
      },
      // Preserve _metadata from frontend for recommendation engine
      _metadata: responses._metadata || {}
    };

    // If _metadata exists, ensure TLDs are in the right format for the engine
    if (profile._metadata) {
      // Use TLDs from preferences if not in _metadata
      if (!profile._metadata.tlds || profile._metadata.tlds.length === 0) {
        profile._metadata.tlds = profile.preferences.tlds.map(tld =>
          tld.startsWith('.') ? tld : `.${tld}`
        );
      } else {
        // Convert TLDs to have dots: ['dk', 'eu'] -> ['.dk', '.eu']
        profile._metadata.tlds = profile._metadata.tlds.map(tld =>
          tld.startsWith('.') ? tld : `.${tld}`
        );
      }
    }

    return profile;
  }

  /**
   * Generate email suggestions using 10-category recommendation engine
   * @param {Object} profile - User profile from questionnaire
   * @returns {Promise<Object>} - Email suggestions with availability
   */
  async generateSuggestions(profile) {
    try {
      console.log('🎯 Generating email recommendations for:', profile.name);

      // 1. Generate candidates — AI engine first, rule engine as fallback
      let candidates;
      if (aiRecommendationService.isReady()) {
        try {
          candidates = await aiRecommendationService.generateCandidates(profile);
        } catch (aiError) {
          console.error('AI engine failed, falling back to rule engine:', aiError.message);
        }
      }
      if (!candidates || candidates.length === 0) {
        const firstName = (profile.name || 'you').split(' ')[0].toLowerCase();
        candidates = domainRecommendationEngine.generateRecommendations(profile).map(d => ({
          domain: d.domain,
          prefix: firstName,
          category: d.category,
          priority: d.priority,
          note: d.description
        }));
        console.log(`📧 Rule engine generated ${candidates.length} candidates`);
      }

      // 2. Check availability for all unique domains in parallel
      const domainsToCheck = [...new Set(candidates.map(c => c.domain))];
      console.log(`🔍 Checking availability for ${domainsToCheck.length} domains...`);
      const availabilityResults = await domainAvailabilityService.checkMultipleDomains(domainsToCheck);

      const domainMap = {};
      availabilityResults.forEach(d => {
        domainMap[d.domain] = d;
      });

      // 3. Merge and split available / unavailable
      const enriched = candidates.map(c => ({
        ...c,
        available: domainMap[c.domain]?.available || false,
        price: domainMap[c.domain]?.price || 0
      }));
      const availableDomains = enriched.filter(d => d.available);
      const unavailableDomains = enriched.filter(d => !d.available);

      console.log(`🎉 Found ${availableDomains.length} available domains`);

      // 4. Group by category for structured response
      const grouped = {};
      availableDomains.forEach(d => {
        (grouped[d.category] = grouped[d.category] || []).push(d);
      });

      return {
        success: true,
        profile: profile,
        suggestions: {
          suggestions: availableDomains.map(d => ({
            email: `${d.prefix}@${d.domain}`,
            domain: d.domain,
            category: d.category,
            priority: d.priority,
            price: d.price,
            available: d.available,
            rating: 5 - d.priority,
            reasoning: d.note,
            pattern: d.pattern || d.domain
          })),
          grouped: grouped,
          total: availableDomains.length,
          unavailable: unavailableDomains.length
        }
      };
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get creative suggestions based on entity research
   * @param {string} entity - Entity to research (person, company, concept)
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Creative suggestions
   */
  async getCreativeSuggestions(entity, context = {}) {
    try {
      const result = await claudeService.getCreativeSuggestions(entity, context);
      return {
        success: true,
        entity: entity,
        suggestions: result
      };
    } catch (error) {
      console.error('Error getting creative suggestions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate questionnaire responses
   * @param {Object} responses - User responses
   * @returns {Object} - Validation result
   */
  validateResponses(responses) {
    const errors = [];
    const flow = this.getQuestionnaireFlow();

    // Check required fields
    flow.sections.forEach(section => {
      section.questions.forEach(question => {
        if (question.required && !responses[question.id]) {
          // Check conditional requirements
          if (question.conditional) {
            const conditionMet = question.conditional.values.includes(
              responses[question.conditional.field]
            );
            if (conditionMet) {
              errors.push({
                field: question.id,
                message: `${question.question} is required`
              });
            }
          } else {
            errors.push({
              field: question.id,
              message: `${question.question} is required`
            });
          }
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get next question based on current responses
   * @param {Object} responses - Current responses
   * @returns {Object} - Next question or completion status
   */
  getNextQuestion(responses) {
    const flow = this.getQuestionnaireFlow();

    for (const section of flow.sections) {
      for (const question of section.questions) {
        // Check if question is already answered
        if (responses[question.id]) {
          continue;
        }

        // Check conditional logic
        if (question.conditional) {
          const conditionMet = question.conditional.values.includes(
            responses[question.conditional.field]
          );
          if (!conditionMet) {
            continue;
          }
        }

        // This is the next unanswered question
        return {
          completed: false,
          section: section,
          question: question
        };
      }
    }

    // All questions answered
    return {
      completed: true,
      message: flow.completion.message,
      action: flow.completion.action
    };
  }
}

module.exports = new QuestionnaireService();
