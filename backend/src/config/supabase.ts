import { createClient } from '@supabase/supabase-js';
import { config } from './env';

// Create Supabase client for public operations (respects RLS)
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      persistSession: false,
    },
  }
);

// Create Supabase admin client for privileged operations (bypasses RLS)
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      persistSession: false,
    },
  }
);
