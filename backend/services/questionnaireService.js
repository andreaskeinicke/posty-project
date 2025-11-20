const claudeService = require('./claudeService');
const emailGenerator = require('./emailGenerator');
const domainRecommendationEngine = require('./domainRecommendationEngine');
const domainService = require('./domainService');

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
      console.log('🎯 Generating 10-category domain recommendations for:', profile.name);
      console.log('📦 Profile data:', JSON.stringify(profile, null, 2));

      // 1. Generate domains across all 10 categories
      const allDomains = domainRecommendationEngine.generateRecommendations(profile);

      console.log(`📧 Generated ${allDomains.length} domain suggestions across categories`);

      // 2. Extract unique domains to check
      const domainsToCheck = [...new Set(allDomains.map(d => d.domain))];

      // 3. Check availability for ALL domains via Cloudflare
      console.log(`🔍 Checking availability for ${domainsToCheck.length} domains...`);

      const availabilityResults = await Promise.all(
        domainsToCheck.map(async (domainName) => {
          try {
            const result = await domainService.checkAvailability(domainName);
            return result;
          } catch (error) {
            console.error(`Error checking ${domainName}:`, error.message);
            return { domain: domainName, available: false, price: 0 };
          }
        })
      );

      console.log(`✅ Checked ${availabilityResults.length} domains`);

      // 4. Merge availability data with domain suggestions
      const domainMap = {};
      availabilityResults.forEach(d => {
        domainMap[d.domain] = d;
      });

      const enrichedDomains = allDomains.map(domain => ({
        ...domain,
        available: domainMap[domain.domain]?.available || false,
        price: domainMap[domain.domain]?.price || 0
      }));

      // 5. Separate available and unavailable
      const availableDomains = enrichedDomains.filter(d => d.available);
      const unavailableDomains = enrichedDomains.filter(d => !d.available);

      console.log(`🎉 Found ${availableDomains.length} available domains`);

      // 6. Group by category for structured response
      const grouped = domainRecommendationEngine.groupByCategory(availableDomains);

      return {
        success: true,
        profile: profile,
        suggestions: {
          suggestions: availableDomains.map(domain => ({
            email: `${profile.name.split(' ')[0].toLowerCase()}@${domain.domain}`,
            domain: domain.domain,
            category: domain.category,
            priority: domain.priority,
            price: domain.price,
            available: domain.available,
            rating: 5 - domain.priority, // Higher priority = higher rating
            reasoning: domain.description,
            pattern: domain.pattern || domain.domain // Include pattern for frontend
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
