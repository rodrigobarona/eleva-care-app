/**
 * Sentry Server Configuration (Better Stack Integration)
 *
 * This file configures the Sentry SDK for the server-side (Node.js).
 * Errors are sent to Better Stack via their Sentry-compatible ingestion endpoint.
 *
 * @see https://betterstack.com/docs/errors/collecting-errors/sentry-sdk/
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Better Stack DSN format: https://$APPLICATION_TOKEN@$INGESTING_HOST/1
  dsn: process.env.SENTRY_DSN,

  // Sample rate for performance monitoring:
  // - Production: 10% of transactions (balance cost vs. observability)
  // - Development: 100% for debugging
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Environment tag for filtering in Better Stack
  environment: process.env.NODE_ENV,
});
