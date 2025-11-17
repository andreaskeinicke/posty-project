const domainAvailabilityService = require('./domainAvailabilityService');

/**
 * Mock Claude Service for testing without API calls
 * Simulates the Posty questionnaire flow
 */

class MockClaudeService {
  constructor() {
    // Session storage for user data across conversation
    this.sessions = new Map();

    this.responses = {
      // Stage 1: Welcome & Name
      welcome: [
        "Hi! I'm here to help you find the perfect email domain. What's your full name?"
      ],
      // Stage 2: Location
      location: [
        "Nice to meet you, {name}! Where are you based?",
        "Perfect! What country and city are you in?"
      ],
      // Stage 3: Profession
      profession: [
        "Got it. What do you do professionally? (You can mention several occupations or positions if relevant)"
      ],
      // Stage 4: Interests (Creative Freedom)
      interests: [
        "This is optional, but it helps me get creative: What are you interested in? (Or say 'skip')"
      ],
      // Stage 5: Recommendations generated
      review: [
        "Do any of these feel just right? Or would you like me to explore some different directions?",
        "What do you think? See anything you like, or should we try a different approach?"
      ],
      default: [
        "I'm here to help! Let me know if you'd like to see more options or if any of those caught your eye."
      ]
    };
  }

  /**
   * Get or create session data
   */
  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        stage: 1,
        data: {}
      });
    }
    return this.sessions.get(sessionId);
  }

  /**
   * Normalize special characters for domain names
   */
  normalizeName(name) {
    const charMappings = {
      // Scandinavian
      'ø': 'o', 'ö': 'o', 'å': 'aa', 'æ': 'ae',
      // German
      'ü': 'ue', 'ä': 'ae', 'ß': 'ss',
      // French
      'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a', 'â': 'a', 'ç': 'c',
      // Spanish
      'ñ': 'n', 'á': 'a', 'í': 'i', 'ó': 'o', 'ú': 'u'
    };

    let normalized = name.toLowerCase();
    for (const [special, replacement] of Object.entries(charMappings)) {
      normalized = normalized.replace(new RegExp(special, 'g'), replacement);
    }

    return normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Simulate sending a message to Claude - 5 STAGE FLOW
   */
  async sendMessage(messages, options = {}) {
    await this.delay(500);

    const sessionId = options.sessionId || 'default';
    const session = this.getSession(sessionId);
    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage.content;
    const userMessageLower = userMessage.toLowerCase();

    let responseText = '';
    let responseOptions = null;

    // STAGE 1: Full Name Collection
    if (session.stage === 1) {
      const fullName = this.extractName(userMessage);
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0];
      const middleName = nameParts.length > 2 ? nameParts[1] : '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      // Normalize for domains
      const normalizedFirst = this.normalizeName(firstName);
      const normalizedMiddle = this.normalizeName(middleName);
      const normalizedLast = this.normalizeName(lastName);

      // Generate handles
      const handles = [];
      if (middleName) {
        // Initials (3 chars): akg
        handles.push(normalizedFirst[0] + normalizedMiddle[0] + normalizedLast[0]);
        // 2+2+2 (6 chars): ankegu
        handles.push(normalizedFirst.slice(0, 2) + normalizedMiddle.slice(0, 2) + normalizedLast.slice(0, 2));
        // First + last initial (5-9 chars): andreasg
        handles.push(normalizedFirst + normalizedLast[0]);
      } else if (lastName) {
        // Initials (2 chars): ag
        handles.push(normalizedFirst[0] + normalizedLast[0]);
        // 2+2 (4 chars): angu
        handles.push(normalizedFirst.slice(0, 2) + normalizedLast.slice(0, 2));
        // First + last initial: andreasg
        handles.push(normalizedFirst + normalizedLast[0]);
      }

      session.data.fullName = fullName;
      session.data.firstName = firstName;
      session.data.middleName = middleName;
      session.data.lastName = lastName;
      session.data.normalizedFirst = normalizedFirst;
      session.data.normalizedMiddle = normalizedMiddle;
      session.data.normalizedLast = normalizedLast;
      session.data.handles = handles;
      session.data.preferredName = normalizedFirst; // Default to first name

      session.stage = 2;
      responseText = this.getRandomResponse('location').replace('{name}', firstName);
    }
    // STAGE 2: Location
    else if (session.stage === 2) {
      const location = userMessage;
      const cityMatch = location.match(/([^,]+)/);
      const city = cityMatch ? cityMatch[1].trim() : location;

      session.data.location = location;
      session.data.city = city;
      session.data.cityAbbr = this.getCityAbbreviation(city.toLowerCase());

      session.stage = 3;
      responseText = this.getRandomResponse('profession');
    }
    // STAGE 3: Profession (ALWAYS asked)
    else if (session.stage === 3) {
      session.data.professions = this.extractProfessions(userMessage);
      session.stage = 4;
      responseText = this.getRandomResponse('interests');
    }
    // STAGE 4: Creative Freedom / Interests
    else if (session.stage === 4) {
      if (userMessageLower.includes('skip') || userMessageLower.includes('none')) {
        session.data.interests = [];
      } else {
        session.data.interests = this.extractInterests(userMessage);
      }

      session.stage = 5;
      // STAGE 5: Generate recommendations
      responseText = await this.generateDomainSuggestions(session.data);
    }
    // STAGE 5+: Post-recommendation conversation
    else {
      if (this.isAskingForMore(userMessageLower)) {
        responseText = this.generateMoreOptions(session.data, userMessageLower);
      } else if (this.isSelectingDomain(userMessageLower)) {
        const domain = this.extractDomain(userMessageLower);
        responseText = `Love it! ${domain} is a great choice.\n\nI've noted that down. Ready to set up your custom email with ${domain}?`;
      } else {
        responseText = this.getRandomResponse('default');
      }
    }

    return {
      success: true,
      message: responseText,
      options: responseOptions,
      usage: {
        input_tokens: 100,
        output_tokens: 50
      }
    };
  }

  /**
   * Generate domain suggestions based on collected session data
   * Implements 10-category recommendation engine
   */
  async generateDomainSuggestions(sessionData) {
    // Extract data from session
    const preferredName = sessionData.preferredName || sessionData.normalizedFirst;
    const firstName = sessionData.normalizedFirst || '';
    const lastName = sessionData.normalizedLast || '';
    const middleName = sessionData.normalizedMiddle || '';
    const handles = sessionData.handles || [];
    const cityAbbr = sessionData.cityAbbr || null;
    const professions = sessionData.professions || [];
    const interests = sessionData.interests || [];
    const useCase = sessionData.useCase || '';

    // All TLDs to use
    const allTlds = ['.dk', '.eu', '.io', '.me', '.com'];
    const locationTlds = ['.dk', '.eu', '.me'];
    const techTlds = ['.io', '.com'];

    // Collect all domains to check
    const domainsToCheck = [];

    // Category 1: Your Name (highest priority)
    // NOTE: We generate domains for checking, but will use VARIED email prefixes in display

    // Full first name
    allTlds.forEach(tld => {
      if ((firstName + tld).length <= 15) {
        domainsToCheck.push(`${firstName}${tld}`);
      }
    });

    // Last name (for varied prefixes)
    if (lastName) {
      allTlds.forEach(tld => {
        if ((lastName + tld).length <= 15) {
          domainsToCheck.push(`${lastName}${tld}`);
        }
      });
    }

    // Middle name (for varied prefixes)
    if (middleName) {
      ['.dk', '.io', '.me'].forEach(tld => {
        if ((middleName + tld).length <= 15) {
          domainsToCheck.push(`${middleName}${tld}`);
        }
      });
    }

    // Full name combinations
    if (lastName) {
      ['.dk', '.eu', '.io'].forEach(tld => {
        if ((firstName + lastName + tld).length <= 20) {
          domainsToCheck.push(`${firstName}${lastName}${tld}`);
        }
      });
    }

    // All handles with all TLDs
    handles.forEach(handle => {
      allTlds.forEach(tld => {
        if ((handle + tld).length <= 12) {
          domainsToCheck.push(`${handle}${tld}`);
        }
      });
    });

    // Category 2: Location-based (if city has abbreviation)
    if (cityAbbr) {
      locationTlds.forEach(tld => {
        // name + city
        if ((firstName + cityAbbr + tld).length <= 16) {
          domainsToCheck.push(`${firstName}${cityAbbr}${tld}`);
        }
        // city + name
        if ((cityAbbr + firstName + tld).length <= 16) {
          domainsToCheck.push(`${cityAbbr}${firstName}${tld}`);
        }
      });

      // handles + city
      handles.slice(0, 2).forEach(handle => {
        techTlds.forEach(tld => {
          if ((handle + cityAbbr + tld).length <= 12) {
            domainsToCheck.push(`${handle}${cityAbbr}${tld}`);
          }
        });
      });
    }

    // Category 3: Professions (separate per profession, only if ≤8 chars)
    professions.forEach(prof => {
      const profLower = prof.toLowerCase();
      if (profLower.length <= 8) {
        // Just profession domain (for handle@ prefixes)
        ['.dk', '.io', '.com'].forEach(tld => {
          if ((profLower + tld).length <= 15) {
            domainsToCheck.push(`${profLower}${tld}`);
          }
        });

        // profession + name
        ['.dk', '.io', '.com'].forEach(tld => {
          if ((profLower + firstName + tld).length <= 18) {
            domainsToCheck.push(`${profLower}${firstName}${tld}`);
          }
        });

        // name + profession
        ['.dk', '.io', '.com'].forEach(tld => {
          if ((firstName + profLower + tld).length <= 18) {
            domainsToCheck.push(`${firstName}${profLower}${tld}`);
          }
        });

        // handles + profession
        handles.slice(0, 2).forEach(handle => {
          ['.io', '.com'].forEach(tld => {
            if ((handle + profLower + tld).length <= 18) {
              domainsToCheck.push(`${handle}${profLower}${tld}`);
            }
          });
        });
      }
    });

    // Category 4: Interests (creative)
    interests.slice(0, 2).forEach(interest => {
      const interestLower = interest.toLowerCase().replace(/\s+/g, '');
      const shortInterest = interestLower.slice(0, 5);

      // Just interest domain (for handle@ prefixes)
      ['.io', '.me', '.com'].forEach(tld => {
        if ((shortInterest + tld).length <= 12) {
          domainsToCheck.push(`${shortInterest}${tld}`);
        }
      });

      ['.io', '.me', '.com'].forEach(tld => {
        // Short interest + name
        if ((shortInterest + firstName + tld).length <= 18) {
          domainsToCheck.push(`${shortInterest}${firstName}${tld}`);
        }
        // name + short interest
        if ((firstName + shortInterest + tld).length <= 18) {
          domainsToCheck.push(`${firstName}${shortInterest}${tld}`);
        }
      });
    });

    // Check all domains in parallel
    console.log(`🔍 Checking ${domainsToCheck.length} domains...`);
    const availabilityResults = await domainAvailabilityService.checkMultipleDomains(domainsToCheck);

    // Create a map for quick lookup
    const availabilityMap = {};
    availabilityResults.forEach(result => {
      availabilityMap[result.domain] = result;
    });

    // Helper functions
    const isAvailable = (domain) => {
      const result = availabilityMap[domain];
      return result && (result.status === 'available' || result.status === 'premium');
    };

    const formatEmail = (prefix, domain) => {
      const result = availabilityMap[domain];
      if (!result || result.status === 'taken') return null;

      const email = `${prefix}@${domain}`;

      if (result.status === 'premium') {
        const price = result.price ? `$${result.price.toLocaleString()}` : '$2,500+';
        return `${email} (Premium - ${price})`;
      }
      return email;
    };

    // Group domains by base name and collect available TLDs, with CUSTOM prefix
    const groupByBaseName = (prefix, baseName, tlds) => {
      const available = tlds.filter(tld => isAvailable(`${baseName}${tld}`));
      if (available.length === 0) return null;

      // If multiple TLDs are available, show grouped
      if (available.length > 1) {
        return `${prefix}@${baseName} (${available.join(' / ')})`;
      }
      // Single TLD available
      return formatEmail(prefix, `${baseName}${available[0]}`);
    };

    // Build categories with only available domains
    const categories = [];

    // Category 1: Your Name - Use VARIED prefixes
    const nameOptions = [];

    // Classic: andreas@andreas.dk
    const firstNameGrouped = groupByBaseName(firstName, firstName, ['.dk', '.eu', '.io', '.me']);
    if (firstNameGrouped) nameOptions.push(firstNameGrouped);

    // Varied: akeinicke@gustavsen.dk, andreas@keinicke.io
    if (lastName) {
      const lastNameGrouped = groupByBaseName(firstName, lastName, ['.dk', '.io', '.me']);
      if (lastNameGrouped) nameOptions.push(lastNameGrouped);

      if (middleName) {
        const middleGrouped = groupByBaseName(`${firstName[0]}${lastName[0]}`, middleName, ['.dk', '.io']);
        if (middleGrouped) nameOptions.push(middleGrouped);
      }
    }

    // Handles as prefixes: akg@ventures.io (saved for profession category)
    // But show some handle domain combos: andreas@akg.dk
    handles.slice(0, 2).forEach(handle => {
      const handleGrouped = groupByBaseName(firstName, handle, ['.dk', '.io', '.me']);
      if (handleGrouped) nameOptions.push(handleGrouped);
    });

    if (nameOptions.length > 0) {
      categories.push({
        title: '**Your Name:**',
        options: nameOptions.slice(0, 4) // Limit to top 4
      });
    }

    // Category 2: Location (if city abbreviation exists)
    if (cityAbbr) {
      const locationOptions = [];

      // Varied prefixes for location
      ['.dk', '.eu', '.me'].forEach(tld => {
        const email1 = formatEmail(firstName, `${firstName}${cityAbbr}${tld}`);
        const email2 = formatEmail(cityAbbr, `${firstName}${tld}`); // city@andreas.dk
        if (email1) locationOptions.push(email1);
        if (email2) locationOptions.push(email2);
      });

      handles.slice(0, 2).forEach(handle => {
        ['.io', '.com'].forEach(tld => {
          const email = formatEmail(handle, `${cityAbbr}${tld}`); // akg@cph.io
          if (email) locationOptions.push(email);
        });
      });

      if (locationOptions.length > 0) {
        categories.push({
          title: `**Your Location:**`,
          options: locationOptions.slice(0, 4) // Limit to top 4
        });
      }
    }

    // Category 3: Professions - SEPARATE category per profession
    professions.forEach(prof => {
      const profLower = prof.toLowerCase();
      if (profLower.length <= 10) { // Slightly longer profession names allowed
        const professionOptions = [];

        // Pattern 1: name + profession (e.g., andreasfounder.dk)
        ['.dk', '.io', '.com'].forEach(tld => {
          const email = formatEmail(firstName, `${firstName}${profLower}${tld}`);
          if (email) professionOptions.push(email);
        });

        // Pattern 2: profession + name (e.g., founderandreas.io)
        ['.io', '.com', '.dk'].forEach(tld => {
          const email = formatEmail(profLower, `${firstName}${tld}`);
          if (email) professionOptions.push(email);
        });

        // Pattern 3: Short profession prefix + name (e.g., fundandreas.me)
        const shortProf = profLower.slice(0, 4);
        ['.me', '.io'].forEach(tld => {
          const email = formatEmail(shortProf, `${firstName}${tld}`);
          if (email) professionOptions.push(email);
        });

        if (professionOptions.length > 0) {
          const profTitle = prof.charAt(0).toUpperCase() + prof.slice(1);
          categories.push({
            title: `**For ${profTitle}:**`,
            options: professionOptions.slice(0, 3) // Limit to top 3
          });
        }
      }
    });

    // Category 4: Interests - CREATIVE with varied prefixes
    interests.slice(0, 2).forEach((interest, index) => {
      const interestLower = interest.toLowerCase().replace(/\s+/g, '');
      const shortInterest = interestLower.slice(0, 5);
      const interestOptions = [];

      // Handles as prefixes with interest domains
      handles.slice(0, 2).forEach(handle => {
        const interestGrouped = groupByBaseName(handle, shortInterest, ['.io', '.me', '.com']);
        if (interestGrouped) interestOptions.push(interestGrouped);
      });

      // Interest as prefix (flipped)
      handles.slice(0, 1).forEach(handle => {
        const flipped = groupByBaseName(shortInterest, handle, ['.io', '.com']);
        if (flipped) interestOptions.push(flipped);
      });

      // Traditional if space
      if (interestOptions.length < 2) {
        const traditional = groupByBaseName(firstName, shortInterest, ['.io', '.me']);
        if (traditional) interestOptions.push(traditional);
      }

      if (interestOptions.length > 0) {
        const interestTitle = interest.charAt(0).toUpperCase() + interest.slice(1);
        categories.push({
          title: index === 0 ? '**Creative:**' : `**Also (${interestTitle}):**`,
          options: interestOptions.slice(0, 3)
        });
      }
    });

    // Build final suggestions output
    if (categories.length === 0) {
      // Generate creative alternatives when standard options are taken
      const alternatives = [];

      // Add descriptive words
      ['hey', 'hi', 'meet', 'email', 'mail', 'contact'].forEach(word => {
        alternatives.push(`${firstName}@${word}${firstName}.com`);
        alternatives.push(`${firstName}@${firstName}${word}.com`);
      });

      // Try full name combinations
      if (lastName) {
        alternatives.push(`${firstName}@${firstName}${lastName}.com`);
        alternatives.push(`${lastName}@${firstName}${lastName}.com`);
      }

      return `Here are some creative alternatives using different TLDs and word combinations:\n\n${alternatives.slice(0, 6).map(alt => `• ${alt}`).join('\n')}\n\nWould you like me to check availability on any of these, or explore other directions?`;
    }

    let suggestions = `Great news! Here are available domains you can register:\n\n`;
    categories.forEach(category => {
      suggestions += `${category.title}\n`;
      category.options.forEach(option => {
        suggestions += `• ✅ ${option}\n`;
      });
      suggestions += `\n`;
    });

    // Count total suggestions
    const totalSuggestions = categories.reduce((sum, cat) => sum + cat.options.length, 0);
    suggestions += `Found ${totalSuggestions} available option${totalSuggestions !== 1 ? 's' : ''} for you! Premium domains may cost more than standard registration fees.\n`;

    return suggestions;
  }

  /**
   * Generate more options based on user preference
   */
  generateMoreOptions(messages, userMessage) {
    if (userMessage.includes('short') || userMessage.includes('minimal')) {
      return `Here are some ultra-short options:\n\n• **ak** (.io / .me / .dk)\n• **ag** (.com / .io)\n• **akg** (.dk / .io / .me)\n\nShort domains are powerful - easy to say, easy to remember. Any of these jumping out at you?`;
    } else if (userMessage.includes('creative') || userMessage.includes('unique')) {
      return `Let's get creative:\n\n• **andreas.studio** - Creative professional\n• **hello.andreas.dk** - Friendly approach\n• **hey.andreas.io** - Modern & casual\n• **andreas.coffee** - If coffee is your thing!\n\nThese tell a story. What resonates with you?`;
    } else if (userMessage.includes('professional') || userMessage.includes('formal')) {
      return `Professional full-name options:\n\n• **andreaskeinicke.dk** - Full professional name\n• **akeinicke.com** - Streamlined version\n• **keinicke.dk** - Distinctive last name\n\nThese command respect and are great for professional branding. Thoughts?`;
    } else {
      return `Let me show you a mix of styles:\n\n**Ultra-short:**\n• akg (.dk / .io / .me)\n\n**Professional:**\n• andreaskeinicke (.dk / .com)\n\n**Creative:**\n• andreas.studio\n\nSee any that click? Or want to explore another direction?`;
    }
  }

  /**
   * Helper methods
   */
  extractName(message) {
    return message.trim();
  }

  extractProfessions(message) {
    return message
      .split(/,|\band\b/i)
      .map(p => p.trim().replace(/\s+/g, ''))  // Remove all whitespace
      .filter(p => p.length > 0);
  }

  extractInterests(message) {
    return message
      .split(/,|\band\b/i)
      .map(i => i.trim().replace(/\s+/g, ''))  // Remove all whitespace
      .filter(i => i.length > 0);
  }

  getCityAbbreviation(city) {
    const abbrs = {
      'copenhagen': 'cph',
      'barcelona': 'bcn',
      'london': 'ldn',
      'new york': 'nyc',
      'los angeles': 'la',
      'san francisco': 'sf',
      'paris': 'par',
      'berlin': 'ber',
      'amsterdam': 'ams'
    };
    return abbrs[city.toLowerCase()] || null;
  }

  isAskingForMore(message) {
    const keywords = ['more', 'other', 'different', 'explore', 'short', 'creative', 'professional', 'unique'];
    return keywords.some(keyword => message.includes(keyword));
  }

  isSelectingDomain(message) {
    return message.includes('.') && (
      message.includes('.com') ||
      message.includes('.io') ||
      message.includes('.dk') ||
      message.includes('.me') ||
      message.includes('.eu')
    );
  }

  extractDomain(message) {
    const domainMatch = message.match(/([a-z0-9-]+\.[a-z]+)/i);
    return domainMatch ? domainMatch[1] : 'that domain';
  }

  getRandomResponse(category) {
    const responses = this.responses[category];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stream message (not implemented for mock, but required for interface compatibility)
   */
  async streamMessage(messages, onChunk, options = {}) {
    const response = await this.sendMessage(messages, options);
    onChunk({ type: 'text', data: response.message });
    onChunk({ type: 'complete', data: response });
  }
}

module.exports = new MockClaudeService();
