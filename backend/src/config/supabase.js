/**
 * ==========================================
 * SUPABASE CLIENT CONFIGURATION
 * ==========================================
 * Initializes and exports Supabase clients for database operations
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please check your .env file');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Public Supabase client
 * Uses the anonymous key - respects Row Level Security (RLS)
 * Use this for operations that should respect user permissions
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});

/**
 * Admin Supabase client
 * Uses the service role key - BYPASSES Row Level Security (RLS)
 * Use this for admin operations, background jobs, and server-side operations
 * ⚠️ NEVER expose this client to the frontend
 */
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

/**
 * Create a Supabase client with a specific user's JWT
 * This allows operations to be performed as that user with RLS applied
 * 
 * @param {string} accessToken - The user's JWT access token
 * @returns {SupabaseClient} - A Supabase client authenticated as the user
 */
const createUserClient = (accessToken) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
};

module.exports = {
  supabase,
  supabaseAdmin,
  createUserClient,
  supabaseUrl,
  supabaseAnonKey
};
