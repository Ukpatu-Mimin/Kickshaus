import { Request } from 'express';

// User roles
export type UserRole = 'customer' | 'admin';
export type MerchantStatus = 'pending' | 'approved' | 'rejected';
export type ProductStatus = 'pending_approval' | 'live' | 'rejected';
export type PaymentStatus = 'pending' | 'confirmed' | 'failed';
export type FulfillmentStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type AuthProvider = 'email' | 'google' | 'facebook';

// Database entities
export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  full_name: string | null;
  role: UserRole;
  provider: AuthProvider;
  google_id: string | null;
  facebook_id: string | null;
  created_at: string;
  updated_at: string;
}

// Auth types
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'user' | 'merchant' | 'admin';
  merchantId?: string;
}

// Passport user type - used when authenticated via social OAuth
export type PassportUser = Omit<User, 'password_hash'>;

// Extend Express namespace to handle both JWT and Passport auth
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    // Use a union type to support both JwtPayload (for JWT auth) and PassportUser (for social OAuth)
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends JwtPayload {}
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface Merchant {
  id: string;
  business_name: string;
  email: string;
  phone: string;
  password_hash: string;
  status: MerchantStatus;
  wallet_address: string;
  created_at: string;
  updated_at: string;
}

export interface ProductImages {
  main: string;
  top: string;
  left: string;
  right: string;
}

export interface Product {
  id: string;
  merchant_id: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  stock: number;
  images: ProductImages;
  status: ProductStatus;
  solana_price?: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount_fiat: number;
  total_amount_sol: number;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  transaction_signature?: string;
  reference_key: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
}

// API Request/Response types
export interface CartItem {
  product_id: string;
  quantity: number;
}

export interface CartValidationResponse {
  success: boolean;
  items: {
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    in_stock: boolean;
    available_stock: number;
  }[];
  total_fiat: number;
  currency: string;
}

export interface CreateOrderRequest {
  items: CartItem[];
  shipping_address?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  order_id: string;
  reference_key: string;
  total_fiat: number;
  total_sol: number;
  solana_pay_url: string;
  qr_code_data: string;
  expires_at: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  status: PaymentStatus;
  transaction_signature?: string;
  order_id?: string;
}

// Error types
export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
