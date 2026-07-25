const claudeService = require('./claudeService');
const emailGenerator = require('./emailGenerator');
const domainRecommendationEngine = require('./domainRecommendationEngine');
const domainAvailabilityService = require('./domainAvailabilityService');
const aiRecommendationService = require('./aiRecommendationService');
const caseLogService = require('./caseLogService');

// First reveal size: a concierge curates, it doesn't dump the menu
const SHORTLIST_SIZE = 8;
const PER_CATEGORY_LIMIT = 2;

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
  async generateSuggestions(profile, userId = null) {
    try {
      console.log('🎯 Generating email recommendations for:', profile.name);

      // 1. Generate candidates — AI engine first, rule engine as fallback
      let candidates;
      let pitch = '';
      if (aiRecommendationService.isReady()) {
        try {
          const aiResult = await aiRecommendationService.generateCandidates(profile);
          candidates = aiResult.candidates;
          pitch = aiResult.pitch;
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
          confidence: 3,
          pick: false,
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

      // 4. Concierge curation: the pick + top items per category, small first reveal.
      //    If the model's pick turned out taken, it re-picks among available
      //    options with a fresh pitch (never pitch something they can't buy).
      availableDomains.forEach(d => { d.pick = d.pick || false; });
      let pickItem = availableDomains.find(d => d.pick) || null;
      if (!pickItem && availableDomains.length > 0) {
        pitch = '';
        const rePick = await aiRecommendationService.choosePick(profile, availableDomains.slice(0, 12));
        pickItem = rePick
          ? availableDomains.find(d => `${d.prefix}@${d.domain}` === rePick.email.toLowerCase().trim())
          : null;
        if (pickItem) {
          pitch = rePick.pitch;
        } else {
          pickItem = [...availableDomains].sort((a, b) => b.confidence - a.confidence)[0];
        }
        pickItem.pick = true;
      }

      const byCategory = {};
      availableDomains.forEach(d => {
        (byCategory[d.category] = byCategory[d.category] || []).push(d);
      });
      Object.values(byCategory).forEach(list =>
        list.sort((a, b) => (b.pick - a.pick) || (b.confidence - a.confidence))
      );

      const shortlist = [];
      const categoryOrder = Object.keys(byCategory).sort(
        (a, b) => (byCategory[a][0].priority || 9) - (byCategory[b][0].priority || 9)
      );
      for (const cat of categoryOrder) {
        for (const item of byCategory[cat].slice(0, PER_CATEGORY_LIMIT)) {
          if (shortlist.length < SHORTLIST_SIZE || item.pick) shortlist.push(item);
        }
      }
      if (pickItem && !shortlist.includes(pickItem)) shortlist.unshift(pickItem);
      const more = availableDomains.filter(d => !shortlist.includes(d));

      const toSuggestion = d => ({
        email: `${d.prefix}@${d.domain}`,
        domain: d.domain,
        category: d.category,
        priority: d.priority,
        price: d.price,
        available: d.available,
        rating: d.confidence,
        pick: d.pick || false,
        reasoning: d.note,
        pattern: d.pattern || d.domain
      });

      const shownSuggestions = shortlist.map(toSuggestion);

      // 5. Log the case for the learning loop (fire-and-forget, non-blocking)
      const caseId = await caseLogService.logCase({
        promptVersion: aiRecommendationService.promptVersion,
        profile,
        generated: enriched,
        shown: shownSuggestions.map(s => s.email),
        pitch,
        pick: pickItem ? `${pickItem.prefix}@${pickItem.domain}` : null,
        userId
      });

      return {
        success: true,
        profile: profile,
        suggestions: {
          caseId,
          pitch,
          suggestions: shownSuggestions,
          more: more.map(toSuggestion),
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
