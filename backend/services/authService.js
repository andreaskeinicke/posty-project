const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * Authentication Service
 *
 * Handles user registration, login, and profile management using Supabase Auth
 */
class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - { user, session }
   */
  async register({ email, password, firstName, lastName, gmailAddress }) {
    try {
      // Create auth user with Supabase using regular signup (respects email confirmation settings)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            gmail_address: gmailAddress
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`✅ User registered: ${email} (${data.user.id})`);

      return {
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName,
          lastName,
          gmailAddress
        }
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Sign in user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - { user, session }
   */
  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`✅ User logged in: ${email}`);

      return {
        user: data.user,
        session: data.session,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   */
  async sendPasswordReset(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`📧 Password reset email sent to: ${email}`);

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  /**
   * Update user password
   * @param {string} userId - User ID
   * @param {string} newPassword - New password
   */
  async updatePassword(userId, newPassword) {
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`✅ Password updated for user: ${userId}`);

      return { success: true };
    } catch (error) {
      console.error('Update password error:', error);
      throw new Error(`Update password failed: ${error.message}`);
    }
  }

  /**
   * Get user profile by ID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} - User profile data
   */
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User UUID
   * @param {Object} updates - Profile updates
   */
  async updateUserProfile(userId, updates) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      console.log(`✅ Profile updated for user: ${userId}`);

      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  /**
   * Link anonymous session to user account
   * @param {string} sessionId - Questionnaire session ID
   * @param {string} userId - User UUID
   */
  async linkSessionToUser(sessionId, userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('questionnaire_sessions')
        .update({
          user_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      console.log(`✅ Session ${sessionId} linked to user ${userId}`);

      return data;
    } catch (error) {
      console.error('Link session error:', error);
      throw new Error(`Failed to link session: ${error.message}`);
    }
  }

  /**
   * Verify user email
   * @param {string} token - Email verification token
   */
  async verifyEmail(token) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`✅ Email verified for user: ${data.user.email}`);

      return { user: data.user };
    } catch (error) {
      console.error('Email verification error:', error);
      throw new Error(`Email verification failed: ${error.message}`);
    }
  }

  /**
   * Sign out user
   * @param {string} token - Access token
   */
  async logout(token) {
    try {
      // Supabase handles token invalidation automatically
      // This is mainly for logging purposes
      console.log(`✅ User logged out`);

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error(`Logout failed: ${error.message}`);
    }
  }
}

module.exports = new AuthService();
