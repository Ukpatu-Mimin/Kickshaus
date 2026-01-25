-- ==========================================
-- KICKSHAUS E-COMMERCE DATABASE SCHEMA
-- Supabase PostgreSQL Database
-- ==========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. PROFILES TABLE
-- Extends Supabase auth.users with role-based access
-- ==========================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'merchant', 'customer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==========================================
-- 2. MERCHANTS TABLE
-- Business details for merchant accounts
-- ==========================================
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_email TEXT NOT NULL,
  business_phone TEXT,
  business_address TEXT,
  business_description TEXT,
  logo_url TEXT,
  wallet_address TEXT, -- Solana wallet for receiving payments
  commission_rate DECIMAL(5, 2) DEFAULT 10.00, -- Platform commission percentage
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  application_date TIMESTAMPTZ DEFAULT NOW(),
  approved_date TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for merchants
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Merchants can view their own data" ON merchants;
DROP POLICY IF EXISTS "Merchants can update their own data" ON merchants;
DROP POLICY IF EXISTS "Admins can view all merchants" ON merchants;

-- Policies for merchants
CREATE POLICY "Merchants can view their own data" 
  ON merchants FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Merchants can update their own data" 
  ON merchants FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all merchants" 
  ON merchants FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 3. PRODUCTS TABLE
-- Product catalog with JSONB for flexible data
-- ==========================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  brand TEXT,
  category TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
  compare_at_price DECIMAL(12, 2), -- Original price for discounts
  currency TEXT DEFAULT 'NGN',
  
  -- Images stored as JSONB array
  images JSONB DEFAULT '[]'::jsonb,
  
  -- Product angles for 360 view (front, back, left, right)
  angles JSONB DEFAULT '{
    "front": null,
    "back": null,
    "left": null,
    "right": null
  }'::jsonb,
  
  -- Inventory
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold INTEGER DEFAULT 10,
  sku TEXT UNIQUE,
  
  -- Product variants (sizes, colors)
  sizes JSONB DEFAULT '[]'::jsonb, -- e.g., ["40", "41", "42"]
  colors JSONB DEFAULT '[]'::jsonb, -- e.g., ["black", "white", "brown"]
  
  -- Metadata
  badge TEXT CHECK (badge IN ('new', 'bestseller', 'sale', 'limited', NULL)),
  rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster searches
-- Create indexes for products
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Enable RLS for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Merchants can manage their products" ON products;
DROP POLICY IF EXISTS "Admins can manage all products" ON products;

-- Policies for products
CREATE POLICY "Anyone can view active products" 
  ON products FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Merchants can manage their products" 
  ON products FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM merchants 
      WHERE merchants.id = products.merchant_id 
      AND merchants.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all products" 
  ON products FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 4. ORDERS TABLE
-- Customer orders with payment tracking
-- ==========================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL, -- Human-readable order ID (e.g., ORD-001)
  customer_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Order totals
  subtotal DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  shipping_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  
  -- Shipping details
  shipping_address JSONB NOT NULL, -- {street, city, state, country, postal_code}
  billing_address JSONB,
  
  -- Contact
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_name TEXT NOT NULL,
  
  -- Order status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 
    'payment_pending',
    'paid',
    'processing', 
    'shipped', 
    'delivered',
    'completed', 
    'cancelled', 
    'refunded'
  )),
  
  -- Payment details
  payment_method TEXT CHECK (payment_method IN ('solana_pay', 'card', 'bank_transfer', 'cash_on_delivery')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_reference TEXT, -- Solana transaction signature or payment gateway reference
  
  -- Solana Pay specific
  solana_reference TEXT, -- Unique reference for Solana Pay verification
  solana_tx_signature TEXT, -- Blockchain transaction signature
  
  -- Coupon/Discount
  coupon_code TEXT,
  
  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Create indexes for orders
-- Create indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Enable RLS for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Customers can view their own orders" ON orders;
DROP POLICY IF EXISTS "Admins and merchants can view orders" ON orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;

-- Policies for orders
CREATE POLICY "Customers can view their own orders" 
  ON orders FOR SELECT 
  USING (customer_id = auth.uid());

CREATE POLICY "Admins and merchants can view orders" 
  ON orders FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'merchant')
    )
  );

CREATE POLICY "Admins can manage all orders" 
  ON orders FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 5. ORDER_ITEMS TABLE
