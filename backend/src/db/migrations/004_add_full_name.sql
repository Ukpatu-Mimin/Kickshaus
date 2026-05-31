-- =====================================================
-- ADD FULL NAME TO USERS
-- =====================================================
-- Adds full_name column to users table to fix "Guest User" issue

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Update existing users to have a default name if null (optional)
-- UPDATE users SET full_name = 'User' WHERE full_name IS NULL;
