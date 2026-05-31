import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { validateQuery } from '../middleware/validate';
import { asyncHandler } from '../middleware/error';
import { paginationSchema } from '../utils/validators';

const router = Router();

// =====================================================
// PUBLIC PRODUCT ROUTES
// =====================================================

/**
 * GET /api/products
 * Get all live products with pagination and filtering
 */
router.get(
  '/',
  validateQuery(paginationSchema),
  asyncHandler(productController.getProducts.bind(productController))
);

/**
 * GET /api/products/:id
 * Get a single product by ID
 */
router.get(
  '/:id',
  asyncHandler(productController.getProduct.bind(productController))
);

export default router;
