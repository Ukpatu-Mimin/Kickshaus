

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import passport from 'passport';
import { config } from './config/env';
import { initializePassport } from './config/passport';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error';

// Frontend static files directory (parent of backend folder)
// __dirname = /workspaces/Kickshaus/backend/src -> go up 2 levels to /workspaces/Kickshaus
const FRONTEND_DIR = path.join(__dirname, '../..');

// Create Express app
const app = express();

// Trust the first proxy (Required for rate-limiting behind load balancers/proxies)
app.set('trust proxy', 1);

// ===============================================
// SECURITY MIDDLEWARE
// ===============================================

// Block access to sensitive files/directories
app.use((req, res, next) => {
  const sensitivePaths = [
    '/backend',
    '/.git',
    '/.env',
    '/.idx',
    '/node_modules',
    '/package.json',
    '/package-lock.json',
    '/README.md'
  ];
  
  const normalizedUrl = req.url.toLowerCase();
  if (sensitivePaths.some(p => normalizedUrl.startsWith(p.toLowerCase()))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
});

// Helmet for security headers - modified for serving static content
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for frontend assets
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// =====================================================
// BODY PARSING
// =====================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================================================
// PASSPORT INITIALIZATION
// =====================================================

// Initialize Passport strategies for social auth
initializePassport();
app.use(passport.initialize());

// =====================================================
// STATIC FILES (Frontend)
// =====================================================

// Serve static files from the frontend directory
app.use(express.static(FRONTEND_DIR, {
  extensions: ['html', 'htm'],
}));

// Serve images folder with caching (1 day)
app.use('/images', express.static(path.join(FRONTEND_DIR, 'images'), {
  maxAge: '1d'
}));

// =====================================================
// ROUTES
// =====================================================

// Mount API routes
app.use('/api', limiter, routes);

// =====================================================
// FRONTEND HTML PAGES
// =====================================================

// Serve HTML pages for specific routes (before catch-all)
const htmlPages = [
  'index', 'login', 'signup', 'cart', 'checkout', 'payment',
  'product-detail', 'collection', 'favourites', 'delivery',
  'dashboard', 'merchant-dashboard', 'merchant-login',
  'become-merchant', 'admin-dashboard'
];

htmlPages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, `${page}.html`));
  });
  app.get(`/${page}.html`, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, `${page}.html`));
  });
});

// Root serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

// =====================================================
// SERVER STARTUP
// =====================================================

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🚀 Kickshaus Server                              ║
║                                                    ║
║   Environment: ${config.nodeEnv.padEnd(33)}║
║   Port: ${PORT.toString().padEnd(40)}║
║   URL: http://localhost:${PORT.toString().padEnd(25)}║
║                                                    ║
║   📦 Frontend: Serving static files                ║
║   🔌 Backend API: /api/*                           ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);
  
  if (config.isDevelopment) {
    console.log('📚 API Endpoints:');
    console.log('   GET  /api/health          - Health check');
    console.log('   POST /api/auth/register   - Register customer');
    console.log('   POST /api/auth/login      - Login user/admin');
    console.log('   POST /api/merchants/register - Register merchant');
    console.log('   POST /api/merchants/login - Login merchant');
    console.log('   GET  /api/products        - List products');
    console.log('   POST /api/cart/validate   - Validate cart');
    console.log('   POST /api/payment/create-order - Create order');
    console.log('   GET  /api/payment/verify  - Verify payment');
    console.log('');
  }
});

export default app;
