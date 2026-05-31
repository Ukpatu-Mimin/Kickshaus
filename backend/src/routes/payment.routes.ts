import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticateUser } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { asyncHandler } from '../middleware/error';
import { createOrderSchema, verifyPaymentSchema, createTransactionSchema } from '../utils/validators';

const router = Router();

// =====================================================
// PAYMENT ROUTES
// =====================================================

/**
 * POST /api/payment/webhook
 * Paystack Webhook Handler
 * (Public endpoint - Signature verified in controller)
 */
router.post(
  '/webhook',
  asyncHandler(paymentController.handleWebhook.bind(paymentController))
);

/**
 * POST /api/payment/paystack/initialize
 * Initialize Paystack payment
 */
router.post(
  '/paystack/initialize',
  authenticateUser,
  // Reuse createOrderSchema for body validation, but we handle extra fields in controller
  validateBody(createOrderSchema),
  asyncHandler(paymentController.initializePaystack.bind(paymentController))
);

/**
 * GET /api/payment/paystack/verify
 * Verify Paystack payment
 * (Public endpoint - Verification relies on Paystack API)
 */
router.get(
  '/paystack/verify',
  // authenticateUser, // Removed to allow verification after redirect even if session issues
  asyncHandler(paymentController.verifyPaystack.bind(paymentController))
);

/**
 * GET /api/payment/sol-price
 * Get current SOL price in USD
 * (Public endpoint for price display)
 */
router.get(
  '/sol-price',
  asyncHandler(paymentController.getSolPrice.bind(paymentController))
);

router.get('/chain-info', authenticateUser, asyncHandler(paymentController.getChainInfo.bind(paymentController)));

/**
 * POST /api/payment/create-order
 * Create a new order with Solana Pay
 * (Requires authentication)
 */
router.post(
  '/create-order',
  authenticateUser,
  validateBody(createOrderSchema),
  asyncHandler(paymentController.createOrder.bind(paymentController))
);

/**
 * POST /api/payment/transaction
 * Create a transaction for an order
 * (Requires authentication)
 */
router.post(
  '/transaction',
  authenticateUser,
  validateBody(createTransactionSchema),
  asyncHandler(paymentController.createTransaction.bind(paymentController))
);

/**
 * GET /api/payment/verify
 * Verify payment status by reference key
 * (Public endpoint - Verification relies on Blockchain)
 */
router.get(
  '/verify',
  // authenticateUser, // Removed to allow verification even if session issues
  validateQuery(verifyPaymentSchema),
  asyncHandler(paymentController.verifyPayment.bind(paymentController))
);

// =====================================================
// ORDER ROUTES
// =====================================================

/**
 * GET /api/orders
 * Get user's orders
 */
router.get(
  '/orders',
  authenticateUser,
  asyncHandler(paymentController.getUserOrders.bind(paymentController))
);

/**
 * GET /api/orders/:id
 * Get order details
 */
router.get(
  '/orders/:id',
  authenticateUser,
  asyncHandler(paymentController.getOrder.bind(paymentController))
);

export default router;
