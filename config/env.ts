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

  // Unified Redis Configuration (Upstash)
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',

  // Authentication (Clerk)
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',
  CLERK_WEBHOOK_SIGNING_SECRET: process.env.CLERK_WEBHOOK_SIGNING_SECRET || '',

  // Clerk Core 2 (v6) Redirect URLs - Use proper naming convention
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL:
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || '/dashboard',
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL:
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || '/dashboard',
  NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL:
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL || '',
  NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL:
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL || '',
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL || '/',

  // Stripe Configuration
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_API_VERSION: process.env.STRIPE_API_VERSION || '2025-07-30.basil',
  STRIPE_PLATFORM_FEE_PERCENTAGE: process.env.STRIPE_PLATFORM_FEE_PERCENTAGE || '0.15',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  STRIPE_CONNECT_WEBHOOK_SECRET: process.env.STRIPE_CONNECT_WEBHOOK_SECRET || '',
  STRIPE_IDENTITY_WEBHOOK_SECRET: process.env.STRIPE_IDENTITY_WEBHOOK_SECRET || '',

  // QStash Configuration
  QSTASH_TOKEN: process.env.QSTASH_TOKEN || '',
  QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY || '',

  // Email Configuration
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',

  // Base URL Configuration
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || '',

  // Novu Configuration
  NOVU_API_KEY: process.env.NOVU_API_KEY || '',
  NOVU_SECRET_KEY: process.env.NOVU_SECRET_KEY || '',
  NOVU_BASE_URL: process.env.NOVU_BASE_URL || 'https://eu.api.novu.co',
  NOVU_SOCKET_URL: process.env.NOVU_SOCKET_URL || 'https://eu.ws.novu.co',
  NOVU_ADMIN_SUBSCRIBER_ID: process.env.NOVU_ADMIN_SUBSCRIBER_ID || 'admin',
  NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER:
    process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER || '',

  // Posthog Configuration
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST || '',
  POSTHOG_API_KEY: process.env.POSTHOG_API_KEY || '',
  POSTHOG_PROJECT_ID: process.env.POSTHOG_PROJECT_ID || '',
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
   * Validate unified Redis configuration
   */
  redis(): EnvValidationResult {
    const missingVars: string[] = [];

    // Check for unified Redis configuration
    if (!ENV_CONFIG.UPSTASH_REDIS_REST_URL) missingVars.push('UPSTASH_REDIS_REST_URL');
    if (!ENV_CONFIG.UPSTASH_REDIS_REST_TOKEN) missingVars.push('UPSTASH_REDIS_REST_TOKEN');

    const hasUnifiedConfig = missingVars.length === 0;

    let message = '';
    if (hasUnifiedConfig) {
      message = 'Unified Redis configuration is valid';
    } else {
      message = `Missing Redis environment variables: ${missingVars.join(', ')}. Redis cache will fall back to in-memory mode.`;
    }

    return {
      isValid: hasUnifiedConfig,
      message,
      missingVars: hasUnifiedConfig ? [] : missingVars,
    };
  },

  /**
   * Validate authentication environment variables
   */
  auth(): EnvValidationResult {
    const missingVars: string[] = [];

    if (!ENV_CONFIG.CLERK_SECRET_KEY) missingVars.push('CLERK_SECRET_KEY');
    if (!ENV_CONFIG.CLERK_PUBLISHABLE_KEY) missingVars.push('CLERK_PUBLISHABLE_KEY');

    // Clerk v6 redirect URLs are optional but recommended for proper OAuth handling
    const optionalVars: string[] = [];
    if (!ENV_CONFIG.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL)
      optionalVars.push('NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL');
    if (!ENV_CONFIG.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL)
      optionalVars.push('NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL');

    return {
      isValid: missingVars.length === 0,
      message:
        missingVars.length > 0
          ? `Missing authentication environment variables: ${missingVars.join(', ')}`
          : optionalVars.length > 0
            ? `Authentication configuration is valid. Optional variables for better OAuth handling: ${optionalVars.join(', ')}`
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
   * Validate Novu environment variables
   */
  novu(): EnvValidationResult {
    const missingVars: string[] = [];

    // Check for either NOVU_API_KEY or NOVU_SECRET_KEY (legacy compatibility)
    if (!ENV_CONFIG.NOVU_API_KEY && !ENV_CONFIG.NOVU_SECRET_KEY) {
      missingVars.push('NOVU_API_KEY or NOVU_SECRET_KEY');
    }
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
   * Validate PostHog environment variables
   */
  posthog(): EnvValidationResult {
    const missingVars: string[] = [];

    // Client-side tracking variables (required for analytics)
    if (!ENV_CONFIG.NEXT_PUBLIC_POSTHOG_KEY) missingVars.push('NEXT_PUBLIC_POSTHOG_KEY');
    if (!ENV_CONFIG.NEXT_PUBLIC_POSTHOG_HOST) missingVars.push('NEXT_PUBLIC_POSTHOG_HOST');

    // Server-side API variables (optional, only for dashboard automation)
    const hasApiConfig = ENV_CONFIG.POSTHOG_API_KEY && ENV_CONFIG.POSTHOG_PROJECT_ID;
    const hasPartialApiConfig = ENV_CONFIG.POSTHOG_API_KEY || ENV_CONFIG.POSTHOG_PROJECT_ID;

    let message = '';
    if (missingVars.length === 0) {
      if (hasApiConfig) {
        message = 'PostHog configuration is complete (analytics + dashboard automation)';
      } else if (hasPartialApiConfig) {
        message =
          'PostHog analytics configured, but incomplete API configuration for dashboard automation';
      } else {
        message = 'PostHog analytics configured (dashboard automation not configured)';
      }
    } else {
      message = `Missing PostHog environment variables: ${missingVars.join(', ')}`;
    }

    return {
      isValid: missingVars.length === 0,
      message,
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
   * Get the base application URL with fallbacks
   */
  getBaseUrl(): string {
    if (ENV_CONFIG.NEXT_PUBLIC_BASE_URL) {
      return ENV_CONFIG.NEXT_PUBLIC_BASE_URL;
    }

    return this.isDevelopment() ? 'http://localhost:3000' : 'https://eleva.care';
  },

  /**
   * Get environment configuration summary
   */
  getEnvironmentSummary() {
    const redisValidation = ENV_VALIDATORS.redis();
    const posthogValidation = ENV_VALIDATORS.posthog();

    return {
      nodeEnv: ENV_CONFIG.NODE_ENV,
      isDevelopment: this.isDevelopment(),
      isProduction: this.isProduction(),
      hasDatabase: Boolean(ENV_CONFIG.DATABASE_URL),
      hasAuth: Boolean(ENV_CONFIG.CLERK_SECRET_KEY),
      hasStripe: Boolean(ENV_CONFIG.STRIPE_SECRET_KEY),
      hasRedis: redisValidation.isValid,
      redisMode: ENV_CONFIG.UPSTASH_REDIS_REST_URL ? 'unified' : 'in-memory',
      hasQStash: Boolean(ENV_CONFIG.QSTASH_TOKEN),
      hasEmail: Boolean(ENV_CONFIG.RESEND_API_KEY),
      hasNovu: Boolean(
        ENV_CONFIG.NOVU_SECRET_KEY || ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER,
      ),
      hasPostHog: posthogValidation.isValid,
      hasPostHogAPI: Boolean(ENV_CONFIG.POSTHOG_API_KEY && ENV_CONFIG.POSTHOG_PROJECT_ID),
      baseUrl: this.getBaseUrl(),
    };
  },
} as const;
