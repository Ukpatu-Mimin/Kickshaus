/**
 * ==========================================
 * EXPRESS APPLICATION CONFIGURATION
 * ==========================================
 * Main application setup with middleware and routes
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Import middleware
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Create Express app
const app = express();

// Trust proxy (required for rate limiting and secure cookies behind reverse proxy)
app.set('trust proxy', 1);

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Helmet - Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://kyfhrlodryijocgbuxpd.supabase.co", "https://api.mainnet-beta.solana.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  }
}));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, same-origin requests, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow all origins in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    const allowedOrigins = (process.env.CORS_ORIGIN || '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all routes
app.use(limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes.'
  }
});

// ==========================================
// BODY PARSING MIDDLEWARE
// ==========================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// LOGGING MIDDLEWARE
// ==========================================

// Use 'dev' format in development, 'combined' in production
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

// ==========================================
// HEALTH CHECK ENDPOINT
// ==========================================

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// ==========================================
// SERVE FRONTEND STATIC FILES
// ==========================================

// Serve static files from the parent directory (where HTML/CSS/JS files are)
// __dirname = /workspaces/Kickshaus/backend/src
// '../..' goes to /workspaces/Kickshaus (where index.html is)
const frontendPath = path.join(__dirname, '../..');
app.use(express.static(frontendPath, {
  maxAge: '1d', // Cache static assets for 1 day in production
  etag: true
}));

// ==========================================
// API ROUTES
// ==========================================

const API_VERSION = process.env.API_VERSION || 'v1';
const API_PREFIX = `/api/${API_VERSION}`;

// Auth routes (with stricter rate limiting)
app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);

// Resource routes
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);

// Legacy route support (without version)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentRoutes);

// ==========================================
// API DOCUMENTATION ENDPOINT
// ==========================================

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Kickshaus API',
    version: API_VERSION,
    documentation: {
      endpoints: {
        auth: {
          'POST /api/auth/signup': 'Register a new user',
          'POST /api/auth/login': 'Login user',
          'POST /api/auth/logout': 'Logout user',
          'POST /api/auth/refresh': 'Refresh access token',
          'GET /api/auth/me': 'Get current user profile',
          'PUT /api/auth/me': 'Update current user profile'
        },
        products: {
          'GET /api/products': 'Get all products (with filters)',
          'GET /api/products/:id': 'Get single product',
          'POST /api/products': 'Create product (merchant/admin)',
          'PUT /api/products/:id': 'Update product (merchant/admin)',
          'DELETE /api/products/:id': 'Delete product (merchant/admin)',
          'GET /api/products/categories': 'Get all categories',
          'GET /api/products/brands': 'Get all brands'
        },
        orders: {
          'GET /api/orders': 'Get user orders',
          'GET /api/orders/:id': 'Get single order',
          'POST /api/orders': 'Create new order',
          'PATCH /api/orders/:id/status': 'Update order status (admin)',
          'POST /api/orders/:id/cancel': 'Cancel order'
        },
        payments: {
          'POST /api/payments/create': 'Create Solana Pay payment',
          'POST /api/payments/verify': 'Verify payment transaction',
          'GET /api/payments/:orderId/status': 'Get payment status',
          'GET /api/payments/exchange-rate': 'Get exchange rates'
        },
        dashboard: {
          'GET /api/dashboard/overview': 'Get dashboard overview',
          'GET /api/dashboard/analytics/revenue': 'Get revenue analytics',
          'GET /api/dashboard/analytics/orders': 'Get orders analytics',
          'GET /api/dashboard/orders/recent': 'Get recent orders',
          'GET /api/dashboard/inventory/low-stock': 'Get low stock products',
          'GET /api/dashboard/products/top-selling': 'Get top selling products'
        }
      }
    }
  });
});

// ==========================================
// CATCH-ALL: SERVE FRONTEND FOR NON-API ROUTES
// ==========================================

// For any route that doesn't match API, serve index.html (SPA support)
app.get('*', (req, res, next) => {
  // Skip if it's an API route
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  const frontendDir = path.join(__dirname, '../..');
  const filePath = path.join(frontendDir, req.path);
  
  // Try to send the specific file, or fall back to index.html
  res.sendFile(filePath, (err) => {
    if (err) {
      res.sendFile(path.join(frontendDir, 'index.html'));
    }
  });
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler (for API routes only)
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
