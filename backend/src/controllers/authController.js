/**
 * ==========================================
 * AUTHENTICATION CONTROLLER
 * ==========================================
 * Handles user authentication, registration, and profile management
 */

const { supabase, supabaseAdmin } = require('../config/supabase');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { ROLES } = require('../config/constants');

/**
 * Register a new user
 * POST /api/auth/signup
 */
const signup = asyncHandler(async (req, res) => {
  const { email, password, fullName, phone, role } = req.validatedBody;
  
  // Register user with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role || ROLES.CUSTOMER
      }
    }
  });
  
  if (authError) {
    throw createError.badRequest(authError.message);
  }
  
  // Update profile with additional info if needed
  if (authData.user && phone) {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ phone })
      .eq('id', authData.user.id);
    
    if (profileError) {
      console.error('⚠️ Profile update error:', profileError);
    }
  }
  
  res.status(201).json({
    success: true,
    message: 'Account created successfully. Please check your email for verification.',
    data: {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: role || ROLES.CUSTOMER
      },
      session: authData.session
    }
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validatedBody;
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    throw createError.unauthorized('Invalid email or password');
  }
  
  // Get user profile with role
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role || ROLES.CUSTOMER,
        fullName: profile?.full_name,
        phone: profile?.phone,
        avatarUrl: profile?.avatar_url
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at
      }
    }
  });
});

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Logout error:', error);
  }
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw createError.badRequest('Refresh token is required');
  }
  
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken
  });
  
  if (error) {
    throw createError.unauthorized('Invalid refresh token');
  }
  
  res.json({
    success: true,
    data: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at
    }
  });
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getProfile = asyncHandler(async (req, res) => {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();
  
  if (error) {
    throw createError.notFound('Profile not found');
  }
  
  // If user is a merchant, get merchant details
  let merchantDetails = null;
  if (profile.role === ROLES.MERCHANT) {
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('*')
      .eq('user_id', req.user.id)
      .single();
    merchantDetails = merchant;
  }
  
  res.json({
    success: true,
    data: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      phone: profile.phone,
      avatarUrl: profile.avatar_url,
      role: profile.role,
      isActive: profile.is_active,
      createdAt: profile.created_at,
      ...(merchantDetails && { merchant: merchantDetails })
    }
  });
});

/**
 * Update user profile
 * PUT /api/auth/me
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, avatarUrl } = req.validatedBody;
  
  const updateData = {};
  if (fullName !== undefined) updateData.full_name = fullName;
  if (phone !== undefined) updateData.phone = phone;
  if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;
  
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', req.user.id)
    .select()
    .single();
  
  if (error) {
    throw createError.internal('Failed to update profile');
  }
  
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      phone: profile.phone,
      avatarUrl: profile.avatar_url,
      role: profile.role
    }
  });
});

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    throw createError.badRequest('Email is required');
  }
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5500'}/reset-password.html`
  });
  
  if (error) {
    console.error('Password reset error:', error);
    // Don't reveal if email exists or not
  }
  
  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.'
  });
});

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    throw createError.badRequest('New password is required');
  }
  
  const { error } = await supabase.auth.updateUser({
    password
  });
  
  if (error) {
    throw createError.badRequest(error.message);
  }
  
  res.json({
    success: true,
    message: 'Password has been reset successfully'
  });
});

/**
 * Get all users (Admin only)
 * GET /api/auth/users
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const offset = (page - 1) * limit;
  
  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' });
  
  if (role) {
    query = query.eq('role', role);
  }
  
  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }
  
  const { data: users, error, count } = await query
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw createError.internal('Failed to fetch users');
  }
  
  res.json({
    success: true,
    data: users.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at
    })),
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  });
});

/**
 * Update user role (Admin only)
 * PATCH /api/auth/users/:userId/role
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  
  if (!Object.values(ROLES).includes(role)) {
    throw createError.badRequest('Invalid role');
  }
  
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) {
    throw createError.notFound('User not found');
  }
  
  res.json({
    success: true,
    message: `User role updated to ${role}`,
    data: {
      id: profile.id,
      email: profile.email,
      role: profile.role
    }
  });
});

module.exports = {
  signup,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  getAllUsers,
  updateUserRole
};
