/**
 * ==========================================
 * DASHBOARD ROUTES
 * ==========================================
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, merchantOrAdmin } = require('../middleware/authMiddleware');

// All dashboard routes require authentication and merchant/admin role
router.use(authenticate);
router.use(merchantOrAdmin);

// Overview
router.get('/overview', dashboardController.getOverview);

// Analytics
router.get('/analytics/revenue', dashboardController.getRevenueAnalytics);
router.get('/analytics/orders', dashboardController.getOrdersAnalytics);

// Inventory
router.get('/inventory/low-stock', dashboardController.getLowStockProducts);

// Orders
router.get('/orders/recent', dashboardController.getRecentOrders);

// Products
router.get('/products/top-selling', dashboardController.getTopSellingProducts);

module.exports = router;
