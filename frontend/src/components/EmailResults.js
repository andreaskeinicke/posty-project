import React, { useState } from 'react';
import axios from 'axios';
import { supabase } from '../config/supabaseClient';
import './EmailResults.css';

// Category display names and descriptions
const CATEGORY_INFO = {
  'ultra-short-handles': {
    name: 'Ultra-Short Handles',
    description: 'Premium short domains - highly memorable',
    icon: '⭐'
  },
  'personal-brand': {
    name: 'Personal Brand',
    description: 'Your name as your domain',
    icon: '👤'
  },
  'professional-identity': {
    name: 'Professional Identity',
    description: 'Name + profession combinations',
    icon: '💼'
  },
  'city-based': {
    name: 'City-Based',
    description: 'Location-specific domains',
    icon: '📍'
  },
  'interest-based': {
    name: 'Interest-Based',
    description: 'Passion-driven domains',
    icon: '🎯'
  }
};

function EmailResults({ suggestions, onStartOver }) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const handleBuyNow = async (emailSuggestion) => {
    setIsCheckingOut(true);
    setSelectedEmail(emailSuggestion.email);

    try {
      // Get user session (optional - will create account during checkout if needed)
      const { data: { session } } = await supabase.auth.getSession();

      // Create checkout session
      const response = await axios.post('/api/checkout/create-session', {
        domainName: emailSuggestion.domain,
        domainPrice: emailSuggestion.price || 0
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

  const emailSuggestions = suggestions.suggestions;

  // Group suggestions by category
  const groupedByCategory = {};
  emailSuggestions.forEach(suggestion => {
    const category = suggestion.category || 'other';
    if (!groupedByCategory[category]) {
      groupedByCategory[category] = [];
    }
    groupedByCategory[category].push(suggestion);
  });

  // Limit to 3-5 suggestions per category
  Object.keys(groupedByCategory).forEach(category => {
    groupedByCategory[category] = groupedByCategory[category]
      .sort((a, b) => a.priority - b.priority) // Sort by priority
      .slice(0, 5); // Max 5 per category
  });

  // Sort categories by priority (based on first item in each category)
  const sortedCategories = Object.keys(groupedByCategory).sort((a, b) => {
    const aPriority = groupedByCategory[a][0]?.priority || 999;
    const bPriority = groupedByCategory[b][0]?.priority || 999;
    return aPriority - bPriority;
  });

  return (
    <div className="email-results">
      <div className="results-header">
        <h1>Your Available Email Addresses</h1>
        <p className="subtitle">Found {emailSuggestions.length} available domains - pick one and buy it now!</p>
      </div>

      {sortedCategories.map(categoryKey => {
        const categoryDomains = groupedByCategory[categoryKey];
        const categoryInfo = CATEGORY_INFO[categoryKey] || {
          name: categoryKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: '',
          icon: '✨'
        };

        return (
          <div key={categoryKey} className="category-section">
            <div className="category-header">
              <h2>
                <span className="category-icon">{categoryInfo.icon}</span>
                {categoryInfo.name}
              </h2>
              {categoryInfo.description && (
                <p className="category-description">{categoryInfo.description}</p>
              )}
            </div>

            <div className="email-grid">
              {categoryDomains.map((suggestion, index) => (
                <div key={index} className="email-card">
                  <div className="email-display">
                    <div className="email-address">{suggestion.email}</div>
                    <div className="pattern-label">{suggestion.reasoning || suggestion.pattern}</div>
                  </div>

                  <div className="pricing-info">
                    <div className="plan-price">
                      <span className="price-label">Posty Plan</span>
                      <span className="price">$5/month</span>
                    </div>
                    {suggestion.price > 0 && (
                      <div className="domain-price">
                        <span className="price-label">Domain</span>
                        <span className="price">${suggestion.price.toFixed(2)}/year</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleBuyNow(suggestion)}
                    disabled={isCheckingOut}
                    className="buy-button"
                  >
                    {isCheckingOut && selectedEmail === suggestion.email ? 'Processing...' : 'Buy Now'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="results-footer">
        <button onClick={onStartOver} className="button-secondary">
          Start Over
        </button>
      </div>
    </div>
  );
}

export default EmailResults;
