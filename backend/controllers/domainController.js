const domainService = require('../services/domainService');

/**
 * Check single domain availability
 */
exports.checkAvailability = async (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        error: 'Domain name is required'
      });
    }

    // Validate domain format
    const cleanDomain = domainService.cleanDomainName(domain);
    if (!domainService.isValidDomain(cleanDomain)) {
      return res.status(400).json({
        error: 'Invalid domain name format'
      });
    }

    const result = await domainService.checkAvailability(cleanDomain);

    res.json(result);
  } catch (error) {
    console.error('Domain check error:', error);
    res.status(500).json({
      error: 'Failed to check domain availability',
      message: error.message
    });
  }
};

/**
 * Check multiple domains in bulk
 */
exports.bulkCheckAvailability = async (req, res) => {
  try {
    const { domains } = req.body;

    if (!domains || !Array.isArray(domains)) {
      return res.status(400).json({
        error: 'Domains array is required'
      });
    }

    if (domains.length === 0) {
      return res.status(400).json({
        error: 'At least one domain is required'
      });
    }

    if (domains.length > 20) {
      return res.status(400).json({
        error: 'Maximum 20 domains per request'
      });
    }

    // Clean and validate all domains
    const cleanDomains = domains.map(d => domainService.cleanDomainName(d));
    const invalidDomains = cleanDomains.filter(d => !domainService.isValidDomain(d));

    if (invalidDomains.length > 0) {
      return res.status(400).json({
        error: 'Invalid domain names',
        invalidDomains: invalidDomains
      });
    }

    const results = await domainService.bulkCheck(cleanDomains);

    res.json({
      checked: results.length,
      results: results
    });
  } catch (error) {
    console.error('Bulk domain check error:', error);
    res.status(500).json({
      error: 'Failed to check domains',
      message: error.message
    });
  }
};

/**
 * Get domain suggestions
 */
exports.getSuggestions = async (req, res) => {
  try {
    const { keyword, tlds, prefixes, suffixes, includeHyphens } = req.query;

    if (!keyword) {
      return res.status(400).json({
        error: 'Keyword parameter is required'
      });
    }

    const options = {
      tlds: tlds ? tlds.split(',') : undefined,
      prefixes: prefixes ? prefixes.split(',') : undefined,
      suffixes: suffixes ? suffixes.split(',') : undefined,
      includeHyphens: includeHyphens === 'true'
    };

    const suggestions = domainService.generateSuggestions(keyword, options);

    res.json({
      keyword: keyword,
      count: suggestions.length,
      suggestions: suggestions,
      popularTLDs: domainService.getPopularEmailTLDs()
    });
  } catch (error) {
    console.error('Domain suggestions error:', error);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      message: error.message
    });
  }
};
