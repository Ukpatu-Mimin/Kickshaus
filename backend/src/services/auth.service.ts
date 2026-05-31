import { supabaseAdmin } from '../config/supabase';
import { User, Merchant, UserRole, MerchantStatus, AuthProvider } from '../types';
import { hashPassword, verifyPassword } from '../utils/helpers';
import { ConflictError, NotFoundError, UnauthorizedError, BadRequestError, AppError } from '../utils/errors';
import { isSupabaseConfigured, config } from '../config/env';
import type { SocialProfile } from '../config/passport';
import crypto from 'crypto';
import { emailService } from './email.service';

export class AuthService {
  /**
   * Register a new customer
   */
  async registerUser(email: string, password: string, fullName: string): Promise<Omit<User, 'password_hash'>> {
    email = email.toLowerCase().trim();
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      throw new AppError(
        'Registration is currently unavailable. Please contact support or try again later.',
        503,
        'SERVICE_UNAVAILABLE'
      );
    }

    try {
      // Check if user already exists
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is expected for new users
        console.error('Database error checking existing user:', existingError);
        throw new AppError(
          'Registration service temporarily unavailable. Please try again later.',
          503,
          'SERVICE_UNAVAILABLE'
        );
      }

      if (existing) {
        throw new ConflictError('User with this email already exists');
      }

