import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DomainResults.css';

function DomainResults({ suggestions, onStartOver }) {
  const [checkedDomains, setCheckedDomains] = useState({});
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (suggestions?.suggestions) {
      checkDomainAvailability();
    }
  }, [suggestions]);

  const checkDomainAvailability = async () => {
    if (!suggestions?.suggestions) return;

    setIsChecking(true);
    const domains = suggestions.suggestions.map(s => s.domain);

    try {
      const response = await axios.post('/api/domains/bulk-check', {
        domains: domains
      });

      const availabilityMap = {};
      response.data.results.forEach(result => {
        availabilityMap[result.domain] = result;
      });

      setCheckedDomains(availabilityMap);
    } catch (error) {
      console.error('Error checking domains:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getAvailabilityBadge = (domain) => {
    const check = checkedDomains[domain];
    if (!check) return <span className="badge checking">Checking...</span>;

    if (check.available === true) {
      return <span className="badge available">Available ✓</span>;
    } else if (check.available === false) {
      return <span className="badge taken">Taken</span>;
    } else {
      return <span className="badge unknown">Unknown</span>;
    }
  };

  if (!suggestions) {
    return (
      <div className="domain-results">
        <div className="error-state">
          <p>No suggestions available.</p>
          <button onClick={onStartOver} className="primary-button">
            Start Over
          </button>
        </div>
      </div>
    );
  }

  const domainSuggestions = suggestions.suggestions?.suggestions || suggestions.suggestions || [];

  return (
    <div className="domain-results">
      <div className="results-header">
        <h2>Your Perfect Domain Suggestions</h2>
        {suggestions.insights && (
          <div className="insights-box">
            <h3>Insights</h3>
            <p>{suggestions.insights}</p>
          </div>
        )}
      </div>

      <div className="results-container">
        {isChecking && (
          <div className="checking-notice">
            Checking domain availability...
          </div>
        )}

        {domainSuggestions.length > 0 ? (
          <div className="suggestions-grid">
            {domainSuggestions.map((suggestion, index) => (
              <div key={index} className="suggestion-card">
                <div className="card-header">
                  <h3 className="domain-name">{suggestion.domain}</h3>
                  {getAvailabilityBadge(suggestion.domain)}
                </div>

                {suggestion.rating && (
                  <div className="rating">
                    <span className="stars">{renderStars(suggestion.rating)}</span>
                    <span className="rating-text">{suggestion.rating}/5</span>
                  </div>
                )}

                <p className="reasoning">{suggestion.reasoning}</p>

                {suggestion.concerns && (
                  <div className="concerns">
                    <strong>Note:</strong> {suggestion.concerns}
                  </div>
                )}

                {checkedDomains[suggestion.domain]?.available && (
                  <div className="card-actions">
                    <a
                      href={`https://www.namecheap.com/domains/registration/results/?domain=${suggestion.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="register-link"
                    >
                      Register on Namecheap →
                    </a>
                    <a
                      href={`https://domains.google.com/registrar/search?searchTerm=${suggestion.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="register-link"
                    >
                      Register on Google Domains →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-suggestions">
            <p>No suggestions generated. Please try again.</p>
          </div>
        )}
      </div>

      <div className="results-actions">
        <button onClick={onStartOver} className="secondary-button">
          Start Over
        </button>
        <button onClick={checkDomainAvailability} className="primary-button" disabled={isChecking}>
          {isChecking ? 'Checking...' : 'Recheck Availability'}
        </button>
      </div>

      <div className="next-steps">
        <h3>Next Steps</h3>
        <ol>
          <li>Choose your favorite domain from the suggestions above</li>
          <li>Register the domain with a registrar (Namecheap, Google Domains, etc.)</li>
          <li>Set up email forwarding to your Gmail account</li>
          <li>Configure Gmail to send emails from your custom domain</li>
        </ol>
        <a
          href="https://support.google.com/mail/answer/22370"
          target="_blank"
          rel="noopener noreferrer"
          className="help-link"
        >
          Learn how to use custom domain with Gmail →
        </a>
      </div>
    </div>
  );
}

export default DomainResults;
