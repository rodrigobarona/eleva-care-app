/**
 * Instrumentation Configuration for Next.js 16
 *
 * This file is automatically loaded by Next.js to set up instrumentation.
 * It runs once when the server starts and is used to initialize:
 * - Error tracking (Sentry/Better Stack)
 * - Performance monitoring
 * - Server-side instrumentation
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

/**
 * Register server-side instrumentation
 *
 * This function is called once when the server starts.
 * It's used to initialize Sentry for server-side error tracking.
 *
 * Note: This must be defined even if empty for Next.js 16 instrumentation to work.
 */
export async function register() {
  // Only load Sentry in server environment (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import and initialize Sentry for server-side tracking
    await import('./sentry.server.config');
  }

  // Edge runtime has its own Sentry configuration loaded automatically
  if (process.env.NEXT_RUNTIME === 'edge') {
    // Import and initialize Sentry for edge runtime tracking
    await import('./sentry.edge.config');
  }
}