      const passwordHash = hashPassword(password);

      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          password_hash: passwordHash,
          full_name: fullName,
          role: 'customer' as UserRole,
        })
        .select('id, email, full_name, role, provider, google_id, facebook_id, created_at, updated_at')
        .single();

      if (error) {
        console.error('Database error creating user:', error);
        throw new AppError(
          'Unable to complete registration. Please try again later.',
          503,
          'SERVICE_UNAVAILABLE'
        );
      }

      return data;
    } catch (error) {
      // If it's already an AppError, rethrow it
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Unexpected error during registration:', error);
      throw new AppError(
        'An unexpected error occurred during registration. Please try again later.',
        500,
        'INTERNAL_ERROR'
      );
    }
  }

  /**
   * Login user (customer or admin)
   */
  async loginUser(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>; type: 'user' | 'admin' }> {
    email = email.toLowerCase().trim();
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      throw new AppError(
        'Login is currently unavailable. Please try again later.',
        503,
        'SERVICE_UNAVAILABLE'
      );
    }

    try {
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isValid = verifyPassword(password, user.password_hash);
      if (!isValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash: _passwordHash, ...userData } = user;
      return {
        user: userData,
        type: user.role === 'admin' ? 'admin' : 'user',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Unexpected error during login:', error);
      throw new AppError(
        'An unexpected error occurred during login. Please try again later.',
        500,
        'INTERNAL_ERROR'
      );
    }
  }

  /**
   * Register a new merchant (pending approval)
   */
  async registerMerchant(data: {
    business_name: string;
    email: string;
    phone?: string;
    password: string;
    wallet_address: string;
  }): Promise<Omit<Merchant, 'password_hash'>> {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      throw new AppError(
        'Merchant registration is currently unavailable. Please try again later.',
        503,
        'SERVICE_UNAVAILABLE'
      );
    }

    try {
      // Check if merchant already exists
      const { data: existing } = await supabaseAdmin
        .from('merchants')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existing) {
        throw new ConflictError('Merchant with this email already exists');
      }

      // Also check in users table
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existingUser) {
        throw new ConflictError('An account with this email already exists');
      }

      const passwordHash = hashPassword(data.password);

      const { data: merchant, error } = await supabaseAdmin
        .from('merchants')
        .insert({
          business_name: data.business_name,
          email: data.email,
          phone: data.phone,
          password_hash: passwordHash,
          wallet_address: data.wallet_address,
          status: 'pending' as MerchantStatus,
        })
        .select('id, business_name, email, phone, status, wallet_address, created_at, updated_at')
        .single();

      if (error) {
        console.error('Database error creating merchant:', error);
        throw new AppError(
          'Unable to complete merchant registration. Please try again later.',
          503,
          'SERVICE_UNAVAILABLE'
        );
      }

      return merchant;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Unexpected error during merchant registration:', error);
      throw new AppError(
        'An unexpected error occurred during registration. Please try again later.',
        500,
        'INTERNAL_ERROR'
      );
    }
  }

  /**
   * Login merchant
   */
  async loginMerchant(email: string, password: string): Promise<Omit<Merchant, 'password_hash'>> {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      throw new AppError(
        'Merchant login is currently unavailable. Please try again later.',
        503,
        'SERVICE_UNAVAILABLE'
      );
    }

    try {
      const { data: merchant, error } = await supabaseAdmin
        .from('merchants')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !merchant) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isValid = verifyPassword(password, merchant.password_hash);
      if (!isValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      if (merchant.status === 'pending') {
        throw new BadRequestError('Your merchant account is pending approval');
      }

      if (merchant.status === 'rejected') {
        throw new BadRequestError('Your merchant application has been rejected');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash: _passwordHash, ...merchantData } = merchant;
      return merchantData;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Unexpected error during merchant login:', error);
      throw new AppError(
        'An unexpected error occurred during login. Please try again later.',
        500,
        'INTERNAL_ERROR'
      );
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, provider, google_id, facebook_id, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Get merchant by ID
   */
  async getMerchantById(merchantId: string): Promise<Omit<Merchant, 'password_hash'> | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from('merchants')
      .select('id, business_name, email, phone, status, wallet_address, created_at, updated_at')
      .eq('id', merchantId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * List all merchants (admin only)
   */
  async listMerchants(status?: MerchantStatus): Promise<Omit<Merchant, 'password_hash'>[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    let query = supabaseAdmin
      .from('merchants')
      .select('id, business_name, email, phone, status, wallet_address, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list merchants: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update merchant status (admin only)
   */
  async updateMerchantStatus(merchantId: string, status: MerchantStatus): Promise<Omit<Merchant, 'password_hash'>> {
    if (!isSupabaseConfigured()) {
      throw new AppError(
        'Admin operations are currently unavailable. Please try again later.',
        503,
        'SERVICE_UNAVAILABLE'
      );
    }

    const { data, error } = await supabaseAdmin
      .from('merchants')
      .update({ status })
      .eq('id', merchantId)
      .select('id, business_name, email, phone, status, wallet_address, created_at, updated_at')
      .single();

    if (error) {
      throw new NotFoundError('Merchant not found');
    }

    return data;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    email = email.toLowerCase().trim();
    if (!isSupabaseConfigured()) {
      throw new AppError('Service unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    // 1. Check Users table
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    let table = 'users';
    let id = user?.id;

    // 2. If not found in Users, check Merchants table
    if (!user) {
      const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (merchant) {
        table = 'merchants';
        id = merchant.id;
      }
    }

    // If user/merchant found, generate token and send email (mock)
    if (id) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      const { error } = await supabaseAdmin
        .from(table)
        .update({
          reset_token: token,
          reset_token_expires: expiresAt.toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error(`Failed to set reset token for ${email}:`, error);
        throw new AppError('Failed to process request', 500, 'INTERNAL_ERROR');
      }

      // Send email via dedicated service
      await emailService.sendPasswordResetEmail(email, token);
    }

    // Always return void to prevent email enumeration (security best practice)
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new AppError('Service unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const now = new Date().toISOString();

    // 1. Try to find user with valid token
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('reset_token', token)
      .gt('reset_token_expires', now)
      .single();

    let table = 'users';
    let id = user?.id;

    // 2. If not found, try merchants
    if (!user) {
      const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('id')
        .eq('reset_token', token)
        .gt('reset_token_expires', now)
        .single();

      if (merchant) {
        table = 'merchants';
        id = merchant.id;
      }
    }

    if (!id) {
      throw new BadRequestError('Invalid or expired password reset token');
    }

    const passwordHash = hashPassword(newPassword);

    const { error } = await supabaseAdmin
      .from(table)
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null,
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to reset password:', error);
      throw new AppError('Failed to reset password', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Find or create a user from social OAuth profile
   * - If user exists with the same social provider ID: return user
   * - If user exists with the same email but different provider: link accounts
   * - If user doesn't exist: create new user
   */
  async findOrCreateSocialUser(profile: SocialProfile): Promise<Omit<User, 'password_hash'>> {
    profile.email = profile.email.toLowerCase().trim();
    if (!isSupabaseConfigured()) {
      throw new AppError(
        'Social login is currently unavailable. Please try again later.',
        503,
        'SERVICE_UNAVAILABLE'
      );
    }

    try {
      const providerIdField = profile.provider === 'google' ? 'google_id' : 'facebook_id';

      // First, try to find user by provider ID
      const { data: existingByProvider, error: providerError } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, provider, google_id, facebook_id, created_at, updated_at')
        .eq(providerIdField, profile.providerId)
        .single();

      if (!providerError && existingByProvider) {
        // User found by provider ID
        return existingByProvider;
      }

      // Check if user exists with the same email
      const { data: existingByEmail, error: emailError } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, provider, google_id, facebook_id, created_at, updated_at')
        .eq('email', profile.email)
        .single();

      if (!emailError && existingByEmail) {
        // User exists with email, link the social account
        const updateData: Record<string, string | null> = {
          [providerIdField]: profile.providerId,
        };
        
        // If existing user has no name but social profile does, update it
        if (!existingByEmail.full_name && profile.fullName) {
          updateData.full_name = profile.fullName;
        }

        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('users')
          .update(updateData)
          .eq('id', existingByEmail.id)
          .select('id, email, full_name, role, provider, google_id, facebook_id, created_at, updated_at')
          .single();

        if (updateError) {
          console.error('Error linking social account:', updateError);
          throw new AppError(
            'Failed to link social account. Please try again.',
            500,
            'LINK_FAILED'
          );
        }

        return updatedUser;
      }

      // Create new user with social provider
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          email: profile.email,
          password_hash: null, // Social users don't have passwords
          role: 'customer' as UserRole,
          provider: profile.provider as AuthProvider,
          full_name: profile.fullName || null,
          [providerIdField]: profile.providerId,
        })
        .select('id, email, full_name, role, provider, google_id, facebook_id, created_at, updated_at')
        .single();

      if (createError) {
        console.error('Error creating social user:', createError);
        throw new AppError(
          'Failed to create account. Please try again.',
          500,
          'CREATE_FAILED'
        );
      }

      return newUser;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Unexpected error in findOrCreateSocialUser:', error);
      throw new AppError(
        'An unexpected error occurred. Please try again later.',
        500,
        'INTERNAL_ERROR'
      );
    }
  }
}

export const authService = new AuthService();
