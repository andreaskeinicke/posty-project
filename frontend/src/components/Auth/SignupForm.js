import React, { useState } from 'react';
import axios from 'axios';
import './Auth.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Signup Form Component
 *
 * Used in the "Sign up to continue" gate before checkout
 */
const SignupForm = ({ onSuccess, selectedDomain, sessionId }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    gmailAddress: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (formData.gmailAddress && !formData.gmailAddress.endsWith('@gmail.com')) {
      setError('Please enter a valid Gmail address');
      setLoading(false);
      return;
    }

    try {
      // 1. Register user
      const registerResponse = await axios.post(`${API_URL}/api/auth/register`, {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gmailAddress: formData.gmailAddress
      });

      console.log('✅ User registered:', registerResponse.data);

      // 2. Auto-login after registration
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
        email: formData.email,
        password: formData.password
      });

      console.log('✅ User logged in:', loginResponse.data);

      // 3. Save token to localStorage
      localStorage.setItem('accessToken', loginResponse.data.accessToken);
      localStorage.setItem('refreshToken', loginResponse.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(loginResponse.data.user));

      // 4. Link anonymous session to user (if sessionId provided)
      if (sessionId) {
        await axios.post(
          `${API_URL}/api/auth/link-session`,
          { sessionId },
          {
            headers: {
              Authorization: `Bearer ${loginResponse.data.accessToken}`
            }
          }
        );
      }

      // 5. Call success callback
      if (onSuccess) {
        onSuccess(loginResponse.data.user, loginResponse.data.accessToken);
      }
    } catch (err) {
      console.error('Signup error:', err);

      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-form-container">
      <div className="signup-header">
        <h2>Create your Posty account</h2>
        {selectedDomain && (
          <p className="selected-domain">
            You've selected: <strong>{selectedDomain}</strong>
          </p>
        )}
        <p className="subtitle">Almost there! Just a few details to get started.</p>
      </div>

      <form onSubmit={handleSubmit} className="signup-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">First Name *</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              placeholder="Andreas"
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name *</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              placeholder="Gustavsen"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="your@email.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="gmailAddress">Your Gmail Address *</label>
          <p className="helper-text">
            We'll forward emails from <strong>{selectedDomain || 'your domain'}</strong> to this Gmail
          </p>
          <input
            type="email"
            id="gmailAddress"
            name="gmailAddress"
            value={formData.gmailAddress}
            onChange={handleChange}
            required
            placeholder="yourname@gmail.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password *</label>
          <div className="password-input">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password *</label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            minLength={8}
            placeholder="Repeat password"
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary btn-submit"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Continue to Checkout'}
        </button>

        <p className="terms-text">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </form>
    </div>
  );
};

export default SignupForm;
