import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../middleware/error';
import { validateCartSchema } from '../utils/validators';

const router = Router();

// =====================================================
// CART ROUTES (No authentication required for validation)
// =====================================================

/**
 * POST /api/cart/validate
 * Validate cart items against database
 * 
 * This endpoint performs zero-trust validation:
 * - Fetches current prices from the database
 * - Checks stock availability
 * - Returns calculated totals
 * 
 * Note: This does NOT trust client-provided prices
 */
router.post(
  '/validate',
  validateBody(validateCartSchema),
  asyncHandler(cartController.validateCart.bind(cartController))
);

export default router;
