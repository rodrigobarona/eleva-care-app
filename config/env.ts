/**
 * Centralized environment configuration
 * Validates and provides typed access to all environment variables
 */

/**
 * Environment configuration object with validation
 */
export const ENV_CONFIG = {
  // Node Environment
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || '',
  AUDITLOG_DATABASE_URL: process.env.AUDITLOG_DATABASE_URL || '',

  // KV Database Configuration
  KV_REST_API_URL: process.env.KV_REST_API_URL || '',
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN || '',

  // Authentication (Clerk)
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',

  // Stripe Configuration
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_API_VERSION: process.env.STRIPE_API_VERSION || '2025-04-30.basil',
  STRIPE_PLATFORM_FEE_PERCENTAGE: process.env.STRIPE_PLATFORM_FEE_PERCENTAGE || '0.15',

  // QStash Configuration
  QSTASH_TOKEN: process.env.QSTASH_TOKEN || '',
  QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY || '',
  QSTASH_URL: process.env.QSTASH_URL || '',

  // Google OAuth Configuration
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
  GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
  GOOGLE_OAUTH_REDIRECT_URL: process.env.GOOGLE_OAUTH_REDIRECT_URL || '',

  // Email Configuration (Resend)
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_EMAIL_BOOKINGS_FROM: process.env.RESEND_EMAIL_BOOKINGS_FROM || '',

  // External API Configuration
  DUB_API_KEY: process.env.DUB_API_KEY || '',
  DUB_API_ENDPOINT: process.env.DUB_API_ENDPOINT || 'https://api.dub.co/links',
  DUB_DEFAULT_DOMAIN: process.env.DUB_DEFAULT_DOMAIN || 'go.eleva.care',

  // Gravatar API Configuration
  GRAVATAR_API_KEY: process.env.GRAVATAR_API_KEY || '',

  // Novu Configuration
  NOVU_SECRET_KEY: process.env.NOVU_SECRET_KEY || '',
  NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER:
    process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER || '',

  // Security
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
  CRON_API_KEY: process.env.CRON_API_KEY || '',

  // Application URLs
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || '',
  VERCEL_URL: process.env.VERCEL_URL || '',

  // Analytics
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST || '',
} as const;

/**
 * Environment validation results
 */
interface EnvValidationResult {
  isValid: boolean;
  message: string;
  missingVars?: string[];
}

/**
 * Validate environment variables by category
 */
