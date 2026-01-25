/**
 * ==========================================
 * AUTHENTICATION ROUTES
 * ==========================================
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');
const { validateBody } = require('../middleware/validation');
const { signupSchema, loginSchema, updateProfileSchema } = require('../utils/validationSchemas');

// Public routes
router.post('/signup', validateBody(signupSchema), authController.signup);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/me', authenticate, authController.getProfile);
router.put('/me', authenticate, validateBody(updateProfileSchema), authController.updateProfile);

// Admin routes
router.get('/users', authenticate, adminOnly, authController.getAllUsers);
router.patch('/users/:userId/role', authenticate, adminOnly, authController.updateUserRole);

module.exports = router;
