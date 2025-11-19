import React from 'react';

function CheckoutCanceled() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🤔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Checkout Canceled
          </h1>
          <p className="text-gray-600 mb-8">
            No worries! You can return to find your perfect domain anytime.
          </p>

          <div className="space-y-3 mb-8">
            <a
              href="/"
              className="block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-center"
            >
              Back to Domain Search
            </a>
            <a
              href="mailto:support@posty.com"
              className="block w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium text-center"
            >
              Contact Support
            </a>
          </div>

          <p className="text-sm text-gray-500">
            Need help? We're here to assist you!
          </p>
        </div>
      </div>
    </div>
  );
}

export default CheckoutCanceled;
