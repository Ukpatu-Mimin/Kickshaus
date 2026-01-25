/**
 * ==========================================
 * PRODUCT ROUTES
 * ==========================================
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, optionalAuth, merchantOrAdmin } = require('../middleware/authMiddleware');
const { validateBody, validateQuery } = require('../middleware/validation');
const { productSchema, updateProductSchema, productQuerySchema } = require('../utils/validationSchemas');

// Public routes
router.get('/', validateQuery(productQuerySchema), productController.getProducts);
router.get('/categories', productController.getCategories);
router.get('/brands', productController.getBrands);
router.get('/:id', productController.getProduct);

// Protected routes (Merchant or Admin)
router.post('/', authenticate, merchantOrAdmin, validateBody(productSchema), productController.createProduct);
router.put('/:id', authenticate, merchantOrAdmin, validateBody(updateProductSchema), productController.updateProduct);
router.delete('/:id', authenticate, merchantOrAdmin, productController.deleteProduct);
router.patch('/:id/stock', authenticate, merchantOrAdmin, productController.updateStock);

module.exports = router;
