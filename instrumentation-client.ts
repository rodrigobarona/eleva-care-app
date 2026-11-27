import * as Sentry from '@sentry/nextjs';
import { initBotId } from 'botid/client/core';

import { ENV_CONFIG } from './config/env';

/**
 * Sentry Client Configuration for Better Stack Error Tracking
 *
 * Moved here from `sentry.client.config.ts`: with Turbopack (the Next 16 default
 * bundler) that file is never loaded, so client-side Sentry was not initialized.
 * `instrumentation-client.ts` is the documented location.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 * @see https://betterstack.com/docs/errors/collecting-errors/sentry-sdk/
 */
Sentry.init({
  // Better Stack DSN (Sentry-compatible endpoint)
  dsn: ENV_CONFIG.NEXT_PUBLIC_SENTRY_DSN,

  // Environment and release tracking
  environment: ENV_CONFIG.SENTRY_ENVIRONMENT,
  release: ENV_CONFIG.SENTRY_RELEASE,

  // Performance Monitoring (2% in production, matching the server config;
  // error capture is unaffected by this rate)
  tracesSampleRate: ENV_CONFIG.NODE_ENV === 'production' ? 0.02 : 1.0,

  // Session Replay
  // No always-on session recording; only sessions that hit an error are kept.
  // The replay integration itself is lazy-loaded below (not in the main bundle).
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Additional configuration options
  debug: ENV_CONFIG.NODE_ENV === 'development',
  enabled: ENV_CONFIG.NODE_ENV !== 'test',

  // Integrations
  integrations: [
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

/**
 * Lazy-load Session Replay (from the Sentry CDN) once the browser is idle, so it
 * is not part of the critical bundle. It must be added before an error occurs
 * for replaysOnErrorSampleRate to capture the preceding activity (buffer mode).
 */
if (typeof window !== 'undefined' && ENV_CONFIG.NODE_ENV !== 'test') {
  const loadReplay = () => {
    Sentry.lazyLoadIntegration('replayIntegration')
      .then((replayIntegration) => {
        Sentry.addIntegration(
          replayIntegration({
            // Mask all text and input content for privacy
            maskAllText: true,
            blockAllMedia: true,
          }),
        );
      })
      .catch(() => {
        // CDN blocked/unavailable: errors are still reported, just without replay
      });
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(loadReplay, { timeout: 5000 });
  } else {
    setTimeout(loadReplay, 3000);
  }
}

/**
 * Sentry Router Transition Tracking
 *
 * This hook enables Sentry to track navigation transitions for better error context.
 * It captures route changes to provide more detailed error reports.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

/**
 * BotID Client Configuration for Eleva Care
 *
 * This configuration protects high-value routes from bot attacks:
 * - Payment processing endpoints
 * - Meeting booking flows
 * - User registration and profile management
 * - File uploads and sensitive operations
 *
 * Routes are configured with appropriate protection levels:
 * - deepAnalysis: For critical payment and booking operations
 * - basic: For general form submissions and user operations
 */

initBotId({
  protect: [
    // 🔥 CRITICAL: Payment & Booking Endpoints (Basic - Free on all plans)
    {
      path: '/api/create-payment-intent',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic', // Free on all plans including Hobby
      },
    },
    {
      path: '/api/create-pack-checkout',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },

    // 🎯 HIGH PRIORITY: Meeting Creation Server Actions
    // Note: Server actions are invoked from pages, so we protect the pages that use them.
    // Private routes are unprefixed (/booking/...), so locale patterns do not match them.
    {
      path: '/*/booking',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic', // Free on all plans
      },
    },
    {
      path: '/*/booking/*',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic', // Free on all plans
      },
    },
    {
      path: '/booking/events/new',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },

    // 📁 File Upload Protection
    {
      path: '/api/upload',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic', // Free on all plans
      },
    },

    // 👤 User Profile & Account Management
    {
      path: '/account',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },
    {
      path: '/setup',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },
    {
      path: '/setup/*',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },

    // 💳 Billing & Stripe Operations
    {
      path: '/api/user/billing',
      method: 'GET',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },
    {
      path: '/api/stripe/dashboard',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },

    // 🛠️ Administrative Operations
    {
      path: '/api/admin/*',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },
    {
      path: '/admin/*',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },

    // 📅 Appointments & Events Management
    {
      path: '/appointments',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },
    {
      path: '/dashboard',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },

    // 🔧 Categories and Settings
    {
      path: '/api/categories',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },
  ],
});
