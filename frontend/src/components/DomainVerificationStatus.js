import React, { useState } from 'react';
import axios from 'axios';
import { supabase } from '../config/supabaseClient';

/**
 * Domain Verification Status Component
 * Displays verification status and allows resending verification email
 */
function DomainVerificationStatus({ domain, onVerificationUpdate }) {
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResendVerification = async () => {
    try {
      setResending(true);
      setResendMessage('');

      // Get user session for auth
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Please log in to resend verification email');
      }

      // Call backend to resend verification
      const response = await axios.post('/api/verification/resend', {
        domainName: domain.domain_name
      }, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.data.success) {
        setResendMessage(`Verification email sent to ${response.data.sentTo}`);
        // Notify parent component
        if (onVerificationUpdate) {
          onVerificationUpdate();
        }
      } else {
        throw new Error(response.data.error || 'Failed to resend');
      }

    } catch (err) {
      console.error('Resend verification error:', err);
      setResendMessage(err.response?.data?.message || err.message || 'Failed to resend email');
    } finally {
      setResending(false);
    }
  };

  // Domain is verified
  if (domain.cloudflare_destination_verified) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-green-800">
              Email Verified
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>Your domain is fully active and email forwarding is enabled.</p>
              {domain.email_forwarding_destination && (
                <p className="mt-1">
                  Forwarding to: <span className="font-semibold">{domain.email_forwarding_destination}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Domain is pending verification
  if (domain.status === 'pending_verification' || domain.status === 'registered') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Email Verification Required
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p className="mb-2">
                We've sent a verification email to <span className="font-semibold">{domain.email_forwarding_destination}</span>
              </p>
              <p className="mb-3">
                Please check your inbox and click the verification link to activate email forwarding.
              </p>

              {resendMessage && (
                <div className={`mb-3 p-2 rounded ${resendMessage.includes('sent') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {resendMessage}
                </div>
              )}

              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Resend Verification Email'
                )}
              </button>
            </div>

            {domain.verification_sent_at && (
              <p className="mt-3 text-xs text-yellow-600">
                Last sent: {new Date(domain.verification_sent_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Domain setup in progress
  if (domain.status === 'registered' || domain.status === 'cloudflare_zone_created' || domain.status === 'nameservers_updated') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">
              Setup In Progress
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>We're setting up your domain and email forwarding. This usually takes a few minutes.</p>
              <p className="mt-2 text-xs">Status: {domain.status}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (domain.status?.includes('failed')) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Setup Failed
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>There was an error setting up your domain.</p>
              {domain.error_message && (
                <p className="mt-2 text-xs font-mono bg-red-100 p-2 rounded">{domain.error_message}</p>
              )}
              <p className="mt-3">
                Please contact support for assistance.{' '}
                <a href="mailto:support@posty.com" className="underline font-semibold">
                  support@posty.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default DomainVerificationStatus;
