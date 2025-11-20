/**
 * Advanced Domain Recommendation Engine
 * Implements 10-category domain generation from posty_recommendation_engine.md
 *
 * Categories:
 * 1. Ultra-Short Handles (memorable)
 * 2. Personal Brand
 * 3. Professional Identity
 * 4. City-Based
 * 5. Interest-Based
 * 6. Profession-Based (per profession)
 * 7. Creative AI-Powered
 * 8. Name-Based (full name)
 * 9. Hybrid Combinations
 * 10. Alternative TLDs
 */

class DomainRecommendationEngine {
  /**
   * Generate comprehensive domain recommendations
   * @param {Object} profile - User profile from questionnaire
   * @returns {Array} - Categorized domain suggestions
   */
  generateRecommendations(profile) {
    const metadata = profile._metadata || profile;

    const {
      preferredName,
      firstName,
      lastName,
      middleName,
      handles = [],
      country,
      city,
      cityAbbreviation,
      tlds = ['.com'],
      professions = [],
      interestsList = []
    } = metadata;

    console.log('🔍 Recommendation Engine - Received data:');
    console.log('  - Name:', preferredName || firstName);
    console.log('  - Handles:', handles);
    console.log('  - City:', city, cityAbbreviation);
    console.log('  - TLDs:', tlds);
    console.log('  - Professions:', professions);
    console.log('  - Interests:', interestsList);

    const allDomains = [];

    // Category 1: Ultra-Short Handles (Priority: Highest)
    if (handles && handles.length > 0) {
      const shortHandles = this.generateUltraShortHandles(handles, tlds);
      allDomains.push(...shortHandles);
    }

    // Category 2: Personal Brand (name-based)
    if (preferredName || firstName) {
      const personalBrand = this.generatePersonalBrand(
        preferredName || firstName.toLowerCase(),
        lastName?.toLowerCase(),
        tlds
      );
      allDomains.push(...personalBrand);
    }

    // Category 3: Professional Identity
    if (professions.length > 0) {
      const professional = this.generateProfessionalIdentity(
        preferredName || firstName.toLowerCase(),
        professions,
        tlds
      );
      allDomains.push(...professional);
    }

    // Category 4: City-Based
    if (cityAbbreviation) {
      const cityBased = this.generateCityBased(
        preferredName || firstName.toLowerCase(),
        handles || [],
        cityAbbreviation,
        tlds
      );
      allDomains.push(...cityBased);
    }

    // Category 5: Interest-Based
    if (interestsList.length > 0) {
      const interestBased = this.generateInterestBased(
        preferredName || firstName.toLowerCase(),
        interestsList,
        tlds
      );
      allDomains.push(...interestBased);
    }

    return this.deduplicateAndSort(allDomains);
  }

  /**
   * Category 1: Ultra-Short Handles (memorable)
   * Examples: ak.io, anke.me, akg.dk
   */
  generateUltraShortHandles(handles, tlds) {
    const domains = [];

    handles.forEach(handle => {
      tlds.forEach(tld => {
        const domain = `${handle}${tld}`;
        if (domain.length <= 10) { // Ultra-short: max 10 chars total
          domains.push({
            domain: `${handle}${tld}`,
            category: 'ultra-short-handles',
            priority: 1,
            description: `Ultra-short and memorable`,
            pattern: `${handle}${tld}`
          });
        }
      });
    });

    return domains;
  }

  /**
   * Category 2: Personal Brand
   * Examples: andreas.dk, andreas.me, andreaskeinicke.com
   */
  generatePersonalBrand(firstName, lastName, tlds) {
    const domains = [];

    tlds.forEach(tld => {
      // First name only
      domains.push({
        domain: `${firstName}${tld}`,
        category: 'personal-brand',
        priority: 1,
        description: `Your personal brand`,
        pattern: `${firstName}${tld}`
      });

      // First + Last (if not too long)
      if (lastName && (firstName + lastName + tld).length <= 18) {
        domains.push({
          domain: `${firstName}${lastName}${tld}`,
          category: 'personal-brand',
          priority: 2,
          description: `Full name domain`,
          pattern: `${firstName}${lastName}${tld}`
        });
      }
    });

    return domains;
  }

