/**
 * Sentry Client Configuration (Better Stack Integration)
 *
 * This file configures the Sentry SDK for the client-side (browser).
 * Errors are sent to Better Stack via their Sentry-compatible ingestion endpoint.
 *
 * @see https://betterstack.com/docs/errors/collecting-errors/sentry-sdk/
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Better Stack DSN format: https://$APPLICATION_TOKEN@$INGESTING_HOST/1
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // Adjust this value in production to balance performance vs. cost.
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
});

