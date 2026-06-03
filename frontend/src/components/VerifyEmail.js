import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Email Verification Component
 * Handles the email verification flow when user clicks link from email
 * URL: /verify-email?token=xxx&domain=example.com
 */
function VerifyEmail() {
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    verifyEmail();
  }, []);

  const verifyEmail = async () => {
    try {
      // Get token and domain from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const domainName = urlParams.get('domain');

      if (!token || !domainName) {
        throw new Error('Invalid verification link');
      }

      setDomain(domainName);
      setStatus('verifying');

      // Call backend verification endpoint
      const response = await axios.get(`/api/verification/verify-email`, {
        params: { token, domain: domainName }
      });

      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
      } else {
        throw new Error(response.data.message || 'Verification failed');
      }

    } catch (err) {
      console.error('Verification error:', err);
      setStatus('error');
      setError(err.response?.data?.message || err.message || 'Verification failed');
    }
  };

  // Verifying state
  if (status === 'verifying') {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md">
          <div className="mb-6">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Verifying Your Email</h2>
          <p className="text-gray-600">
            Please wait while we verify your email address...
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-xl">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">Email Verified!</h2>

          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
            <p className="text-lg text-gray-700 mb-2">
              Your email has been successfully verified for
            </p>
            <p className="text-2xl font-bold text-green-600 mb-4">
              {domain}
            </p>
            <p className="text-sm text-gray-600">
              Email forwarding is now active! All emails sent to any address @{domain} will be forwarded to your verified email address.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
            <ul className="text-left text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Start using your new email address right away</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>All emails will be forwarded to your Gmail automatically</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Set up Gmail to send emails from your custom domain (optional)</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => window.location.href = '/'}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-xl">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">Verification Failed</h2>

          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <p className="text-gray-700 mb-2">{error}</p>
            {error.includes('expired') && (
              <p className="text-sm text-gray-600 mt-4">
                Your verification link has expired. You can request a new one from your dashboard.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
            >
              Go to Dashboard
            </button>

            <p className="text-sm text-gray-600">
              Need help?{' '}
              <a href="mailto:support@posty.com" className="text-purple-600 hover:underline">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default VerifyEmail;
