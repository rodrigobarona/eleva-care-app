/**
 * Sentry Server Configuration for Better Stack Error Tracking
 *
 * This file configures Sentry SDK for server-side error tracking using Better Stack.
 * Captures errors from API routes, server components, and server actions.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 * @see https://betterstack.com/docs/errors/collecting-errors/sentry-sdk/
 */
import * as Sentry from '@sentry/nextjs';

import { ENV_CONFIG } from './config/env';

/**
 * Initialize Sentry for server-side error tracking
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
  // Adjust this value in production to reduce data volume
  // 1.0 = 100% of transactions (recommended for initial setup)
  // 0.1 = 10% of transactions (recommended for high-traffic production)
  tracesSampleRate: ENV_CONFIG.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Additional configuration options
  debug: ENV_CONFIG.NODE_ENV === 'development',
  enabled: ENV_CONFIG.NODE_ENV !== 'test',

  // Integrations
  integrations: [
    // HTTP integration for capturing HTTP requests
    Sentry.httpIntegration(),
  ],

  // Configure how errors are sent
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Don't send errors in test environment
    if (ENV_CONFIG.NODE_ENV === 'test') {
      return null;
    }

    // Filter out known non-critical errors
    if (error instanceof Error) {
      // Ignore database connection errors in development
      if (ENV_CONFIG.NODE_ENV === 'development' && error.message.includes('ECONNREFUSED')) {
        return null;
      }

      // Ignore webhook signature verification errors (legitimate failures)
      if (error.message.includes('Webhook signature verification failed')) {
        return null;
      }
    }

    // Add server-specific context
    event.tags = {
      ...event.tags,
      runtime: 'nodejs',
    };

    // Add custom server context
    event.contexts = {
      ...event.contexts,
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Database errors that are handled
    'ECONNREFUSED',
    'ETIMEDOUT',
    // Webhook signature errors
    'Webhook signature verification failed',
    // Expected API errors
    'Not Found',
    'Unauthorized',
    // Rate limiting
    'Too Many Requests',
  ],
});
