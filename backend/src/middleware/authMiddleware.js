/**
 * ==========================================
 * AUTHENTICATION MIDDLEWARE
 * ==========================================
 * Verifies JWT tokens from Supabase Auth and enforces role-based access control
 */

const { supabase, supabaseAdmin, createUserClient } = require('../config/supabase');
const { ROLES } = require('../config/constants');

/**
 * Extract token from Authorization header
 * Supports: "Bearer <token>" format
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  
  return parts[1];
};

/**
 * Authenticate user from JWT token
 * Attaches user info to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No authorization token provided'
      });
    }
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: error?.message || 'Token verification failed'
      });
    }
    
    // Get user profile with role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return res.status(500).json({
        success: false,
        error: 'Profile fetch failed',
        message: 'Could not retrieve user profile'
      });
    }
    
    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || ROLES.CUSTOMER,
      profile: profile
    };
    
    // Create a user-specific Supabase client
    req.supabaseUser = createUserClient(token);
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 * Use for endpoints that work for both authenticated and anonymous users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      req.user = null;
      return next();
    }
    
    // Get user profile with role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || ROLES.CUSTOMER,
      profile: profile
    };
    
    req.supabaseUser = createUserClient(token);
    
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    req.user = null;
    next();
  }
};

/**
 * Role-based authorization middleware factory
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Admin only middleware
 */
const adminOnly = authorize(ROLES.ADMIN);

/**
 * Merchant or Admin middleware
 */
const merchantOrAdmin = authorize(ROLES.ADMIN, ROLES.MERCHANT);

/**
 * Customer or higher middleware
 */
const customerOrHigher = authorize(ROLES.ADMIN, ROLES.MERCHANT, ROLES.CUSTOMER);

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  adminOnly,
  merchantOrAdmin,
  customerOrHigher,
  extractToken
};
