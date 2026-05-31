import { Router, Request, Response } from 'express';
import passport from 'passport';
import { authController } from '../controllers/auth.controller';
import { authenticateUser } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../middleware/error';
import { isGoogleAuthConfigured, isFacebookAuthConfigured, config } from '../config/env';
import { 
  registerUserSchema, 
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../utils/validators';

const router = Router();

// =====================================================
// PUBLIC ROUTES
// =====================================================

/**
 * POST /api/auth/register
 * Register a new customer
 */
router.post(
  '/register',
  validateBody(registerUserSchema),
  asyncHandler(authController.register.bind(authController))
);

/**
 * POST /api/auth/login
 * Login user (customer or admin)
 */
router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(authController.login.bind(authController))
);

/**
 * POST /api/auth/forgot-password
 * Request password reset link
 */
router.post(
  '/forgot-password',
  validateBody(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword.bind(authController))
);

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  asyncHandler(authController.resetPassword.bind(authController))
);

// =====================================================
// SOCIAL OAUTH ROUTES
// =====================================================

/**
 * GET /api/auth/google
 * Initiate Google OAuth login
 */
if (isGoogleAuthConfigured()) {
  router.get(
    '/google',
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      session: false,
    })
  );

  /**
   * GET /api/auth/google/callback
   * Handle Google OAuth callback
   */
  router.get(
    '/google/callback',
    passport.authenticate('google', { 
      session: false,
      failureRedirect: `${config.social.frontendUrl}/login.html?error=google_auth_failed`,
    }),
    (req: Request, res: Response) => {
      authController.handleSocialCallback(req, res);
    }
  );
} else {
  // Return error if Google OAuth is not configured
  router.get('/google', (_req: Request, res: Response) => {
    res.status(503).json({
      success: false,
      error: 'Google authentication is not configured',
      code: 'GOOGLE_AUTH_NOT_CONFIGURED',
    });
  });
}

/**
 * GET /api/auth/facebook
 * Initiate Facebook OAuth login
 */
if (isFacebookAuthConfigured()) {
  router.get(
    '/facebook',
    passport.authenticate('facebook', { 
      scope: ['email'],
      session: false,
    })
  );

  /**
   * GET /api/auth/facebook/callback
   * Handle Facebook OAuth callback
   */
  router.get(
    '/facebook/callback',
    passport.authenticate('facebook', { 
      session: false,
      failureRedirect: `${config.social.frontendUrl}/login.html?error=facebook_auth_failed`,
    }),
    (req: Request, res: Response) => {
      authController.handleSocialCallback(req, res);
    }
  );
} else {
  // Return error if Facebook OAuth is not configured
  router.get('/facebook', (_req: Request, res: Response) => {
    res.status(503).json({
      success: false,
      error: 'Facebook authentication is not configured',
      code: 'FACEBOOK_AUTH_NOT_CONFIGURED',
    });
  });
}

// =====================================================
// PROTECTED ROUTES
// =====================================================

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authenticateUser,
  asyncHandler(authController.getProfile.bind(authController))
);

export default router;
