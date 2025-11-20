/**
 * Deterministic Email Address Generator
 * Generates email addresses based on name patterns - NO AI
 */

class EmailGenerator {
  /**
   * Generate email addresses from a name
   * @param {string} fullName - User's full name (e.g., "Andreas Keinicke")
   * @param {Array} preferredTLDs - Preferred TLDs (default: ['.com', '.io', '.co'])
   * @returns {Array} - List of email address suggestions with domains
   */
  generateFromName(fullName, preferredTLDs = ['com', 'io', 'co', 'email', 'me']) {
    const emails = [];
    const name = this.parseName(fullName);

    // Generate domain patterns
    const domains = this.generateDomainPatterns(name, preferredTLDs);

    // For each domain, create email addresses
    domains.forEach(domain => {
      // Primary email: firstname@domain
      emails.push({
        email: `${name.first.toLowerCase()}@${domain}`,
        domain: domain,
        pattern: 'firstname',
        description: `${name.first}@${domain}`
      });

      // If they have a last name, add more options
      if (name.last) {
        // hello@domain
        emails.push({
          email: `hello@${domain}`,
          domain: domain,
          pattern: 'hello',
          description: `hello@${domain}`
        });

        // hi@domain
        emails.push({
          email: `hi@${domain}`,
          domain: domain,
          pattern: 'hi',
          description: `hi@${domain}`
        });

        // contact@domain
        emails.push({
          email: `contact@${domain}`,
          domain: domain,
          pattern: 'contact',
          description: `contact@${domain}`
        });
      }
    });

    return emails;
  }

  /**
   * Parse a full name into components
   * @param {string} fullName
   * @returns {Object} - { first, last, initials }
   */
  parseName(fullName) {
    const cleaned = fullName.trim().replace(/[^a-zA-Z\s]/g, '');
    const parts = cleaned.split(/\s+/);

    const first = parts[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    const initials = parts.map(p => p[0]).join('').toUpperCase();

    return {
      first,
      last,
      initials,
      full: cleaned
    };
  }

  /**
   * Generate domain name patterns from name components
   * @param {Object} name - Parsed name object
   * @param {Array} tlds - TLDs to use
   * @returns {Array} - Domain names
   */
  generateDomainPatterns(name, tlds) {
    const domains = [];
    const { first, last, initials } = name;

    tlds.forEach(tld => {
      // Pattern 1: firstlast.tld (e.g., andreaskeinicke.com)
      if (first && last) {
        domains.push(`${first.toLowerCase()}${last.toLowerCase()}.${tld}`);
      }

      // Pattern 2: first-last.tld (e.g., andreas-keinicke.com)
      if (first && last) {
        domains.push(`${first.toLowerCase()}-${last.toLowerCase()}.${tld}`);
      }

      // Pattern 3: first.tld (e.g., andreas.com)
      if (first) {
        domains.push(`${first.toLowerCase()}.${tld}`);
      }

      // Pattern 4: initials.tld (e.g., ak.com)
      if (initials.length >= 2) {
        domains.push(`${initials.toLowerCase()}.${tld}`);
      }

      // Pattern 5: lastname.tld (e.g., keinicke.com)
      if (last) {
        domains.push(`${last.toLowerCase()}.${tld}`);
      }
    });

    return domains;
  }

  /**
   * Generate email suggestions with availability check results
   * @param {string} fullName
   * @param {Array} checkedDomains - Array of {domain, available, price} objects
   * @returns {Array} - Email suggestions with availability
   */
  generateWithAvailability(fullName, checkedDomains) {
    const allEmails = this.generateFromName(fullName);

    // Create a map of domain -> availability info
    const domainMap = {};
    checkedDomains.forEach(d => {
      domainMap[d.domain] = d;
    });

    // Add availability info to each email
    const emailsWithAvailability = allEmails.map(email => {
      const domainInfo = domainMap[email.domain];
      return {
        ...email,
        available: domainInfo?.available || false,
        price: domainInfo?.price || 0,
        checked: !!domainInfo
      };
    });

    // Sort: available first, then by price
    return emailsWithAvailability.sort((a, b) => {
      if (a.available && !b.available) return -1;
      if (!a.available && b.available) return 1;
      if (a.available && b.available) {
        return (a.price || 0) - (b.price || 0);
      }
      return 0;
    });
  }
}

module.exports = new EmailGenerator();