-- Individual items within an order
-- ==========================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  
  -- Product snapshot (in case product is deleted/changed)
  product_name TEXT NOT NULL,
  product_image TEXT,
  product_sku TEXT,
  
  -- Variant details
  size TEXT,
  color TEXT,
  
  -- Pricing
  unit_price DECIMAL(12, 2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(12, 2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for order items
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_merchant ON order_items(merchant_id);

-- Enable RLS for order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their order items" ON order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;

-- Policies for order_items (inherit from orders)
CREATE POLICY "Users can view their order items" 
  ON order_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all order items" 
  ON order_items FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 6. REVIEWS TABLE
-- Product reviews from customers
-- ==========================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  
  -- Review moderation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Helpful votes
  helpful_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- Enable RLS for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON reviews;
DROP POLICY IF EXISTS "Customers can create reviews" ON reviews;
DROP POLICY IF EXISTS "Customers can update their own reviews" ON reviews;

-- Policies for reviews
CREATE POLICY "Anyone can view approved reviews" 
  ON reviews FOR SELECT 
  USING (status = 'approved');

CREATE POLICY "Customers can create reviews" 
  ON reviews FOR INSERT 
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update their own reviews" 
  ON reviews FOR UPDATE 
  USING (customer_id = auth.uid());

-- ==========================================
-- 7. FAVORITES TABLE
-- Customer product favorites/wishlist
-- ==========================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(customer_id, product_id)
);

-- Create index for favorites
CREATE INDEX IF NOT EXISTS idx_favorites_customer ON favorites(customer_id);

-- Enable RLS for favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their favorites" ON favorites;

-- Policies for favorites
CREATE POLICY "Users can manage their favorites" 
  ON favorites FOR ALL 
  USING (customer_id = auth.uid());

-- ==========================================
-- 8. CART TABLE
-- Persistent shopping cart
-- ==========================================
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  size TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(customer_id, product_id, size, color)
);

-- Create index for cart
CREATE INDEX IF NOT EXISTS idx_cart_customer ON cart_items(customer_id);

-- Enable RLS for cart
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their cart" ON cart_items;

-- Policies for cart
CREATE POLICY "Users can manage their cart" 
  ON cart_items FOR ALL 
  USING (customer_id = auth.uid());

-- ==========================================
-- 9. COUPONS TABLE
-- Discount codes
-- ==========================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  
  min_order_amount DECIMAL(12, 2) DEFAULT 0,
  max_discount_amount DECIMAL(12, 2),
  
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for coupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON coupons;

-- Policies for coupons
CREATE POLICY "Anyone can view active coupons" 
  ON coupons FOR SELECT 
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Admins can manage coupons" 
  ON coupons FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 10. PAYMENT_TRANSACTIONS TABLE
-- Payment transaction log
-- ==========================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Payment details
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  
  -- Solana Pay specific
  solana_reference TEXT,
  solana_tx_signature TEXT,
  solana_amount DECIMAL(20, 9), -- SOL/USDC amount
  solana_token TEXT, -- 'SOL' or 'USDC'
  
  -- Response from payment processor
  gateway_response JSONB,
  
  -- Error details if failed
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- Create indexes for payment transactions
CREATE INDEX IF NOT EXISTS idx_payment_tx_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_reference ON payment_transactions(solana_reference);
CREATE INDEX IF NOT EXISTS idx_payment_tx_signature ON payment_transactions(solana_tx_signature);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their payment transactions" ON payment_transactions;

-- Policies
CREATE POLICY "Users can view their payment transactions" 
  ON payment_transactions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = payment_transactions.order_id 
      AND orders.customer_id = auth.uid()
    )
  );

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM orders;
  new_number := 'ORD-' || LPAD(counter::TEXT, 5, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update product rating
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products 
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0) 
      FROM reviews 
      WHERE product_id = NEW.product_id AND status = 'approved'
    ),
    review_count = (
      SELECT COUNT(*) 
      FROM reviews 
      WHERE product_id = NEW.product_id AND status = 'approved'
    ),
    updated_at = NOW()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_change ON reviews;
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_merchants_updated_at ON merchants;
CREATE TRIGGER update_merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- SEED DATA (Optional - for development)
-- ==========================================

-- Insert default admin user (you'll need to create this user via Supabase Auth first)
-- Then manually update their role:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@kickshaus.com';

-- Insert sample coupon
INSERT INTO coupons (code, description, discount_type, discount_value, is_active)
VALUES ('SAVE500', 'Save ₦500 on your order', 'fixed', 500, true)
ON CONFLICT (code) DO NOTHING;
