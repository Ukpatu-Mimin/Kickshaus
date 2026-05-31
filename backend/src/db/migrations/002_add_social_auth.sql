-- =====================================================
-- SOCIAL AUTHENTICATION MIGRATION
-- =====================================================
-- This migration adds support for Google and Facebook OAuth
-- to the existing users table
-- =====================================================

-- Make password_hash nullable (social users won't have a password)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add provider column with default 'email' for existing users
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(20) NOT NULL DEFAULT 'email';

-- Add Google and Facebook ID columns (unique, nullable)
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255) UNIQUE;

-- Add constraint to ensure provider is valid
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_provider_check;
ALTER TABLE users ADD CONSTRAINT users_provider_check CHECK (provider IN ('email', 'google', 'facebook'));

-- Create indexes for faster lookups on social IDs
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id) WHERE facebook_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);

-- Add a check constraint to ensure email users have password_hash
-- and social users have the corresponding provider ID
-- Note: This is implemented at application level for flexibility
