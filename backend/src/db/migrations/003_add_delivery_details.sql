-- =====================================================
-- ADD DELIVERY/SHIPPING DETAILS TO ORDERS
-- =====================================================
-- Adds columns to store delivery information captured on the frontend

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS receiver_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS shipping_address VARCHAR(500),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS notes TEXT;
