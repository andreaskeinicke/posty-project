const claudeService = require('./claudeService');
const emailGenerator = require('./emailGenerator');
const classicLadderService = require('./classicLadderService');
const domainAvailabilityService = require('./domainAvailabilityService');
const aiRecommendationService = require('./aiRecommendationService');
const caseLogService = require('./caseLogService');

// First reveal size: a concierge curates, it doesn't dump the menu
const SHORTLIST_SIZE = 8;

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
   * v3 concierge pipeline: instant classic name-pattern ladder (code) →
   * availability check → one fast AI call for pick + pitch + creative extras.
   * See docs/CONCIERGE_DIRECTION.md.
   */
  async generateSuggestions(profile, userId = null) {
    try {
      const t0 = Date.now();
      console.log('🎯 v3 round for:', profile.name);

      // 1. Classic ladder — deterministic, instant, real name parts only
      const ladder = classicLadderService.generate(profile);
      console.log(`🪜 Ladder: ${ladder.length} classic candidates`);

      // 2. Availability for the ladder (fast, parallel)
      const ladderResults = await domainAvailabilityService.checkMultipleDomains(
        [...new Set(ladder.map(c => c.domain))], 12
      );
      const domainMap = {};
      ladderResults.forEach(d => { domainMap[d.domain] = d; });

      const enrich = c => ({
        ...c,
        available: domainMap[c.domain]?.available || false,
        price: domainMap[c.domain]?.price || 0
      });
      let enriched = ladder.map(enrich);
      let availableDomains = enriched.filter(d => d.available);
      console.log(`✅ Ladder available: ${availableDomains.length} (${Date.now() - t0}ms)`);

      // 3. One fast AI call: pick + pitch among confirmed-available, plus extras
      let pitch = '';
      let pickItem = null;
      if (aiRecommendationService.isReady()) {
        try {
          const ai = await aiRecommendationService.finishRound(profile, availableDomains.slice(0, 15));
          pitch = ai.pitch;
          if (ai.pickEmail) {
            pickItem = availableDomains.find(d => `${d.prefix}@${d.domain}` === ai.pickEmail) || null;
          }
          // Check the creative extras' availability (small batch, fast)
          if (ai.extras.length > 0) {
            const extraResults = await domainAvailabilityService.checkMultipleDomains(
              [...new Set(ai.extras.map(c => c.domain))], 12
            );
            extraResults.forEach(d => { domainMap[d.domain] = d; });
            const availableExtras = ai.extras.map(enrich).filter(d => d.available);
            enriched = enriched.concat(ai.extras.map(enrich));
            availableDomains = availableDomains.concat(availableExtras);
          }
          console.log(`🤖 AI pick+extras done (${Date.now() - t0}ms, prompt ${aiRecommendationService.promptVersion})`);
        } catch (aiError) {
          console.error('AI finishing call failed (ladder still serves):', aiError.message);
        }
      }
      if (!pickItem && availableDomains.length > 0) {
        // No AI or its pick was invalid: highest-rung classic wins, no pitch
        pitch = pitch || '';
        pickItem = [...availableDomains].sort(
          (a, b) => (a.priority - b.priority) || (b.confidence - a.confidence)
        )[0];
      }
      availableDomains.forEach(d => { d.pick = d === pickItem; });

      const unavailableDomains = enriched.filter(d => !d.available);

      // 4. Curation: pick first, then classics by rung, then creative tail
      const sorted = [...availableDomains].sort(
        (a, b) => (b.pick - a.pick) || (a.priority - b.priority) || (b.confidence - a.confidence)
      );
      const classics = sorted.filter(d => d.category === 'classic');
      const creative = sorted.filter(d => d.category === 'creative');
      const shortlist = [...classics.slice(0, SHORTLIST_SIZE - 2), ...creative.slice(0, 2)]
        .sort((a, b) => (b.pick - a.pick) || (a.priority - b.priority));
      if (pickItem && !shortlist.includes(pickItem)) shortlist.unshift(pickItem);
      const more = availableDomains.filter(d => !shortlist.includes(d));
      console.log(`🎉 Round complete: ${shortlist.length} shown, ${more.length} more (${Date.now() - t0}ms)`);

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
