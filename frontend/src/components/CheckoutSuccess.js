import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function CheckoutSuccess() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const sessionId = queryParams.get('session_id');

    if (sessionId) {
      // Fetch session details from backend
      axios.get(`${API_BASE_URL}/api/checkout/success?session_id=${sessionId}`)
        .then(response => {
          setSession(response.data.session);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching session:', err);
          setError('Failed to load checkout details');
          setLoading(false);
        });
    } else {
      setError('No session ID provided');
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Return Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Posty!
          </h1>
          <p className="text-gray-600 mb-6">
            Your payment was successful. We're setting up your domain.
          </p>

          {session?.metadata?.domainName && (
            <div className="bg-purple-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Your Domain</p>
              <p className="text-xl font-bold text-purple-700">
                {session.metadata.domainName}
              </p>
            </div>
          )}

          <div className="space-y-3 text-left mb-8">
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-green-600 font-bold">✓</span>
              <span>Payment confirmed</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-green-600 font-bold">✓</span>
              <span>Domain registration initiated</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-green-600 font-bold">✓</span>
              <span>Email forwarding will be set up</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              What's Next?
            </p>
            <p className="text-sm text-blue-800">
              You'll receive an email with instructions on how to set up your Gmail integration.
              Your domain will be active within 24 hours.
            </p>
          </div>

          <a
            href="/"
            className="inline-block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-center"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export default CheckoutSuccess;
