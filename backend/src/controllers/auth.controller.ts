import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { generateToken } from '../middleware/auth';
import { AuthenticatedRequest, User } from '../types';
import { sendSuccess } from '../utils/errors';
import { config } from '../config/env';
import { 
  RegisterUserInput, 
  LoginInput, 
  RegisterMerchantInput,
  ForgotPasswordInput,
  ResetPasswordInput
} from '../utils/validators';

// Type for the user attached by Passport during social auth
type PassportUser = Omit<User, 'password_hash'>;

export class AuthController {
  /**
   * Register a new customer
   * POST /api/auth/register
   */
  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { full_name, email, password } = req.body as RegisterUserInput;
    
    const user = await authService.registerUser(email, password, full_name);
    
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'user',
    });

    sendSuccess(res, {
      message: 'Registration successful',
      user,
      token,
    }, 201);
  }

  /**
   * Login user (customer or admin)
   * POST /api/auth/login
   */
  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email, password } = req.body as LoginInput;
    
    const { user, type } = await authService.loginUser(email, password);
    
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      type,
    });

    sendSuccess(res, {
      message: 'Login successful',
      user,
      token,
      type,
    });
  }

  /**
   * Request password reset link
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body as ForgotPasswordInput;
    
    await authService.requestPasswordReset(email);

    sendSuccess(res, {
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  }

  /**
   * Reset password using token
   * POST /api/auth/reset-password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password } = req.body as ResetPasswordInput;
    
    await authService.resetPassword(token, password);

    sendSuccess(res, {
      message: 'Password reset successful',
    });
  }

  /**
   * Handle social OAuth callback (Google/Facebook)
   * Generates JWT and redirects to frontend with token
   */
  handleSocialCallback(req: Request, res: Response): void {
    try {
      // User is attached by passport after successful authentication
      const user = req.user as PassportUser | undefined;

      if (!user) {
        // User denied access or authentication failed
        return res.redirect(
          `${config.social.frontendUrl}/login.html?error=auth_failed&message=Authentication%20failed`
        );
      }

      // Generate JWT token for the authenticated user
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        type: user.role === 'admin' ? 'admin' : 'user',
      });

      // Redirect to frontend with token
      // The frontend will handle storing the token
      res.redirect(
        `${config.social.frontendUrl}/login.html?token=${encodeURIComponent(token)}&provider=${user.provider}`
      );
    } catch (error) {
      console.error('Social callback error:', error);
      res.redirect(
        `${config.social.frontendUrl}/login.html?error=server_error&message=An%20unexpected%20error%20occurred`
      );
    }
  }

  /**
   * Handle social OAuth failure
   */
  handleSocialFailure(req: Request, res: Response): void {
    const errorMessage = (req.query.error as string) || 'Authentication failed';
    res.redirect(
      `${config.social.frontendUrl}/login.html?error=auth_failed&message=${encodeURIComponent(errorMessage)}`
    );
  }

  /**
   * Register a new merchant (pending approval)
   * POST /api/merchants/register
   */
  async registerMerchant(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as RegisterMerchantInput;
    
    const merchant = await authService.registerMerchant(data);

    sendSuccess(res, {
      message: 'Merchant registration submitted. Pending admin approval.',
      merchant,
    }, 201);
  }

  /**
   * Login merchant
   * POST /api/merchants/login
   */
  async loginMerchant(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email, password } = req.body as LoginInput;
    
    const merchant = await authService.loginMerchant(email, password);
    
    const token = generateToken({
      userId: merchant.id,
      email: merchant.email,
      role: 'customer', // Default role for merchants
      type: 'merchant',
      merchantId: merchant.id,
    });

    sendSuccess(res, {
      message: 'Login successful',
      merchant,
      token,
    });
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    
    if (user.type === 'merchant') {
      const merchant = await authService.getMerchantById(user.merchantId!);
      sendSuccess(res, { merchant, type: 'merchant' });
    } else {
      const userData = await authService.getUserById(user.userId);
      sendSuccess(res, { user: userData, type: user.type });
    }
  }

  /**
   * List all merchants (admin only)
   * GET /api/admin/merchants
   */
  async listMerchants(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { status } = req.query;
    
    const merchants = await authService.listMerchants(
      status as 'pending' | 'approved' | 'rejected' | undefined
    );

    sendSuccess(res, { merchants });
  }

  /**
   * Approve or reject a merchant (admin only)
   * PUT /api/admin/merchants/:id/status
   */
  async updateMerchantStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { status } = req.body as { status: 'approved' | 'rejected' };
    
    const merchant = await authService.updateMerchantStatus(id, status);

    sendSuccess(res, {
      message: `Merchant ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      merchant,
    });
  }
}

export const authController = new AuthController();
