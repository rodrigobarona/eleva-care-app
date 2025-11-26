/**
 * BetterStack Configuration
 *
 * This configuration file contains settings for BetterStack integrations:
 * - Uptime monitoring and status page functionality
 * - Error tracking via Sentry SDK integration
 *
 * @see https://betterstack.com/docs/uptime/api
 * @see https://betterstack.com/docs/errors/collecting-errors/sentry-sdk/
 */
import { ENV_CONFIG } from './env';

/**
 * BetterStack API Configuration
 *
 * Required Environment Variables:
 * - BETTERSTACK_API_KEY: Your BetterStack API key for authentication
 * - BETTERSTACK_URL: Your BetterStack status page URL (e.g., https://status.eleva.care)
 *
 * To get your API key:
 * 1. Log in to your BetterStack account
 * 2. Navigate to Settings > API Tokens
 * 3. Create a new API token with 'Read Monitors' permission
 * 4. Copy the token and add it to your .env file
 *
 * To get your status page URL:
 * 1. Navigate to Status Pages in BetterStack
 * 2. Copy the URL of your status page
 * 3. Add it to your .env file
 */
export const betterstackConfig = {
  /**
   * BetterStack API key for authentication
   */
  apiKey: ENV_CONFIG.BETTERSTACK_API_KEY || undefined,

  /**
   * BetterStack status page URL
   */
  statusPageUrl: ENV_CONFIG.BETTERSTACK_URL || undefined,

  /**
   * API endpoint for fetching monitor status
   */
  apiEndpoint: 'https://uptime.betterstack.com/api/v2/monitors',

  /**
   * Cache duration for status data (in seconds)
   * Default: 180 seconds (3 minutes)
   */
  cacheDuration: 180,
} as const satisfies {
  apiKey: string | undefined;
  statusPageUrl: string | undefined;
  apiEndpoint: string;
  cacheDuration: number;
};

/**
 * Validates that all required BetterStack configuration is present
 */
export function validateBetterStackConfig(): boolean {
  return Boolean(betterstackConfig.apiKey && betterstackConfig.statusPageUrl);
}

/**
 * Status color mapping based on monitor health
 */
export const statusColorMap = {
  allUp: 'bg-green-500',
  partialOutage: 'bg-orange-500',
  majorOutage: 'bg-destructive',
  unknown: 'bg-muted-foreground',
} as const;

/**
 * Status label mapping based on monitor health
 */
export const statusLabelMap = {
  allUp: 'All systems normal',
  partialOutage: 'Partial outage',
  majorOutage: 'Degraded performance',
  unknown: 'Unable to fetch status',
} as const;

/**
 * BetterStack Error Tracking Configuration
 *
 * This configuration enables error tracking using the Sentry SDK.
 * Errors are sent to Better Stack's ingestion endpoint for centralized management.
 *
 * Required Environment Variables:
 * - NEXT_PUBLIC_SENTRY_DSN: Your BetterStack Sentry-compatible DSN
 * - SENTRY_ENVIRONMENT: Current environment (development/staging/production)
 * - SENTRY_RELEASE: Release version for tracking (automatically set from Git SHA)
 *
 * To get your DSN:
 * 1. Log in to your BetterStack account
 * 2. Navigate to Errors > Applications
 * 3. Select your application
 * 4. Go to the Data ingestion tab
 * 5. Copy the Application token and Ingesting host
 * 6. Format as: https://{TOKEN}@{HOST}/1
 *
 * @see https://betterstack.com/docs/errors/collecting-errors/sentry-sdk/
 */
export const errorTrackingConfig = {
  /**
   * Sentry DSN for Better Stack error tracking
   */
  dsn: ENV_CONFIG.NEXT_PUBLIC_SENTRY_DSN,

  /**
   * Current environment
   */
  environment: ENV_CONFIG.SENTRY_ENVIRONMENT,

  /**
   * Release version (from Git commit SHA)
   */
  release: ENV_CONFIG.SENTRY_RELEASE,

  /**
   * Whether error tracking is enabled
   */
  enabled: Boolean(ENV_CONFIG.NEXT_PUBLIC_SENTRY_DSN) && ENV_CONFIG.NODE_ENV !== 'test',

  /**
   * Debug mode (enabled in development)
   */
  debug: ENV_CONFIG.NODE_ENV === 'development',
} as const satisfies {
  dsn: string | undefined;
  environment: string;
  release: string | undefined;
  enabled: boolean;
  debug: boolean;
};

/**
 * Validates that error tracking configuration is present
 */
export function validateErrorTrackingConfig(): boolean {
  return Boolean(errorTrackingConfig.dsn);
}

/**
 * Get error tracking status for display
 */
export function getErrorTrackingStatus(): {
  enabled: boolean;
  environment: string;
  hasRelease: boolean;
} {
  return {
    enabled: errorTrackingConfig.enabled,
    environment: errorTrackingConfig.environment,
    hasRelease: Boolean(errorTrackingConfig.release),
  };
}
