import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../config/supabaseClient';
import './DomainResults.css';

function DomainResults({ suggestions, onStartOver }) {
  const [checkedDomains, setCheckedDomains] = useState({});
  const [isChecking, setIsChecking] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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

  const handleCheckout = async (domain, plan) => {
    setIsCheckingOut(true);
    setSelectedDomain(domain);
    setSelectedPlan(plan);

    try {
      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to continue with checkout');
        window.location.href = '/';
        return;
      }

      // Get domain price from checked domains
      const domainInfo = checkedDomains[domain];
      const domainPrice = domainInfo?.price || 0;

      // Create checkout session
      const response = await axios.post('/api/checkout/create-session', {
        domainName: domain,
        domainPrice,
        plan
      }, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.data.success && response.data.url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
      setIsCheckingOut(false);
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
                  <div className="pricing-section">
                    <div className="pricing-card-single">
                      <h4>Posty Plan</h4>
                      <div className="price">$5<span>/month</span></div>
                      <ul className="features">
                        <li>✓ Custom domain email</li>
                        <li>✓ Gmail integration</li>
                        <li>✓ Professional identity</li>
                        <li>✓ Easy setup & management</li>
                      </ul>
                      {checkedDomains[suggestion.domain]?.price > 0 && (
                        <div className="domain-cost">
                          + ${checkedDomains[suggestion.domain].price.toFixed(2)} domain/year
                        </div>
                      )}
                      <button
                        onClick={() => handleCheckout(suggestion.domain, 'starter')}
                        disabled={isCheckingOut}
                        className="checkout-button primary"
                      >
                        {isCheckingOut && selectedDomain === suggestion.domain ? 'Processing...' : 'Get Started'}
                      </button>
                    </div>
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
        <h3>How It Works</h3>
        <ol>
          <li>Choose your favorite domain and select a plan</li>
          <li>Complete checkout - we'll register the domain via Cloudflare</li>
          <li>We'll automatically set up email forwarding to your Gmail</li>
          <li>Start using your professional custom email address!</li>
        </ol>
        <p className="help-text">
          Your domain will be registered through Cloudflare and configured automatically for Gmail integration.
        </p>
      </div>
    </div>
  );
}

export default DomainResults;
