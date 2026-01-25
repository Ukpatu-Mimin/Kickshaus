/**
 * ==========================================
 * PAYMENT ROUTES
 * ==========================================
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateBody } = require('../middleware/validation');
const { createPaymentSchema, verifyPaymentSchema } = require('../utils/validationSchemas');

// Public routes
router.get('/exchange-rate', paymentController.getExchangeRate);
router.post('/webhook', paymentController.handleWebhook);

// Protected routes
router.post('/create', authenticate, validateBody(createPaymentSchema), paymentController.createPayment);
router.post('/verify', authenticate, validateBody(verifyPaymentSchema), paymentController.verifyPayment);
router.get('/:orderId/status', authenticate, paymentController.getPaymentStatus);

module.exports = router;
