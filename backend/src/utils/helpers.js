/**
 * ==========================================
 * UTILITY HELPERS
 * ==========================================
 * Common utility functions used across the application
 */

/**
 * Generate a unique order number
 * Format: ORD-XXXXXXXX (8 random alphanumeric characters)
 */
const generateOrderNumber = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ORD-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate a unique SKU
 * Format: SKU-XXXXXX (6 random alphanumeric characters)
 */
const generateSKU = (prefix = 'SKU') => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = `${prefix}-`;
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Convert price from NGN to USD (approximate rate)
 * @param {number} ngnAmount - Amount in Nigerian Naira
 * @returns {number} Amount in USD
 */
const ngnToUsd = (ngnAmount) => {
  const rate = 1500; // 1 USD = ~1500 NGN (update this based on current rates)
  return ngnAmount / rate;
};

/**
 * Convert USD to USDC (1:1)
 * @param {number} usdAmount - Amount in USD
 * @returns {number} Amount in USDC
 */
const usdToUsdc = (usdAmount) => {
  return usdAmount; // USDC is pegged 1:1 to USD
};

/**
 * Convert NGN to USDC
 * @param {number} ngnAmount - Amount in Nigerian Naira
 * @returns {number} Amount in USDC
 */
const ngnToUsdc = (ngnAmount) => {
  return usdToUsdc(ngnToUsd(ngnAmount));
};

/**
 * Format currency for display
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: NGN)
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = 'NGN') => {
  const formatters = {
    NGN: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }),
    USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    SOL: (val) => `${val.toFixed(4)} SOL`,
    USDC: (val) => `${val.toFixed(2)} USDC`
  };
  
  const formatter = formatters[currency];
  if (typeof formatter === 'function') {
    return formatter(amount);
  }
  return formatter ? formatter.format(amount) : `${amount} ${currency}`;
};

/**
 * Create a URL-friendly slug from a string
 * @param {string} text - Text to slugify
 * @returns {string} URL-friendly slug
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Calculate pagination metadata
 * @param {number} total - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
const getPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in ms
 * @returns {Promise<any>} Result of the function
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(baseDelay * Math.pow(2, i));
      }
    }
  }
  
  throw lastError;
};

/**
 * Remove null/undefined values from an object
 * @param {object} obj - Object to clean
 * @returns {object} Cleaned object
 */
const cleanObject = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v != null)
  );
};

/**
 * Convert camelCase to snake_case
 * @param {string} str - String to convert
 * @returns {string} snake_case string
 */
const toSnakeCase = (str) => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * Convert snake_case to camelCase
 * @param {string} str - String to convert
 * @returns {string} camelCase string
 */
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Convert object keys from camelCase to snake_case
 * @param {object} obj - Object to convert
 * @returns {object} Object with snake_case keys
 */
const keysToSnakeCase = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(keysToSnakeCase);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        toSnakeCase(key),
        keysToSnakeCase(value)
      ])
    );
  }
  return obj;
};

/**
 * Convert object keys from snake_case to camelCase
 * @param {object} obj - Object to convert
 * @returns {object} Object with camelCase keys
 */
const keysToCamelCase = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(keysToCamelCase);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        toCamelCase(key),
        keysToCamelCase(value)
      ])
    );
  }
  return obj;
};

module.exports = {
  generateOrderNumber,
  generateSKU,
  ngnToUsd,
  usdToUsdc,
  ngnToUsdc,
  formatCurrency,
  slugify,
  getPaginationMeta,
  sleep,
  retryWithBackoff,
  cleanObject,
  toSnakeCase,
  toCamelCase,
  keysToSnakeCase,
  keysToCamelCase
};
