import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy, Profile as FacebookProfile } from 'passport-facebook';
import { config, isGoogleAuthConfigured, isFacebookAuthConfigured } from './env';
import { authService } from '../services/auth.service';

/**
 * Social profile data extracted from OAuth provider
 */
export interface SocialProfile {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  emailVerified: boolean;
  fullName?: string;
}

/**
 * Initialize Passport strategies for social authentication
 */
export function initializePassport(): void {
  // Configure Google OAuth Strategy
  if (isGoogleAuthConfigured()) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.social.google.clientId!,
          clientSecret: config.social.google.clientSecret!,
          callbackURL: `${config.social.callbackUrl}/google/callback`,
          scope: ['profile', 'email'],
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: GoogleProfile,
          done: (error: Error | null, user?: Express.User) => void
        ) => {
          try {
            // Extract email from profile
            const email = profile.emails?.[0]?.value;
            // The verified field can be boolean or string 'true' depending on provider version
            const verifiedValue = profile.emails?.[0]?.verified;
            const emailVerified = verifiedValue === true || String(verifiedValue) === 'true';

            if (!email) {
              return done(new Error('No email provided by Google'));
            }

            // Zero-Trust: Only accept verified emails
            if (!emailVerified) {
              return done(new Error('Email not verified by Google'));
            }

            const socialProfile: SocialProfile = {
              provider: 'google',
              providerId: profile.id,
              email,
              emailVerified,
              fullName: profile.displayName,
            };

            // Find or create user
            const user = await authService.findOrCreateSocialUser(socialProfile);
            // Cast to Express.User - we handle the conversion to JWT in the callback handler
            return done(null, user as unknown as Express.User);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );
    console.log('✅ Google OAuth strategy configured');
  } else {
    console.log('⚠️  Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)');
  }

  // Configure Facebook OAuth Strategy
  if (isFacebookAuthConfigured()) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: config.social.facebook.appId!,
          clientSecret: config.social.facebook.appSecret!,
          callbackURL: `${config.social.callbackUrl}/facebook/callback`,
          profileFields: ['id', 'emails', 'name', 'displayName'],
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: FacebookProfile,
          done: (error: Error | null, user?: Express.User) => void
        ) => {
          try {
            // Extract email from profile
            const email = profile.emails?.[0]?.value;

            if (!email) {
              return done(new Error('No email provided by Facebook. Please ensure your Facebook account has a verified email.'));
            }

            // Facebook emails through OAuth are generally verified
            const socialProfile: SocialProfile = {
              provider: 'facebook',
              providerId: profile.id,
              email,
              emailVerified: true,
              fullName: profile.displayName,
            };

            // Find or create user
            const user = await authService.findOrCreateSocialUser(socialProfile);
            // Cast to Express.User - we handle the conversion to JWT in the callback handler
            return done(null, user as unknown as Express.User);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );
    console.log('✅ Facebook OAuth strategy configured');
  } else {
    console.log('⚠️  Facebook OAuth not configured (missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET)');
  }

  // Serialize user for session (we don't use sessions, but passport requires this)
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user as Express.User);
  });
}

export default passport;
