import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { supabase } from './config/supabaseClient';
import Questionnaire from './components/Questionnaire';
import EmailResults from './components/EmailResults';
import SignupForm from './components/Auth/SignupForm';
import LoginForm from './components/Auth/LoginForm';

// Configure axios base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
axios.defaults.baseURL = API_BASE_URL;

function App() {
  const [view, setView] = useState('landing'); // landing, questionnaire, results
  const [user, setUser] = useState(null);
  const [emailSuggestions, setEmailSuggestions] = useState(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Check for user session on mount
  useEffect(() => {
    checkUserSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
    }
  };

  const handleStartQuestionnaire = () => {
    // Always go to questionnaire first - signup happens later when they buy
    setView('questionnaire');
  };

  const handleQuestionnaireComplete = async (data) => {
    setView('generating');

    try {
      // Get user session for auth
      const { data: { session } } = await supabase.auth.getSession();

      // Call backend to generate deterministic email suggestions
      const response = await axios.post('/api/questionnaire/analyze', {
        responses: data.responses || data
      }, {
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`
        } : {}
      });

      console.log('Email suggestions received:', response.data);
      // Extract suggestions from response
      setEmailSuggestions(response.data.suggestions || response.data);
      setView('results');
    } catch (error) {
      console.error('Error generating suggestions:', error);
      alert('Failed to generate email suggestions. Please try again.');
      setView('questionnaire');
    }
  };

  const handleStartOver = () => {
    setEmailSuggestions(null);
    setView('landing');
  };

  const handleSignupSuccess = (newUser) => {
    setUser(newUser);
    setShowSignupModal(false);
    setView('questionnaire');
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setShowLoginModal(false);
    setView('questionnaire');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView('landing');
  };

  // Landing Page View
  if (view === 'landing') {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="max-w-4xl w-full text-center">
          <div className="bg-white rounded-2xl shadow-2xl p-12">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Posty
            </h1>
            <p className="text-2xl text-gray-700 mb-8">
              Get a custom email address with your own domain
            </p>
            <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
              We'll find available email addresses for you, handle domain registration, and set up everything with Gmail.
              All for just $5/month.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="p-6 bg-purple-50 rounded-xl">
                <div className="text-3xl mb-3">📧</div>
                <h3 className="font-semibold text-gray-900 mb-2">Your Own Domain</h3>
                <p className="text-sm text-gray-600">Get a professional email like you@yourdomain.com</p>
              </div>
              <div className="p-6 bg-blue-50 rounded-xl">
                <div className="text-3xl mb-3">✓</div>
                <h3 className="font-semibold text-gray-900 mb-2">Keep Using Gmail</h3>
                <p className="text-sm text-gray-600">No switching needed - works with your Gmail account</p>
              </div>
              <div className="p-6 bg-green-50 rounded-xl">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-semibold text-gray-900 mb-2">We Handle Everything</h3>
                <p className="text-sm text-gray-600">Domain registration, DNS setup, email forwarding - all done for you</p>
              </div>
            </div>

            <button
              onClick={handleStartQuestionnaire}
              className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg transform hover:scale-105"
            >
              Find My Email Address
            </button>

            {user && (
              <div className="mt-6">
                <p className="text-sm text-gray-600">
                  Signed in as {user.email} •{' '}
                  <button onClick={handleLogout} className="text-purple-600 hover:underline">
                    Sign out
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Signup Modal */}
        {showSignupModal && (
          <div className="modal-overlay" onClick={() => setShowSignupModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create Your Account</h2>
                <button className="modal-close" onClick={() => setShowSignupModal(false)}>×</button>
              </div>
              <SignupForm
                onSuccess={handleSignupSuccess}
                onSwitchToLogin={() => {
                  setShowSignupModal(false);
                  setShowLoginModal(true);
                }}
              />
            </div>
          </div>
        )}

        {/* Login Modal */}
        {showLoginModal && (
          <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Welcome Back</h2>
                <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
              </div>
              <LoginForm
                onSuccess={handleLoginSuccess}
                onSwitchToSignup={() => {
                  setShowLoginModal(false);
                  setShowSignupModal(true);
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Questionnaire View
  if (view === 'questionnaire') {
    return (
      <Questionnaire
        onComplete={handleQuestionnaireComplete}
        onBack={handleStartOver}
      />
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

export default App;
