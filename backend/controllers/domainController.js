const domainAvailabilityService = require('../services/domainAvailabilityService');

/**
 * Validate domain format
 */
function isValidDomain(domain) {
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  return domainRegex.test(domain);
}

/**
 * Clean domain name
 */
function cleanDomainName(domain) {
  return domain.toLowerCase().trim();
}

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
    const cleanDomain = cleanDomainName(domain);
    if (!isValidDomain(cleanDomain)) {
      return res.status(400).json({
        error: 'Invalid domain name format',
        example: 'example.com'
      });
    }

    const result = await domainAvailabilityService.checkDomain(cleanDomain);

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
    const cleanDomains = domains.map(d => cleanDomainName(d));
    const invalidDomains = cleanDomains.filter(d => !isValidDomain(d));

    if (invalidDomains.length > 0) {
      return res.status(400).json({
        error: 'Invalid domain names',
        invalidDomains: invalidDomains
      });
    }

    const results = await domainAvailabilityService.checkMultipleDomains(cleanDomains);

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
 * Get cache statistics
 */
exports.getCacheStats = async (req, res) => {
  try {
    const stats = domainAvailabilityService.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({
      error: 'Failed to get cache stats',
      message: error.message
    });
  }
};

/**
 * Clear cache
 */
exports.clearCache = async (req, res) => {
  try {
    domainAvailabilityService.clearCache();
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
};
