# Kickshaus Backend API

A production-ready, modular REST API backend for the Kickshaus e-commerce footwear application built with Express.js and Supabase.

## 🚀 Features

- **Express.js** - Fast, unopinionated web framework
- **Supabase** - PostgreSQL database with built-in authentication
- **Solana Pay** - Cryptocurrency payments (USDC/SOL)
- **Role-Based Access Control** - Admin, Merchant, Customer roles
- **Zod Validation** - Runtime type-safe request validation
- **Rate Limiting** - Protection against abuse
- **Helmet** - Security HTTP headers
- **Morgan** - HTTP request logging

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── supabase.js      # Supabase client configuration
│   │   └── constants.js     # Application constants
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   ├── dashboardController.js
│   │   └── paymentController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── dashboardRoutes.js
│   │   └── paymentRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorHandler.js
│   │   └── validation.js
│   ├── utils/
│   │   ├── helpers.js
│   │   └── validationSchemas.js
│   ├── scripts/
│   │   └── seed.js
│   ├── app.js
│   └── server.js
├── database/
│   └── schema.sql           # Supabase database schema
├── .env                     # Environment variables
├── .env.example             # Environment template
├── package.json
└── README.md
```

## 🛠️ Setup

### Prerequisites

- Node.js 18+ 
- A Supabase project (create at [supabase.com](https://supabase.com))
- (Optional) Solana wallet for payments

### Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Set up the database:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the contents of `database/schema.sql`

4. **Seed the database (optional):**
   ```bash
   npm run seed
   ```

5. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

The API will be available at `http://localhost:3000`

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | Environment (development/production) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `MERCHANT_WALLET_ADDRESS` | Solana wallet for receiving payments |
| `USDC_MINT_ADDRESS` | USDC token mint address |
| `SOLANA_NETWORK` | devnet/mainnet-beta |
| `CORS_ORIGIN` | Allowed origins (comma-separated) |

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current profile |
| PUT | `/api/auth/me` | Update profile |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products (with filters) |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product (merchant/admin) |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List user orders |
| GET | `/api/orders/:id` | Get order details |
| POST | `/api/orders` | Create new order |
| PATCH | `/api/orders/:id/status` | Update status (admin) |
| POST | `/api/orders/:id/cancel` | Cancel order |

### Payments (Solana Pay)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/create` | Create payment request |
| POST | `/api/payments/verify` | Verify transaction |
| GET | `/api/payments/:orderId/status` | Get payment status |
| GET | `/api/payments/exchange-rate` | Get exchange rates |

### Dashboard (Admin/Merchant)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/overview` | Dashboard stats |
| GET | `/api/dashboard/analytics/revenue` | Revenue analytics |
| GET | `/api/dashboard/analytics/orders` | Orders analytics |
| GET | `/api/dashboard/orders/recent` | Recent orders |
| GET | `/api/dashboard/inventory/low-stock` | Low stock alerts |
| GET | `/api/dashboard/products/top-selling` | Top products |

---

# 🔄 Frontend Integration Guide

This guide explains how to refactor the existing frontend files to use the new backend API.

## 1. Creating an API Service

Create a new file `api-service.js` in your frontend:

