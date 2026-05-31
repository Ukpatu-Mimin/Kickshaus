import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { adminController } from '../controllers/admin.controller';
import { authenticateUser, authorizeRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';

const router = Router();

// Protect all admin routes
router.use(authenticateUser);
router.use(authorizeRole('admin'));

// Dashboard Stats
router.get(
  '/stats',
  asyncHandler(adminController.getDashboardStats.bind(adminController))
);

// Merchant Management
router.get(
  '/merchants',
  asyncHandler(authController.listMerchants.bind(authController))
);

router.put(
  '/merchants/:id/status',
  asyncHandler(authController.updateMerchantStatus.bind(authController))
);

// Order Management
router.get(
    '/orders',
    asyncHandler(adminController.getAllOrders.bind(adminController))
);

router.get(
    '/orders/:orderId',
    asyncHandler(adminController.getOrderById.bind(adminController))
);

router.put(
    '/orders/:orderId/status',
    asyncHandler(adminController.updateOrderStatus.bind(adminController))
);

// Customer Management
router.get(
    '/customers',
    asyncHandler(adminController.getAllCustomers.bind(adminController))
);

// Product Management
router.get(
    '/products',
    asyncHandler(adminController.getAllProducts.bind(adminController))
);

export default router;
