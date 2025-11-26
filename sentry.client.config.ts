/**
 * Sentry Client Configuration for Better Stack Error Tracking
 *
 * This file configures Sentry SDK for client-side error tracking using Better Stack.
 * Errors are sent to Better Stack's ingestion endpoint for centralized error management.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 * @see https://betterstack.com/docs/errors/collecting-errors/sentry-sdk/
 */
import * as Sentry from '@sentry/nextjs';

import { ENV_CONFIG } from './config/env';

/**
 * Initialize Sentry for client-side error tracking
 *
 * Configuration options:
 * - dsn: Better Stack ingestion endpoint (Sentry-compatible)
 * - environment: Current environment (development/staging/production)
 * - release: Git commit SHA for release tracking (from Vercel)
 * - tracesSampleRate: Percentage of transactions to capture for performance monitoring
 * - replaysSessionSampleRate: Percentage of sessions to record for replay
 * - replaysOnErrorSampleRate: Percentage of sessions with errors to record
 * - beforeSend: Hook to filter or modify events before sending
 */
Sentry.init({
  // Better Stack DSN (Sentry-compatible endpoint)
  dsn: ENV_CONFIG.NEXT_PUBLIC_SENTRY_DSN,

  // Environment and release tracking
  environment: ENV_CONFIG.SENTRY_ENVIRONMENT,
  release: ENV_CONFIG.SENTRY_RELEASE,

  // Performance Monitoring
  // Adjust this value in production to reduce data volume
  // 1.0 = 100% of transactions (recommended for initial setup)
  // 0.1 = 10% of transactions (recommended for high-traffic production)
  tracesSampleRate: ENV_CONFIG.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay
  // This replays user sessions for debugging
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Additional configuration options
  debug: ENV_CONFIG.NODE_ENV === 'development',
  enabled: ENV_CONFIG.NODE_ENV !== 'test',

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text and input content for privacy
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration({
      // Enable automatic transaction tracking
      traceFetch: true,
      traceXHR: true,
    }),
  ],

  // Configure how errors are sent
  beforeSend(event, hint) {
    // Filter out known non-critical errors
    const error = hint.originalException;

    // Don't send errors in test environment
    if (ENV_CONFIG.NODE_ENV === 'test') {
      return null;
    }

    // Filter out network errors from development environment
    if (ENV_CONFIG.NODE_ENV === 'development' && error instanceof Error) {
      if (error.message.includes('Network request failed')) {
        return null;
      }
    }

    // Add custom context
    if (event.request?.url) {
      event.tags = {
        ...event.tags,
        url: event.request.url,
      };
    }

    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Random plugins/extensions
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    // Network errors
    'NetworkError',
    'Failed to fetch',
    // Aborted requests
    'AbortError',
    // User navigation
    'Navigation cancelled',
  ],

  // Ignore specific URLs
  denyUrls: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
  ],
});
