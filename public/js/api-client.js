// ===============================================
// API CLIENT - KICKSHAUS E-COMMERCE
// Handles all communication with the backend API
// ===============================================

// Determine base URL based on environment
const API_BASE_URL = '/api';

const KickshausAPI = {
  // Auth token storage key
  TOKEN_KEY: 'kickshaus_auth_token',
  USER_KEY: 'kickshaus_user',
  
  // Get stored auth token (checks all possible keys for compatibility)
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY) 
      || localStorage.getItem('token') 
      || localStorage.getItem('authToken');
  },
  
  // Set auth token (sets both keys for compatibility)
  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem('token', token);
  },
  
  // Remove auth token
  removeToken() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
  },
  
  // Get stored user data
  getUser() {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },
  
  // Set user data
  setUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },
  
  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  },
  
  // Make API request
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Add auth token if available
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle unauthorized access (expired/invalid token)
        if (response.status === 401 || response.status === 403) {
          this.removeToken();
          // Avoid infinite redirect loop if already on login pages
          if (!window.location.pathname.includes('login.html') && 
              !window.location.pathname.includes('merchant-login.html')) {
            window.location.href = 'login.html?error=session_expired';
          }
        }
        throw new Error(data.error || data.message || 'Request failed');
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
   * Register a new customer
   * @param {string} fullName - User full name
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Registration response with user and token
   */
  async register(fullName, email, password) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ 
        full_name: fullName,
        email, 
        password 
      }),
    });
    
    if (response.success && response.data) {
      // Store token and user data
      if (response.data.token) {
        this.setToken(response.data.token);
      }
      if (response.data.user) {
        // Add type from response or default to 'user'
        const userData = { 
          ...response.data.user, 
          type: response.data.type || 'user' 
        };
        this.setUser(userData);
      }
    }
    
    return response;
  },
  
  /**
   * Login user (customer or admin)
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login response with user and token
   */
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.success && response.data) {
      // Store token and user data
      if (response.data.token) {
        this.setToken(response.data.token);
      }
      if (response.data.user) {
        // Add type from response or default to 'user'
        const userData = { 
          ...response.data.user, 
          type: response.data.type || 'user' 
        };
        this.setUser(userData);
      }
    }
    
    return response;
  },
  
  /**
   * Logout user
   */
  logout() {
    this.removeToken();
  },
  
  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile
   */
  async getProfile() {
    return await this.request('/auth/me', {
      method: 'GET',
    });
  },
  
  // =====================================================
  // MERCHANT ENDPOINTS
  // =====================================================
  
  /**
   * Register a new merchant
   * @param {Object} data - Merchant registration data
   * @returns {Promise<Object>} Registration response
   */
  async registerMerchant(data) {
    const response = await this.request('/merchants/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    return response;
  },
  
  /**
   * Login merchant
   * @param {string} email - Merchant email
   * @param {string} password - Merchant password
   * @returns {Promise<Object>} Login response with merchant and token
   */
  async loginMerchant(email, password) {
    const response = await this.request('/merchants/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.success && response.data) {
      // Store token and merchant data
      if (response.data.token) {
        this.setToken(response.data.token);
      }
      if (response.data.merchant) {
        this.setUser({ ...response.data.merchant, type: 'merchant' });
      }
    }
    
    return response;
  },
  
  // =====================================================
  // PRODUCT ENDPOINTS
  // =====================================================
  
  /**
   * Get all products
   * @returns {Promise<Object>} Products list
   */
  async getProducts() {
    return await this.request('/products', {
      method: 'GET',
    });
  },
  
  /**
   * Get product by ID
   * @param {string} id - Product ID
   * @returns {Promise<Object>} Product details
   */
  async getProduct(id) {
    return await this.request(`/products/${id}`, {
      method: 'GET',
    });
  },
  
  // =====================================================
  // CART ENDPOINTS
  // =====================================================
  
  /**
   * Validate cart items
   * @param {Array} items - Cart items
   * @returns {Promise<Object>} Validated cart
   */
  async validateCart(items) {
    return await this.request('/cart/validate', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },
  
  // =====================================================
  // PAYMENT ENDPOINTS
  // =====================================================
  
  /**
   * Create payment order
   * @param {Object} orderData - Order details
   * @returns {Promise<Object>} Payment order
   */
  async createOrder(orderData) {
    return await this.request('/payment/create-order', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },
  
  /**
   * Verify payment
   * @param {string} referenceKey - Reference Key (Solana Public Key)
   * @returns {Promise<Object>} Payment status
   */
  async verifyPayment(referenceKey) {
    return await this.request(`/payment/verify?reference_key=${referenceKey}`, {
      method: 'GET',
    });
  },

  /**
   * Initialize Paystack payment
   * @param {Object} data - Payment data (items, email, etc.)
   * @returns {Promise<Object>} Paystack authorization data
   */
  async initializePaystack(data) {
    return await this.request('/payment/paystack/initialize', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Verify Paystack payment
   * @param {string} reference - Paystack reference
   * @returns {Promise<Object>} Payment status
   */
  async verifyPaystack(reference) {
    return await this.request(`/payment/paystack/verify?reference=${reference}`, {
      method: 'GET',
    });
  },
};

// Make globally available
window.KickshausAPI = KickshausAPI;

console.log('✨ Kickshaus API Client Initialized');
