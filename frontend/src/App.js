import React, { useEffect, useState } from 'react';
import './App.css';
import axios from 'axios';
import ChatFinder from './components/ChatFinder';
import EmailResults from './components/EmailResults';
import CheckoutSuccess from './components/CheckoutSuccess';
import CheckoutCanceled from './components/CheckoutCanceled';
import MovingIn from './components/MovingIn';
import Site from './landing/Site';
import { landingApi } from './landing/api';

// Configure axios base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || '';
axios.defaults.baseURL = API_BASE_URL;

// Stripe redirects back to these paths after checkout (no router needed)
function Root() {
  const path = window.location.pathname;
  if (path === '/checkout/success') {
    return <CheckoutSuccess />;
  }
  if (path === '/checkout/canceled') {
    return <CheckoutCanceled />;
  }
  // Order status link from our emails: /order/<token>
  const orderMatch = path.match(/^\/order\/([A-Za-z0-9_-]{16,})$/);
  if (orderMatch) {
    return <MovingIn token={orderMatch[1]} />;
  }
  return <App />;
}

function App() {
  // /start opens the guided chat finder directly (linked from the site)
  const [view, setView] = useState(window.location.pathname === '/start' ? 'questionnaire' : 'landing'); // landing, questionnaire, results
  const [emailSuggestions, setEmailSuggestions] = useState(null);

  // Keep the browser's back button in step with the chat finder at /start
  useEffect(() => {
    const onPop = () => setView(window.location.pathname === '/start' ? 'questionnaire' : 'landing');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleStartQuestionnaire = () => {
    // Always go to questionnaire first - signup happens later when they buy
    window.history.pushState({}, '', '/start');
    setView('questionnaire');
  };

  const handleStartOver = () => {
    setEmailSuggestions(null);
    if (window.location.pathname === '/start') window.history.pushState({}, '', '/');
    setView('landing');
  };

  // Landing Page View: search-first page; the chat finder is one click away
  if (view === 'landing') {
    return <Site api={landingApi} onOpenChat={handleStartQuestionnaire} />;
  }

  if (view === 'questionnaire') {
    return (
      <ChatFinder onBack={handleStartOver} />
    );
  }

  // Generating View
  if (view === 'generating') {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md">
          <div className="mb-6">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Checking Domain Availability</h2>
          <p className="text-gray-600">
            We're checking all possible email addresses for your name to show you only what's available...
          </p>
        </div>
      </div>
    );
  }

  // Results View
  if (view === 'results' && emailSuggestions) {
    return <EmailResults suggestions={emailSuggestions} onStartOver={handleStartOver} />;
  }

  // Fallback
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
        <button
          onClick={handleStartOver}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

export default Root;
