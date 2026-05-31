import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Environment validation schema
const envSchema = z.object({
  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // Solana
  SOLANA_RPC_URL: z.string().url(),
  PLATFORM_WALLET_ADDRESS: z.string().min(32),

  // CoinGecko
  COINGECKO_API_URL: z.string().url().default('https://api.coingecko.com/api/v3'),

  // Exchange Rate
  NGN_USD_RATE: z.string().default('1600'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('1000'),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  // Social OAuth (optional in development, required in production)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  SOCIAL_CALLBACK_URL: z.string().default('http://localhost:3000/api/auth'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  SESSION_SECRET: z.string().optional(),

  // Paystack
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),

  // Email (SMTP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@kickshaus.com'),
});

// Parse and validate environment
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      console.error('❌ Environment validation failed:');
      missingVars.forEach(v => console.error(`   - ${v}`));
      
      // In production, we MUST fail if env vars are missing
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ CRITICAL: Missing required environment variables in production. Server exiting.');
        process.exit(1);
      }

      // In development/test, provide a fallback for easier testing
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        console.warn('⚠️  Using default development configuration');
        return {
          PORT: process.env.PORT || '3000',
          NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
          SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key',
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key',
          JWT_SECRET: process.env.JWT_SECRET || 'development-jwt-secret-minimum-32-characters',
          JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
          SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
          PLATFORM_WALLET_ADDRESS: process.env.PLATFORM_WALLET_ADDRESS || '11111111111111111111111111111111',
          COINGECKO_API_URL: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
          NGN_USD_RATE: process.env.NGN_USD_RATE || '1600',
          RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || '900000',
          RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || '1000',
          CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
          GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
          FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
          FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
          SOCIAL_CALLBACK_URL: process.env.SOCIAL_CALLBACK_URL || 'http://localhost:3000/api/auth',
          FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
          SESSION_SECRET: process.env.SESSION_SECRET,
          SMTP_HOST: process.env.SMTP_HOST,
          SMTP_PORT: process.env.SMTP_PORT || '587',
          SMTP_USER: process.env.SMTP_USER,
          SMTP_PASS: process.env.SMTP_PASS,
          SMTP_FROM: process.env.SMTP_FROM || 'noreply@kickshaus.com',
        };
      }
      
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();

// Placeholder values used when Supabase is not configured
const PLACEHOLDER_SUPABASE_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_SERVICE_KEY = 'placeholder-service-key';

export const config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',

  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },

  solana: {
    rpcUrl: env.SOLANA_RPC_URL,
    platformWalletAddress: env.PLATFORM_WALLET_ADDRESS,
  },

  coingecko: {
    apiUrl: env.COINGECKO_API_URL,
  },

  // Exchange rate: 1 USD = NGN_USD_RATE NGN
  ngnUsdRate: parseInt(env.NGN_USD_RATE, 10),

  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },

  cors: {
    origin: env.CORS_ORIGIN,
  },

  // Social OAuth configuration
  social: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    facebook: {
      appId: env.FACEBOOK_APP_ID,
      appSecret: env.FACEBOOK_APP_SECRET,
    },
    callbackUrl: env.SOCIAL_CALLBACK_URL,
    frontendUrl: env.FRONTEND_URL,
    sessionSecret: env.SESSION_SECRET || env.JWT_SECRET,
  },

  paystack: {
    secretKey: env.PAYSTACK_SECRET_KEY,
    publicKey: env.PAYSTACK_PUBLIC_KEY,
  },

  email: {
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT, 10),
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
  },
};

/**
 * Check if Supabase is properly configured (not using placeholder values)
 * @returns {boolean} True if Supabase is configured with real values
 */
export function isSupabaseConfigured(): boolean {
  return (
    config.supabase.url !== PLACEHOLDER_SUPABASE_URL &&
    config.supabase.serviceRoleKey !== PLACEHOLDER_SERVICE_KEY
  );
}

/**
 * Check if Google OAuth is configured
 * @returns {boolean} True if Google OAuth is properly configured
 */
export function isGoogleAuthConfigured(): boolean {
  return !!(config.social.google.clientId && config.social.google.clientSecret);
}

/**
 * Check if Facebook OAuth is configured
 * @returns {boolean} True if Facebook OAuth is properly configured
 */
export function isFacebookAuthConfigured(): boolean {
  return !!(config.social.facebook.appId && config.social.facebook.appSecret);
}
