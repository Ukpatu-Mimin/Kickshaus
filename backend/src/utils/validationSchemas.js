/**
 * ==========================================
 * ZOD VALIDATION SCHEMAS
 * ==========================================
 * Centralized validation schemas for all API endpoints
 */

const { z } = require('zod');
const { PRODUCT_BADGES, ORDER_STATUS, PAYMENT_STATUS, ROLES } = require('../config/constants');

// ==========================================
// Common Schemas
// ==========================================

const uuidSchema = z.string().uuid('Invalid UUID format');

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// ==========================================
// Auth Schemas
// ==========================================

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  phone: z.string().optional(),
  role: z.enum([ROLES.CUSTOMER, ROLES.MERCHANT]).default(ROLES.CUSTOMER)
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional()
});

// ==========================================
// Product Schemas
// ==========================================

const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  brand: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be a positive number'),
  compareAtPrice: z.number().positive().optional(),
  currency: z.string().default('NGN'),
  images: z.array(z.string().url()).default([]),
  angles: z.object({
    front: z.string().url().nullable().optional(),
    back: z.string().url().nullable().optional(),
    left: z.string().url().nullable().optional(),
    right: z.string().url().nullable().optional()
  }).optional(),
  stock: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(10),
  sku: z.string().optional(),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  badge: z.enum(PRODUCT_BADGES).nullable().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false)
});

const updateProductSchema = productSchema.partial();

const productQuerySchema = paginationSchema.extend({
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  inStock: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  search: z.string().optional(),
  merchantId: z.string().uuid().optional()
});

// ==========================================
// Order Schemas
// ==========================================

const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().default('Nigeria'),
  postalCode: z.string().optional()
});

const orderItemSchema = z.object({
  productId: uuidSchema,
  quantity: z.number().int().positive('Quantity must be at least 1'),
  size: z.string().optional(),
  color: z.string().optional()
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  customerName: z.string().min(2, 'Customer name is required'),
  customerEmail: z.string().email('Valid email is required'),
  customerPhone: z.string().optional(),
  customerNotes: z.string().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(['solana_pay', 'card', 'bank_transfer', 'cash_on_delivery']).default('solana_pay')
});

const updateOrderStatusSchema = z.object({
  status: z.enum(Object.values(ORDER_STATUS)),
  internalNotes: z.string().optional()
});

const orderQuerySchema = paginationSchema.extend({
  status: z.enum(Object.values(ORDER_STATUS)).optional(),
  paymentStatus: z.enum(Object.values(PAYMENT_STATUS)).optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// ==========================================
// Payment Schemas
// ==========================================

const createPaymentSchema = z.object({
  orderId: uuidSchema,
  token: z.enum(['SOL', 'USDC']).default('USDC'),
  amount: z.number().positive('Amount must be positive')
});

const verifyPaymentSchema = z.object({
  reference: z.string().min(1, 'Payment reference is required'),
  orderId: uuidSchema.optional()
});

// ==========================================
// Merchant Schemas
// ==========================================

const merchantApplicationSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessEmail: z.string().email('Valid business email is required'),
  businessPhone: z.string().optional(),
  businessAddress: z.string().optional(),
  businessDescription: z.string().optional(),
  walletAddress: z.string().optional() // Solana wallet address
});

const updateMerchantStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'suspended']),
  reason: z.string().optional()
});

// ==========================================
// Review Schemas
// ==========================================

const createReviewSchema = z.object({
  productId: uuidSchema,
  orderId: uuidSchema.optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional()
});

const updateReviewStatusSchema = z.object({
  status: z.enum(['approved', 'rejected'])
});

// ==========================================
// Cart Schemas
// ==========================================

const addToCartSchema = z.object({
  productId: uuidSchema,
  quantity: z.number().int().positive().default(1),
  size: z.string().optional(),
  color: z.string().optional()
});

const updateCartItemSchema = z.object({
  quantity: z.number().int().positive('Quantity must be at least 1')
});

// ==========================================
// Coupon Schemas
// ==========================================

const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  orderTotal: z.number().nonnegative().optional()
});

module.exports = {
  // Common
  uuidSchema,
  paginationSchema,
  
  // Auth
  signupSchema,
  loginSchema,
  updateProfileSchema,
  
  // Products
  productSchema,
  updateProductSchema,
  productQuerySchema,
  
  // Orders
  addressSchema,
  orderItemSchema,
  createOrderSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
  
  // Payments
  createPaymentSchema,
  verifyPaymentSchema,
  
  // Merchants
  merchantApplicationSchema,
  updateMerchantStatusSchema,
  
  // Reviews
  createReviewSchema,
  updateReviewStatusSchema,
  
  // Cart
  addToCartSchema,
  updateCartItemSchema,
  
  // Coupons
  validateCouponSchema
};
