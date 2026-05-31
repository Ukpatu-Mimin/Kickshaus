import { z } from 'zod';

// Common validators
const email = z.string().email('Invalid email format');
const password = z.string().min(6, 'Password must be at least 6 characters');
const uuid = z.string().uuid('Invalid ID format');
const positiveNumber = z.number().positive('Must be a positive number');
const nonNegativeInt = z.number().int().nonnegative('Must be a non-negative integer');

// Auth schemas
export const registerUserSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password,
});

export const registerMerchantSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters').max(255),
  email,
  phone: z.string().min(10, 'Phone number must be at least 10 characters').max(50).optional(),
  password,
  wallet_address: z.string()
    .min(32, 'Invalid Solana wallet address')
    .max(44, 'Invalid Solana wallet address')
    .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid Solana wallet address format'),
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password,
});

// Product schemas
export const productImagesSchema = z.object({
  main: z.string().url('Main image must be a valid URL'),
  top: z.string().url('Top image must be a valid URL'),
  left: z.string().url('Left image must be a valid URL'),
  right: z.string().url('Right image must be a valid URL'),
});

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(255),
  description: z.string().max(5000).optional(),
  category: z.string().min(1, 'Category is required').max(100),
  base_price: positiveNumber,
  stock: nonNegativeInt,
  images: productImagesSchema,
});

export const updateProductSchema = createProductSchema.partial();

export const approveProductSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
});

// Cart schemas
export const cartItemSchema = z.object({
  product_id: uuid,
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

export const validateCartSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Cart must have at least one item'),
});

// Order schemas
export const createOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Order must have at least one item'),
  // Delivery details
  contact_name: z.string().min(2, 'Contact name is required').max(255).optional().nullable(),
  contact_email: z.string().email('Invalid email format').optional().nullable(),
  sender_phone: z.string().min(7, 'Sender phone is required').max(50).optional().nullable(),
  receiver_phone: z.string().min(7, 'Receiver phone is required').max(50).optional().nullable(),
  shipping_address: z.string().min(4, 'Shipping address is required').max(500).optional().nullable(),
  city: z.string().min(2, 'City is required').max(100).optional().nullable(),
  state: z.string().min(2, 'State is required').max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const verifyPaymentSchema = z.object({
  reference_key: z.string().min(1, 'Reference key is required'),
});

export const createTransactionSchema = z.object({
  orderId: uuid,
  account: z.string().min(1, 'Account public key is required'),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest']).optional(),
});

// Type exports
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterMerchantInput = z.infer<typeof registerMerchantSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type ValidateCartInput = z.infer<typeof validateCartSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
