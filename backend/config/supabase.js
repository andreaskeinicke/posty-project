const { createClient } = require('@supabase/supabase-js');

/**
 * Supabase Client Configuration
 *
 * Two clients:
 * 1. supabase - Uses anon key (limited by RLS policies)
 * 2. supabaseAdmin - Uses service_role key (bypasses RLS, for backend operations)
 */

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Missing SUPABASE_SERVICE_ROLE_KEY - admin operations will fail');
}

/**
 * Regular Supabase client (respects RLS)
 * Use this when performing operations on behalf of a user
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // Server-side doesn't need session persistence
      detectSessionInUrl: false
    }
  }
);

/**
 * Admin Supabase client (bypasses RLS)
 * Use this for:
 * - Stripe webhooks (creating subscriptions, updating domains)
 * - Background jobs (checking domain expiration, etc.)
 * - Admin operations
 */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Verify JWT token and get user
 * @param {string} token - JWT token from Authorization header
 * @returns {Promise<Object>} - User object
 */
async function verifyToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid or expired token');
  }

  return user;
}

/**
 * Get user by ID (admin operation)
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} - User data
 */
async function getUserById(userId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data;
}

/**
 * Create or update user profile
 * @param {string} userId - User UUID from auth.users
 * @param {Object} profileData - User profile data
 */
async function upsertUserProfile(userId, profileData) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert({
      id: userId,
      ...profileData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert user profile: ${error.message}`);
  }

  return data;
}

module.exports = {
  supabase,
  supabaseAdmin,
  verifyToken,
  getUserById,
  upsertUserProfile
};