```javascript
// api-service.js
const API_BASE_URL = 'http://localhost:3000/api';

class KickshausAPI {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = localStorage.getItem('kickshaus_token');
  }

  // Get auth header
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // Store token after login
  setToken(token) {
    this.token = token;
    localStorage.setItem('kickshaus_token', token);
  }

  // Clear token on logout
  clearToken() {
    this.token = null;
    localStorage.removeItem('kickshaus_token');
  }

  // Generic API request
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // AUTH METHODS
  async signup(email, password, fullName) {
    const data = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName })
    });
    if (data.data?.session?.accessToken) {
      this.setToken(data.data.session.accessToken);
    }
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.data?.session?.accessToken) {
      this.setToken(data.data.session.accessToken);
      localStorage.setItem('kickshaus_user', JSON.stringify(data.data.user));
    }
    return data;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
    localStorage.removeItem('kickshaus_user');
  }

  async getProfile() {
    return this.request('/auth/me');
  }

  // PRODUCT METHODS
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/products?${queryString}`);
  }

  async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  // ORDER METHODS
  async createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  async getOrders() {
    return this.request('/orders');
  }

  async getOrder(id) {
    return this.request(`/orders/${id}`);
  }

  // PAYMENT METHODS
  async createPayment(orderId, token = 'USDC') {
    return this.request('/payments/create', {
      method: 'POST',
      body: JSON.stringify({ orderId, token })
    });
  }

  async verifyPayment(reference, orderId) {
    return this.request('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ reference, orderId })
    });
  }

  async getExchangeRate() {
    return this.request('/payments/exchange-rate');
  }

  // DASHBOARD METHODS
  async getDashboardOverview() {
    return this.request('/dashboard/overview');
  }

  async getRecentOrders() {
    return this.request('/dashboard/orders/recent');
  }

  async getLowStockProducts() {
    return this.request('/dashboard/inventory/low-stock');
  }
}

// Create global instance
window.KickshausAPI = new KickshausAPI();
```

## 2. Refactoring global-state.js

Replace the `PRODUCTS_DATABASE` with API calls:

```javascript
// In global-state.js - Add these methods to KickshausState

const KickshausState = {
  // ... existing state properties ...
  
  products: [], // Will be populated from API
  productsLoaded: false,

  // Load products from API
  async loadProducts(params = {}) {
    try {
      const response = await KickshausAPI.getProducts(params);
      this.products = response.data;
      this.productsLoaded = true;
      return this.products;
    } catch (error) {
      console.error('Failed to load products:', error);
      return [];
    }
  },

  // Get product by ID (from API or cached)
  async getProductById(id) {
    // Check cache first
    const cached = this.products.find(p => p.id === id);
    if (cached) return cached;
    
    // Fetch from API
    try {
      const response = await KickshausAPI.getProduct(id);
      return response.data;
    } catch (error) {
      console.error('Failed to get product:', error);
      return null;
    }
  },

  // ... rest of existing methods ...
};

// Replace PRODUCTS_DATABASE usage
// OLD: const products = PRODUCTS_DATABASE;
// NEW: const products = await KickshausState.loadProducts();
```

**Usage in HTML pages:**
```javascript
// In collection.html or index.html
document.addEventListener('DOMContentLoaded', async () => {
  // Load products from API
  const products = await KickshausState.loadProducts({
    category: 'Fashion',
    limit: 20
  });
  
  // Render products
  renderProducts(products);
});
```

## 3. Refactoring admin-auth.js

Replace the hardcoded credentials with API authentication:

```javascript
// admin-auth.js - Refactored version

const AdminAuth = {
  // Check if user is logged in
  async isAuthenticated() {
    const token = localStorage.getItem('kickshaus_token');
    if (!token) return false;

    try {
      const response = await KickshausAPI.getProfile();
      return response.data?.role === 'admin';
    } catch (error) {
      this.logout();
      return false;
    }
  },

  // Login admin
  async login(email, password) {
    try {
      const response = await KickshausAPI.login(email, password);
      
      // Check if user is admin
      if (response.data?.user?.role !== 'admin') {
        KickshausAPI.logout();
        return { success: false, message: 'Admin access required' };
      }
      
      return { success: true, message: 'Login successful!' };
    } catch (error) {
      return { success: false, message: error.message || 'Login failed' };
    }
  },

  // Logout admin
  logout() {
    KickshausAPI.logout();
    localStorage.removeItem('kickshaus_admin_session');
  },

  // Get current admin info
  async getCurrentAdmin() {
    try {
      const response = await KickshausAPI.getProfile();
      return response.data;
    } catch (error) {
      return null;
    }
  },

  // Protect dashboard pages
  async protectPage() {
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      sessionStorage.setItem('redirectAfterLogin', window.location.href);
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }
};
```

**Update login.html form handler:**
```javascript
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  const result = await AdminAuth.login(email, password);
  
  if (result.success) {
    const redirect = sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
    sessionStorage.removeItem('redirectAfterLogin');
    window.location.href = redirect;
  } else {
    showToast(result.message, 'error');
  }
});
```

## 4. Refactoring checkout.js

Replace local calculations with API order creation:

```javascript
// checkout.js - Refactored version