export const ENV_VALIDATORS = {
  /**
   * Validate database environment variables
   */
  database(): EnvValidationResult {
    const missingVars: string[] = [];

    if (!ENV_CONFIG.DATABASE_URL) missingVars.push('DATABASE_URL');
    if (!ENV_CONFIG.AUDITLOG_DATABASE_URL) missingVars.push('AUDITLOG_DATABASE_URL');

    return {
      isValid: missingVars.length === 0,
      message:
        missingVars.length > 0
          ? `Missing database environment variables: ${missingVars.join(', ')}`
          : 'Database configuration is valid',
      missingVars,
    };
  },

  /**
   * Validate authentication environment variables
   */
  auth(): EnvValidationResult {
    const missingVars: string[] = [];

    if (!ENV_CONFIG.CLERK_SECRET_KEY) missingVars.push('CLERK_SECRET_KEY');

    return {
      isValid: missingVars.length === 0,
      message:
        missingVars.length > 0
          ? `Missing authentication environment variables: ${missingVars.join(', ')}`
          : 'Authentication configuration is valid',
      missingVars,
    };
  },

  /**
   * Validate Stripe environment variables
   */
  stripe(): EnvValidationResult {
    const missingVars: string[] = [];

    if (!ENV_CONFIG.STRIPE_SECRET_KEY) missingVars.push('STRIPE_SECRET_KEY');

    return {
      isValid: missingVars.length === 0,
      message:
        missingVars.length > 0
          ? `Missing Stripe environment variables: ${missingVars.join(', ')}`
          : 'Stripe configuration is valid',
      missingVars,
    };
  },

  /**
   * Validate QStash environment variables
   */
  qstash(): EnvValidationResult {
    const missingVars: string[] = [];

    if (!ENV_CONFIG.QSTASH_TOKEN) missingVars.push('QSTASH_TOKEN');
    if (!ENV_CONFIG.QSTASH_CURRENT_SIGNING_KEY) missingVars.push('QSTASH_CURRENT_SIGNING_KEY');
    if (!ENV_CONFIG.QSTASH_NEXT_SIGNING_KEY) missingVars.push('QSTASH_NEXT_SIGNING_KEY');

    return {
      isValid: missingVars.length === 0,
      message:
        missingVars.length > 0
          ? `Missing QStash environment variables: ${missingVars.join(', ')}`
          : 'QStash configuration is valid',
      missingVars,
    };
  },

  /**
   * Validate email configuration
   */
  email(): EnvValidationResult {
    const missingVars: string[] = [];

    if (!ENV_CONFIG.RESEND_API_KEY) missingVars.push('RESEND_API_KEY');

    return {
      isValid: missingVars.length === 0,
      message:
        missingVars.length > 0
          ? `Missing email environment variables: ${missingVars.join(', ')}`
          : 'Email configuration is valid',
      missingVars,
    };
  },

  /**
   * Validate Google OAuth configuration
   */
  googleOAuth(): EnvValidationResult {
    const missingVars: string[] = [];

    if (!ENV_CONFIG.GOOGLE_OAUTH_CLIENT_ID) missingVars.push('GOOGLE_OAUTH_CLIENT_ID');
    if (!ENV_CONFIG.GOOGLE_OAUTH_CLIENT_SECRET) missingVars.push('GOOGLE_OAUTH_CLIENT_SECRET');
    if (!ENV_CONFIG.GOOGLE_OAUTH_REDIRECT_URL) missingVars.push('GOOGLE_OAUTH_REDIRECT_URL');

    return {
      isValid: missingVars.length === 0,
      message:
        missingVars.length > 0
          ? `Missing Google OAuth environment variables: ${missingVars.join(', ')}`
          : 'Google OAuth configuration is valid',
      missingVars,
    };
  },

  /**
   * Validate Novu environment variables
   */
  novu(): EnvValidationResult {
    const missingVars: string[] = [];

    if (!ENV_CONFIG.NOVU_SECRET_KEY) missingVars.push('NOVU_SECRET_KEY');
    if (!ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER)
      missingVars.push('NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER');

    return {
      isValid: missingVars.length === 0,
      message:
        missingVars.length > 0
          ? `Missing Novu environment variables: ${missingVars.join(', ')}`
          : 'Novu configuration is valid',
      missingVars,
    };
  },

  /**
   * Validate all critical environment variables
   */
  critical(): EnvValidationResult {
    const criticalValidations = [this.database(), this.auth(), this.stripe()];

    const missingVars: string[] = [];
    for (const validation of criticalValidations) {
      if (validation.missingVars) {
        missingVars.push(...validation.missingVars);
      }
    }

    return {
      isValid: missingVars.length === 0,
      message:
        missingVars.length > 0
          ? `Missing critical environment variables: ${missingVars.join(', ')}`
          : 'All critical environment variables are configured',
      missingVars,
    };
  },
} as const;

/**
 * Helper functions for specific environment variables
 */
export const ENV_HELPERS = {
  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return ENV_CONFIG.NODE_ENV === 'development';
  },

  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return ENV_CONFIG.NODE_ENV === 'production';
  },

  /**
   * Check if running in test mode
   */
  isTest(): boolean {
    return ENV_CONFIG.NODE_ENV === 'test';
  },

  /**
   * Get the Gravatar API key
   */
  getGravatarApiKey(): string | undefined {
    return ENV_CONFIG.GRAVATAR_API_KEY || undefined;
  },

  /**
   * Check if Gravatar API key is configured
   */
  hasGravatarApiKey(): boolean {
    return Boolean(ENV_CONFIG.GRAVATAR_API_KEY);
  },

  /**
   * Get the base application URL with fallbacks
   */
  getBaseUrl(): string {
    if (ENV_CONFIG.NEXT_PUBLIC_APP_URL) {
      return ENV_CONFIG.NEXT_PUBLIC_APP_URL;
    }

    if (ENV_CONFIG.NEXT_PUBLIC_BASE_URL) {
      return ENV_CONFIG.NEXT_PUBLIC_BASE_URL;
    }

    if (ENV_CONFIG.VERCEL_URL) {
      return `https://${ENV_CONFIG.VERCEL_URL}`;
    }

    return this.isDevelopment() ? 'http://localhost:3000' : 'https://eleva.care';
  },

  /**
   * Get environment configuration summary
   */
  getEnvironmentSummary() {
    return {
      nodeEnv: ENV_CONFIG.NODE_ENV,
      isDevelopment: this.isDevelopment(),
      isProduction: this.isProduction(),
      hasDatabase: Boolean(ENV_CONFIG.DATABASE_URL),
      hasAuth: Boolean(ENV_CONFIG.CLERK_SECRET_KEY),
      hasStripe: Boolean(ENV_CONFIG.STRIPE_SECRET_KEY),
      hasQStash: Boolean(ENV_CONFIG.QSTASH_TOKEN),
      hasEmail: Boolean(ENV_CONFIG.RESEND_API_KEY),
      hasGravatar: this.hasGravatarApiKey(),
      hasNovu: Boolean(
        ENV_CONFIG.NOVU_SECRET_KEY && ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER,
      ),
      baseUrl: this.getBaseUrl(),
    };
  },
} as const;
