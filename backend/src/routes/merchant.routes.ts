import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { productController } from '../controllers/product.controller';
import { authenticateUser, authorizeMerchant } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../middleware/error';
import { 
  registerMerchantSchema, 
  loginSchema,
  createProductSchema,
  updateProductSchema 
} from '../utils/validators';

const router = Router();

// =====================================================
// PUBLIC ROUTES
// =====================================================

/**
 * POST /api/merchants/register
 * Register a new merchant (pending approval)
 */
router.post(
  '/register',
  validateBody(registerMerchantSchema),
  asyncHandler(authController.registerMerchant.bind(authController))
);

/**
 * POST /api/merchants/login
 * Login merchant
 */
router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(authController.loginMerchant.bind(authController))
);

// =====================================================
// PROTECTED MERCHANT ROUTES
// =====================================================

/**
 * GET /api/merchant/products
 * Get merchant's own products (regardless of status)
 */
router.get(
  '/products',
  authenticateUser,
  authorizeMerchant,
  asyncHandler(productController.getMerchantProducts.bind(productController))
);

/**
 * POST /api/merchant/products
 * Create a new product
 */
router.post(
  '/products',
  authenticateUser,
  authorizeMerchant,
  validateBody(createProductSchema),
  asyncHandler(productController.createProduct.bind(productController))
);

/**
 * PUT /api/merchant/products/:id
 * Update a product
 */
router.put(
  '/products/:id',
  authenticateUser,
  authorizeMerchant,
  validateBody(updateProductSchema),
  asyncHandler(productController.updateProduct.bind(productController))
);

/**
 * DELETE /api/merchant/products/:id
 * Delete a product
 */
router.delete(
  '/products/:id',
  authenticateUser,
  authorizeMerchant,
  asyncHandler(productController.deleteProduct.bind(productController))
);

/**
 * GET /api/merchant/orders
 * Get orders containing products from this merchant
 */
router.get(
  '/orders',
  authenticateUser,
  authorizeMerchant,
  asyncHandler(productController.getMerchantOrders.bind(productController))
);

export default router;
