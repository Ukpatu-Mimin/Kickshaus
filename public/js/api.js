// ===============================================
// API CLIENT - KICKSHAUS E-COMMERCE
// Centralized API logic for frontend-backend communication
// ===============================================

// Determine base URL based on environment
// In production, we serve frontend from the same origin, so relative path is safest.
// For local development with separate frontend/backend, we can default to localhost if needed,
// but since we are serving static files from Express, relative path works everywhere.
const API_URL = '/api';

// Storage keys for authentication
const AUTH_TOKEN_KEY = 'kickshaus_auth_token';
const USER_DATA_KEY = 'kickshaus_user';

const api = {
  /**
   * Get Solana explorer URL for a transaction
   * @param {string} signature - Transaction signature
   * @returns {string} - Full Solscan URL
   */
  getSolanaExplorerUrl(signature) {
    if (!signature || signature === 'N/A') return '#';
    // Use devnet cluster for local development, mainnet for production
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const cluster = isLocal ? '?cluster=devnet' : '';
    return `https://solscan.io/tx/${signature}${cluster}`;
  },

  /**
   * Make an API request
   * @param {string} endpoint - API endpoint (e.g., '/products')
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {Object|null} body - Request body for POST/PUT
   * @param {string|null} token - JWT token for authentication
   * @returns {Promise<Object>} - API response
   */
  async request(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    
    // Use provided token or get from localStorage
    const authToken = token || localStorage.getItem(AUTH_TOKEN_KEY);
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const config = { method, headers };
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, config);
      const data = await response.json();
      
      if (!response.ok) {
        // Handle unauthorized access (expired/invalid token)
        if (response.status === 401 || response.status === 403) {
          this.logout();
          if (!window.location.pathname.includes('login.html') && 
              !window.location.pathname.includes('merchant-login.html')) {
            window.location.href = 'login.html?error=session_expired';
          }
        }
        throw new Error(data.error || data.message || 'API Request Failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // =====================================================
  // AUTH ENDPOINTS
  // =====================================================

  /**
   * Login user (customer, admin, or merchant)
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Login response with token and user
   */
  async login(email, password) {
    const response = await this.request('/auth/login', 'POST', { email, password });
    
    if (response.success && response.data) {
      if (response.data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
        localStorage.setItem('token', response.data.token);
      }
      if (response.data.user) {
        const type = response.data.type || 'user';
        const userData = { 
          ...response.data.user, 
          type: type
        };
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('userType', type);
      }
    }
    
    return response;
  },

  /**
   * Login merchant
   * @param {string} email - Merchant email
   * @param {string} password - Merchant password
   * @returns {Promise<Object>} - Login response
   */
  async loginMerchant(email, password) {
    const response = await this.request('/merchants/login', 'POST', { email, password });
    
    if (response.success && response.data) {
      if (response.data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
        localStorage.setItem('token', response.data.token);
      }
      if (response.data.merchant) {
        const merchantData = { ...response.data.merchant, type: 'merchant' };
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(merchantData));
        localStorage.setItem('user', JSON.stringify(merchantData));
        localStorage.setItem('userType', 'merchant');
      }
    }
    
    return response;
  },

  /**
   * Register a new user
   * @param {string} fullName - User full name
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Registration response
   */
  async register(fullName, email, password) {
    const response = await this.request('/auth/register', 'POST', { 
      full_name: fullName,
      email, 
      password 
    });
    
    if (response.success && response.data) {
      if (response.data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
        localStorage.setItem('token', response.data.token);
      }
      if (response.data.user) {
        const userData = { 
          ...response.data.user, 
          type: response.data.type || 'user' 
        };
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('userType', response.data.type || 'user');
      }
    }
    
    return response;
  },

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
  },

  /**
   * Check if user is authenticated
   * Checks all possible token keys for compatibility
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!(localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('token') || localStorage.getItem('authToken'));
  },

  /**
   * Get current user
   * @returns {Object|null}
   */
  getUser() {
    const userData = localStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  /**
   * Get auth token
   * Checks all possible token keys for compatibility
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('token') || localStorage.getItem('authToken');
  },

  /**
   * Get current user profile from API
   * @returns {Promise<Object>}
   */
  async getProfile() {
    return await this.request('/auth/me', 'GET');
  },

  // =====================================================
  // PRODUCT ENDPOINTS
  // =====================================================

  /**
   * Get all products
   * @param {Object} params - Query parameters (page, limit, category, etc.)
   * @returns {Promise<Object>}
   */
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/products?${queryString}` : '/products';
    return await this.request(endpoint, 'GET');
  },

  /**
   * Get a single product by ID
   * @param {string} id - Product ID
   * @returns {Promise<Object>}
   */
  async getProduct(id) {
    return await this.request(`/products/${id}`, 'GET');
  },

  // =====================================================
  // MERCHANT PRODUCT ENDPOINTS
  // =====================================================

  /**
   * Get merchant's products
   * @returns {Promise<Object>}
   */
  async getMerchantProducts() {
    return await this.request('/merchant/products', 'GET');
  },

  /**
   * Create a new product (merchant only)
   * @param {Object} productData - Product details
   * @returns {Promise<Object>}
   */
  async createProduct(productData) {
    return await this.request('/merchant/products', 'POST', productData);
  },

  /**
   * Update a product (merchant only)
   * @param {string} id - Product ID
   * @param {Object} productData - Updated product details
   * @returns {Promise<Object>}
   */
  async updateProduct(id, productData) {
    return await this.request(`/merchant/products/${id}`, 'PUT', productData);
  },

  /**
   * Delete a product (merchant only)
   * @param {string} id - Product ID
   * @returns {Promise<Object>}
   */
  async deleteProduct(id) {
    return await this.request(`/merchant/products/${id}`, 'DELETE');
  },

  // =====================================================
  // PAYMENT ENDPOINTS
  // =====================================================

  /**
   * Create a payment order
   * @param {Object} orderData - Order details with items
   * @returns {Promise<Object>}
   */
  async createOrder(orderData) {
    return await this.request('/payment/create-order', 'POST', orderData);
  },

  /**
   * Create a transaction for an order
   * @param {string} orderId - Order ID
   * @param {string} account - User's wallet public key
   * @returns {Promise<Object>}
   */
  async createTransaction(orderId, account) {
    return await this.request('/payment/transaction', 'POST', { orderId, account });
  },

  /**
   * Verify payment status
   * @param {string} reference - Payment reference key
   * @returns {Promise<Object>}
   */
  async verifyPayment(reference) {
    return await this.request(`/payment/verify?reference_key=${reference}`, 'GET');
  },

  /**
   * Initialize Paystack payment
   * @param {Object} data - Payment data (items, email, etc.)
   * @returns {Promise<Object>} Paystack authorization data
   */
  async initializePaystack(data) {
    return await this.request('/payment/paystack/initialize', 'POST', data);
  },

  /**
   * Verify Paystack payment
   * @param {string} reference - Paystack reference
   * @returns {Promise<Object>} Payment status
   */
  async verifyPaystack(reference) {
    return await this.request(`/payment/paystack/verify?reference=${reference}`, 'GET');
  },

  /**
   * Get current SOL price
   * @returns {Promise<Object>}
   */
  async getSolPrice() {
    return await this.request('/payment/sol-price', 'GET');
  },

  /**
   * Get Solana chain info (blockhash)
   * @returns {Promise<Object>}
   */
  async getChainInfo() {
    return await this.request('/payment/chain-info', 'GET');
  },

  /**
   * Get user's orders
   * @returns {Promise<Object>}
   */
  async getOrders() {
    return await this.request('/payment/orders', 'GET');
  },

  /**
   * Get order details
   * @param {string} id - Order ID
   * @returns {Promise<Object>}
   */
  async getOrder(id) {
    return await this.request(`/payment/orders/${id}`, 'GET');
  },

  // =====================================================
  // ADMIN ENDPOINTS
  // =====================================================

  /**
   * Get all orders (admin)
   * @returns {Promise<Object>}
   */
  async getAdminOrders() {
    return await this.request('/admin/orders', 'GET');
  },

  /**
   * Get order by ID with items (admin)
   * @param {string} id - Order ID
   * @returns {Promise<Object>}
   */
  async getAdminOrder(id) {
    return await this.request(`/admin/orders/${id}`, 'GET');
  },

  // =====================================================
  // CART ENDPOINTS
  // =====================================================

  /**
   * Validate cart items
   * @param {Array} items - Cart items to validate
   * @returns {Promise<Object>}
   */
  async validateCart(items) {
    return await this.request('/cart/validate', 'POST', { items });
  }
};

// Make globally available
window.api = api;

console.log('✨ Kickshaus API (js/api.js) initialized - Base URL:', API_URL);
