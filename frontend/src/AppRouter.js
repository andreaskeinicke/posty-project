import React from 'react';
import { Routes, Route } from 'react-router-dom';
import App from './App';
import VerifyEmail from './components/VerifyEmail';
import CheckoutSuccess from './components/CheckoutSuccess';
import CheckoutCanceled from './components/CheckoutCanceled';

/**
 * App Router - handles routing for the application
 */
function AppRouter() {
  return (
    <Routes>
      {/* Checkout routes */}
      <Route path="/checkout/success" element={<CheckoutSuccess />} />
      <Route path="/checkout/canceled" element={<CheckoutCanceled />} />

      {/* Email verification page */}
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Main application - catch all */}
      <Route path="/*" element={<App />} />
    </Routes>
  );
}

export default AppRouter;
