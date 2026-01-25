/**
 * ==========================================
 * ORDER ROUTES
 * ==========================================
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, adminOnly, merchantOrAdmin } = require('../middleware/authMiddleware');
const { validateBody, validateQuery } = require('../middleware/validation');
const { createOrderSchema, updateOrderStatusSchema, orderQuerySchema } = require('../utils/validationSchemas');

// All routes require authentication
router.use(authenticate);

// Customer routes
router.get('/', validateQuery(orderQuerySchema), orderController.getOrders);
router.get('/:id', orderController.getOrder);
router.post('/', validateBody(createOrderSchema), orderController.createOrder);
router.post('/:id/cancel', orderController.cancelOrder);

// Admin/Merchant routes
router.patch('/:id/status', merchantOrAdmin, validateBody(updateOrderStatusSchema), orderController.updateOrderStatus);

module.exports = router;