let orderData = null;

async function initCheckout() {
  // Get cart from state
  const cart = KickshausState.cart;
  
  if (cart.length === 0) {
    showToast('Your cart is empty', 'error');
    window.location.href = 'cart.html';
    return;
  }
  
  // Get exchange rate for display
  try {
    const rateResponse = await KickshausAPI.getExchangeRate();
    displayExchangeInfo(rateResponse.data);
  } catch (error) {
    console.error('Failed to get exchange rate:', error);
  }
  
  // Calculate and display order summary
  updateOrderSummary();
}

async function applyCoupon() {
  const couponCode = document.getElementById('couponInput').value.trim();
  const msg = document.getElementById('couponMsg');
  
  // The coupon will be validated on order creation
  // For now, just store it
  orderData = { ...orderData, couponCode };
  msg.textContent = 'Coupon will be applied at checkout';
  msg.className = 'text-sm mt-2 text-blue-600';
}

async function processCheckout(e) {
  e.preventDefault();
  
  // Get form data
  const formData = new FormData(e.target);
  
  // Prepare order data
  const orderPayload = {
    items: KickshausState.cart.map(item => ({
      productId: item.id,
      quantity: item.quantity,
      size: item.size,
      color: item.color
    })),
    shippingAddress: {
      street: formData.get('address'),
      city: formData.get('city'),
      state: formData.get('state'),
      country: 'Nigeria',
      postalCode: formData.get('postalCode')
    },
    customerName: formData.get('fullName'),
    customerEmail: formData.get('email'),
    customerPhone: formData.get('phone'),
    customerNotes: formData.get('notes'),
    couponCode: orderData?.couponCode,
    paymentMethod: 'solana_pay'
  };
  
  try {
    // Create order via API
    const response = await KickshausAPI.createOrder(orderPayload);
    
    if (response.success) {
      // Clear cart
      KickshausState.clearCart();
      
      // Redirect to payment page
      window.location.href = `payment.html?orderId=${response.data.id}`;
    }
  } catch (error) {
    showToast(error.message || 'Failed to create order', 'error');
  }
}
```

## 5. Creating a Payment Page

Create/update `payment.html` for Solana Pay:

```javascript
// payment.js

let currentPayment = null;
let pollingInterval = null;

async function initPayment() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');
  
  if (!orderId) {
    showToast('Order not found', 'error');
    window.location.href = 'index.html';
    return;
  }
  
  try {
    // Create payment request
    const response = await KickshausAPI.createPayment(orderId, 'USDC');
    currentPayment = response.data;
    
    // Display payment info
    displayPaymentDetails(currentPayment);
    
    // Generate QR code
    generateQRCode(currentPayment.paymentUrl);
    
    // Start polling for payment confirmation
    startPaymentPolling(currentPayment.reference, orderId);
    
  } catch (error) {
    showToast(error.message || 'Failed to create payment', 'error');
  }
}

function displayPaymentDetails(payment) {
  document.getElementById('orderNumber').textContent = payment.orderNumber;
  document.getElementById('amountNGN').textContent = `₦${payment.amountNGN.toLocaleString()}`;
  document.getElementById('amountUSDC').textContent = `${payment.amountUSDC.toFixed(2)} USDC`;
  document.getElementById('walletAddress').textContent = payment.recipientWallet;
}

