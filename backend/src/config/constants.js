/**
 * ==========================================
 * APPLICATION CONSTANTS
 * ==========================================
 */

module.exports = {
  // User roles
  ROLES: {
    ADMIN: 'admin',
    MERCHANT: 'merchant',
    CUSTOMER: 'customer'
  },

  // Order statuses
  ORDER_STATUS: {
    PENDING: 'pending',
    PAYMENT_PENDING: 'payment_pending',
    PAID: 'paid',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  },

  // Payment statuses
  PAYMENT_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },

  // Payment methods
  PAYMENT_METHODS: {
    SOLANA_PAY: 'solana_pay',
    CARD: 'card',
    BANK_TRANSFER: 'bank_transfer',
    CASH_ON_DELIVERY: 'cash_on_delivery'
  },

  // Product badges
  PRODUCT_BADGES: ['new', 'bestseller', 'sale', 'limited'],

  // Review statuses
  REVIEW_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  },

  // Merchant statuses
  MERCHANT_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended'
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },

  // Currency
  DEFAULT_CURRENCY: 'NGN',

  // Solana tokens
  SOLANA_TOKENS: {
    SOL: 'SOL',
    USDC: 'USDC'
  }
};
