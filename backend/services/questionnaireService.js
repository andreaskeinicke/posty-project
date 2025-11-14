const claudeService = require('./claudeService');

class QuestionnaireService {
  /**
   * Get the questionnaire flow structure
   * @returns {Object} - Questionnaire flow with questions
   */
  getQuestionnaireFlow() {
    return {
      version: '1.0',
      sections: [
        {
          id: 'identity',
          title: 'About You',
          description: 'Tell us about yourself or your business',
          questions: [
            {
              id: 'type',
              type: 'choice',
              question: 'What are you looking for?',
              options: [
                { value: 'personal', label: 'Personal email domain' },
                { value: 'business', label: 'Business email domain' },
                { value: 'professional', label: 'Professional/freelancer domain' },
                { value: 'project', label: 'Project or side hustle domain' }
              ],
              required: true
            },
            {
              id: 'name',
              type: 'text',
              question: 'What\'s your name or business name?',
              placeholder: 'e.g., John Smith or Acme Corp',
              required: true
            },
            {
              id: 'profession',
              type: 'text',
              question: 'What do you do? (profession, industry, or field)',
              placeholder: 'e.g., software developer, photographer, consultant',
              required: true,
              conditional: {
                field: 'type',
                values: ['personal', 'professional', 'business']
              }
            }
          ]
        },
        {
          id: 'identity_deep',
          title: 'Your Unique Identity',
          description: 'Help us understand what makes you unique',
          questions: [
            {
              id: 'values',
              type: 'textarea',
              question: 'What are your core values or what does your business stand for?',
              placeholder: 'e.g., innovation, sustainability, creativity, reliability',
              required: false
            },
            {
              id: 'specialty',
              type: 'text',
              question: 'What\'s your specialty or niche?',
              placeholder: 'e.g., wedding photography, cloud architecture, organic farming',
              required: false
            },
            {
              id: 'keywords',
              type: 'tags',
              question: 'List keywords that represent you or your business',
              placeholder: 'Add keywords (press Enter after each)',
              required: false,
              hint: 'Think about: skills, qualities, services, products'
            }
          ]
        },
        {
          id: 'preferences',
          title: 'Domain Preferences',
          description: 'Your domain name preferences',
          questions: [
            {
              id: 'length',
              type: 'choice',
              question: 'What domain length do you prefer?',
              options: [
                { value: 'short', label: 'Short (5-10 characters) - e.g., acme.co' },
                { value: 'medium', label: 'Medium (11-15 characters) - e.g., acmecorp.com' },
                { value: 'long', label: 'Longer is fine (16+ characters)' },
                { value: 'any', label: 'No preference' }
              ],
              required: true
            },
            {
              id: 'style',
              type: 'multi-choice',
              question: 'What style appeals to you? (Select all that apply)',
              options: [
                { value: 'professional', label: 'Professional & corporate' },
                { value: 'creative', label: 'Creative & playful' },
                { value: 'modern', label: 'Modern & tech-forward' },
                { value: 'traditional', label: 'Traditional & established' },
                { value: 'minimal', label: 'Minimal & clean' }
              ],
              required: false
            },
            {
              id: 'include_name',
              type: 'boolean',
              question: 'Should the domain include your name?',
              required: true
            },
            {
              id: 'tld_preference',
              type: 'multi-choice',
              question: 'Preferred domain extensions (TLDs)?',
              options: [
                { value: 'com', label: '.com - Most popular' },
                { value: 'net', label: '.net - Network/tech' },
                { value: 'io', label: '.io - Tech startups' },
                { value: 'co', label: '.co - Company' },
                { value: 'app', label: '.app - Applications' },
                { value: 'email', label: '.email - Email specific' },
                { value: 'any', label: 'Open to suggestions' }
              ],
              required: true
            }
          ]
        },
        {
          id: 'inspiration',
          title: 'Creative Inspiration',
          description: 'Help us think creatively',
          questions: [
            {
              id: 'brands_admire',
              type: 'text',
              question: 'Name a brand or domain you admire (optional)',
              placeholder: 'e.g., stripe.com, airbnb.com',
              required: false,
              hint: 'This helps us understand your aesthetic preferences'
            },
            {
              id: 'avoid',
              type: 'textarea',
              question: 'Anything to avoid in the domain?',
              placeholder: 'e.g., hyphens, numbers, certain words',
              required: false
            },
            {
              id: 'special_meaning',
              type: 'textarea',
              question: 'Any words, concepts, or meanings that are special to you?',
              placeholder: 'e.g., family heritage, favorite concepts, meaningful places',
              required: false
            }
          ]
        }
      ],
      completion: {
        message: 'Great! I have everything I need to suggest some perfect domains for you.',
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
      }
    };

    return profile;
  }

  /**
   * Generate creative domain suggestions using Claude
   * @param {Object} profile - User profile from questionnaire
   * @returns {Promise<Object>} - Domain suggestions
   */
  async generateSuggestions(profile) {
    try {
      const suggestions = await claudeService.analyzeDomainNeeds(profile);
      return {
        success: true,
        profile: profile,
        suggestions: suggestions
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
