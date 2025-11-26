/**
 * Sentry Edge Configuration for Better Stack Error Tracking
 *
 * This file configures Sentry SDK for edge runtime error tracking using Better Stack.
 * Captures errors from middleware and edge functions.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 * @see https://betterstack.com/docs/errors/collecting-errors/sentry-sdk/
 */
import * as Sentry from '@sentry/nextjs';

import { ENV_CONFIG } from './config/env';

/**
 * Initialize Sentry for edge runtime error tracking
 *
 * Configuration options:
 * - dsn: Better Stack ingestion endpoint (Sentry-compatible)
 * - environment: Current environment (development/staging/production)
 * - release: Git commit SHA for release tracking (from Vercel)
 * - tracesSampleRate: Percentage of transactions to capture for performance monitoring
 * - beforeSend: Hook to filter or modify events before sending
 */
Sentry.init({
  // Better Stack DSN (Sentry-compatible endpoint)
  dsn: ENV_CONFIG.NEXT_PUBLIC_SENTRY_DSN,

  // Environment and release tracking
  environment: ENV_CONFIG.SENTRY_ENVIRONMENT,
  release: ENV_CONFIG.SENTRY_RELEASE,

  // Performance Monitoring
  // Edge functions are typically fast and low-volume, so we can sample more
  tracesSampleRate: ENV_CONFIG.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Additional configuration options
  debug: ENV_CONFIG.NODE_ENV === 'development',
  enabled: ENV_CONFIG.NODE_ENV !== 'test',

  // Configure how errors are sent
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Don't send errors in test environment
    if (ENV_CONFIG.NODE_ENV === 'test') {
      return null;
    }

    // Filter out known non-critical errors
    if (error instanceof Error) {
      // Ignore expected middleware redirects
      if (error.message.includes('NEXT_REDIRECT')) {
        return null;
      }
    }

    // Add edge-specific context
    event.tags = {
      ...event.tags,
      runtime: 'edge',
    };

    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Expected Next.js redirects
    'NEXT_REDIRECT',
    'NEXT_NOT_FOUND',
    // Middleware-specific errors
    'Middleware redirect',
  ],
});