function generateQRCode(paymentUrl) {
  // Use a QR code library like qrcode.js
  const qrContainer = document.getElementById('qrCode');
  
  // Using the Solana Pay URL to generate QR
  new QRCode(qrContainer, {
    text: paymentUrl,
    width: 256,
    height: 256
  });
}

function startPaymentPolling(reference, orderId) {
  // Poll every 5 seconds
  pollingInterval = setInterval(async () => {
    try {
      const response = await KickshausAPI.verifyPayment(reference, orderId);
      
      if (response.data.status === 'completed') {
        clearInterval(pollingInterval);
        showPaymentSuccess(response.data);
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 5000);
  
  // Stop polling after 30 minutes
  setTimeout(() => {
    clearInterval(pollingInterval);
  }, 30 * 60 * 1000);
}

function showPaymentSuccess(data) {
  document.getElementById('paymentPending').style.display = 'none';
  document.getElementById('paymentSuccess').style.display = 'block';
  
  document.getElementById('txSignature').textContent = data.txSignature;
  document.getElementById('explorerLink').href = data.explorerUrl;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initPayment);
```

## 6. Refactoring dashboard-functions.js

Replace mock data with real API calls:

```javascript
// dashboard-functions.js - Key refactored sections

// Replace DashboardData with API calls
async function loadDashboardData() {
  try {
    const [overview, recentOrders, lowStock] = await Promise.all([
      KickshausAPI.getDashboardOverview(),
      KickshausAPI.getRecentOrders(),
      KickshausAPI.getLowStockProducts()
    ]);
    
    return {
      overview: overview.data,
      recentOrders: recentOrders.data,
      lowStock: lowStock.data
    };
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    return null;
  }
}

// Update renderOverview to use API data
async function renderOverview() {
  const data = await loadDashboardData();
  if (!data) return;
  
  // Update stats cards
  document.getElementById('totalRevenue').textContent = 
    `₦${data.overview.revenue.total.toLocaleString()}`;
  document.getElementById('totalOrders').textContent = 
    data.overview.orders.total;
  document.getElementById('lowStockCount').textContent = 
    data.overview.products.lowStock;
  document.getElementById('totalCustomers').textContent = 
    data.overview.customers.total;
  
  // Render recent orders
  renderRecentOrdersTable(data.recentOrders);
  
  // Render low stock alerts
  renderLowStockAlerts(data.lowStock);
}

function renderRecentOrdersTable(orders) {
  const tbody = document.getElementById('recentOrdersBody');
  tbody.innerHTML = orders.map(order => `
    <tr>
      <td><strong>${order.orderNumber}</strong></td>
      <td>${order.customerName}</td>
      <td><strong>₦${parseFloat(order.totalAmount).toLocaleString()}</strong></td>
      <td><span class="status-badge ${order.status}">${order.status}</span></td>
      <td>${new Date(order.createdAt).toLocaleDateString()}</td>
    </tr>
  `).join('');
}
```

## 7. Script Loading Order

Update your HTML files to load scripts in the correct order:

```html
<!-- At the end of body, before other scripts -->
<script src="api-service.js"></script>
<script src="global-state.js"></script>
<!-- Page-specific scripts -->
<script src="script.js"></script>
```

## 8. Error Handling Best Practices

Add global error handling:

```javascript
// Add to api-service.js or a separate error-handler.js

window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  showToast('An error occurred. Please try again.', 'error');
});

// Handle 401 errors globally
const originalRequest = KickshausAPI.request.bind(KickshausAPI);
KickshausAPI.request = async function(endpoint, options) {
  try {
    return await originalRequest(endpoint, options);
  } catch (error) {
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      // Token expired - redirect to login
      this.clearToken();
      window.location.href = 'login.html';
    }
    throw error;
  }
};
```

---

## 📝 License

MIT License - feel free to use this code for your projects.
