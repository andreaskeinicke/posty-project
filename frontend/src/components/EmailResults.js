import React, { useState } from 'react';
import axios from 'axios';
import { supabase } from '../config/supabaseClient';
import './EmailResults.css';

function EmailResults({ suggestions, onStartOver }) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showMore, setShowMore] = useState(false);

  const handleBuyNow = async (emailSuggestion) => {
    setIsCheckingOut(true);
    setSelectedEmail(emailSuggestion.email);

    try {
      // Get user session (optional - will create account during checkout if needed)
      const { data: { session } } = await supabase.auth.getSession();

      // Create checkout session
      const response = await axios.post('/api/checkout/create-session', {
        domainName: emailSuggestion.domain,
        domainPrice: emailSuggestion.price || 0,
        caseId: suggestions.caseId || null
      }, {
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`
        } : {}
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
      setSelectedEmail(null);
    }
  };

  if (!suggestions || !suggestions.suggestions || suggestions.suggestions.length === 0) {
    return (
      <div className="email-results">
        <div className="no-results">
          <h2>No available email addresses found</h2>
          <p>We couldn't find any available domains for your name. Try a different name or contact support.</p>
          <button onClick={onStartOver} className="button-secondary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Curated shortlist first; "Show more" reveals the rest
  const moreSuggestions = suggestions.more || [];
  const emailSuggestions = showMore
    ? [...suggestions.suggestions, ...moreSuggestions]
    : suggestions.suggestions;

  return (
    <div className="email-results">
      <div className="results-header">
        <h1>Your available addresses</h1>
        <p className="subtitle">All checked and free to register. $5/month + the domain.</p>
      </div>

      {suggestions.pitch && (
        <div className="concierge-pitch">
          <span className="pitch-icon">💡</span>
          <p>{suggestions.pitch}</p>
        </div>
      )}

      <div className="email-list">
        {emailSuggestions.map((suggestion, index) => (
          <div key={index} className={`email-row${suggestion.pick ? ' pick-row' : ''}`}>
            <div className="row-main">
              <div className="row-email">
                {suggestion.email}
                {suggestion.pick && <span className="pick-tag">Our pick</span>}
              </div>
              <div className="row-note">{suggestion.reasoning || suggestion.pattern}</div>
            </div>
            <div className="row-price">
              {suggestion.price > 0 ? `+$${suggestion.price.toFixed(0)}/yr` : ''}
            </div>
            <button
              onClick={() => handleBuyNow(suggestion)}
              disabled={isCheckingOut}
              className="row-buy"
            >
              {isCheckingOut && selectedEmail === suggestion.email ? '…' : 'Buy'}
            </button>
          </div>
        ))}
      </div>

      <div className="results-footer">
        {!showMore && moreSuggestions.length > 0 && (
          <button onClick={() => setShowMore(true)} className="button-secondary">
            Show {moreSuggestions.length} more options
          </button>
        )}
        <button onClick={onStartOver} className="button-secondary">
          Start Over
        </button>
      </div>
    </div>
  );
}

export default EmailResults;