  /**
   * Category 3: Professional Identity
   * Each profession gets its own suggestions
   * Examples: andreasfounder.dk, founderandreas.io
   */
  generateProfessionalIdentity(name, professions, tlds) {
    const domains = [];

    professions.forEach(profession => {
      const shortProf = profession.slice(0, 4);

      tlds.forEach(tld => {
        // Name + profession
        if ((name + profession + tld).length <= 20) {
          domains.push({
            domain: `${name}${profession}${tld}`,
            category: `profession-${profession}`,
            priority: 3,
            description: `For your ${profession} work`,
            pattern: `${name}${profession}${tld}`
          });
        }

        // Profession + name
        if ((profession + name + tld).length <= 20) {
          domains.push({
            domain: `${profession}${name}${tld}`,
            category: `profession-${profession}`,
            priority: 3,
            description: `Professional identity`,
            pattern: `${profession}${name}${tld}`
          });
        }

        // Short profession + name
        if ((shortProf + name + tld).length <= 16) {
          domains.push({
            domain: `${shortProf}${name}${tld}`,
            category: `profession-${profession}`,
            priority: 4,
            description: `Abbreviated professional`,
            pattern: `${shortProf}${name}${tld}`
          });
        }
      });
    });

    return domains;
  }

  /**
   * Category 4: City-Based
   * Examples: andreascph.dk, cphandreas.me, ak@cph.dk
   */
  generateCityBased(name, handles, cityAbbr, tlds) {
    const domains = [];

    tlds.forEach(tld => {
      // Name + city
      if ((name + cityAbbr + tld).length <= 18) {
        domains.push({
          domain: `${name}${cityAbbr}${tld}`,
          category: 'city-based',
          priority: 2,
          description: `${name} in ${cityAbbr.toUpperCase()}`,
          pattern: `${name}${cityAbbr}${tld}`
        });
      }

      // City + name
      if ((cityAbbr + name + tld).length <= 18) {
        domains.push({
          domain: `${cityAbbr}${name}${tld}`,
          category: 'city-based',
          priority: 3,
          description: `${cityAbbr.toUpperCase()}-based ${name}`,
          pattern: `${cityAbbr}${name}${tld}`
        });
      }

      // Handle + city (ultra-short)
      handles.slice(0, 2).forEach(handle => {
        if ((handle + cityAbbr + tld).length <= 12) {
          domains.push({
            domain: `${handle}${cityAbbr}${tld}`,
            category: 'city-based',
            priority: 2,
            description: `Short ${cityAbbr.toUpperCase()} domain`,
            pattern: `${handle}${cityAbbr}${tld}`
          });
        }
      });
    });

    return domains;
  }

  /**
   * Category 5: Interest-Based
   * Examples: runningandreas.io, andreasski.me
   */
  generateInterestBased(name, interests, tlds) {
    const domains = [];

    interests.slice(0, 3).forEach(interest => {
      const shortInterest = interest.slice(0, 5);

      tlds.forEach(tld => {
        // Interest + name (if short enough)
        if (interest.length <= 8 && (interest + name + tld).length <= 20) {
          domains.push({
            domain: `${interest}${name}${tld}`,
            category: 'interest-based',
            priority: 4,
            description: `For your ${interest} passion`,
            pattern: `${interest}${name}${tld}`
          });
        }

        // Name + short interest
        if ((name + shortInterest + tld).length <= 18) {
          domains.push({
            domain: `${name}${shortInterest}${tld}`,
            category: 'interest-based',
            priority: 4,
            description: `${name} + ${interest}`,
            pattern: `${name}${shortInterest}${tld}`
          });
        }
      });
    });

    return domains;
  }

  /**
   * Deduplicate and sort domains by priority
   */
  deduplicateAndSort(domains) {
    const seen = new Set();
    const unique = domains.filter(d => {
      if (seen.has(d.domain)) return false;
      seen.add(d.domain);
      return true;
    });

    return unique.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Group domains by category for display
   */
  groupByCategory(domains) {
    const grouped = {};

    domains.forEach(domain => {
      const category = domain.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(domain);
    });

    return grouped;
  }
}

module.exports = new DomainRecommendationEngine();
