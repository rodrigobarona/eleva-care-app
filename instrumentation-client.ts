/**
 * Sentry Client-Side Instrumentation
 *
 * This file configures the Sentry SDK for the browser (client-side).
 * It enables error monitoring, session replay, user feedback, and logging.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment tag for filtering in Sentry
  environment: process.env.NODE_ENV,

  // Adds request headers and IP for users
  // @see https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Sample rate for performance monitoring:
  // - Production: 10% of transactions (balance cost vs. observability)
  // - Development: 100% for debugging
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable in all environments for comprehensive error tracking
  enabled: true,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Enable logs to be sent to Sentry
  enableLogs: true,

  integrations: [
    // Session Replay: Records user sessions for debugging
    // Captures video-like reproductions of user interactions
    Sentry.replayIntegration({
      // Mask all text for privacy
      maskAllText: false,
      // Block all media (images, videos)
      blockAllMedia: false,
    }),

    // User Feedback: Allows users to submit feedback on errors
    Sentry.feedbackIntegration({
      // Automatically inject the feedback button
      autoInject: true,
      // Color scheme follows system preference
      colorScheme: 'system',
      // Show branding
      showBranding: true,
      // Button label
      buttonLabel: 'Report a Bug',
      // Form title
      formTitle: 'Report a Bug',
      // Thank you message
      successMessageText: 'Thank you for your feedback!',
      // Submit button text
      submitButtonLabel: 'Send Feedback',
      // Cancel button text
      cancelButtonLabel: 'Cancel',
      // Email field label
      emailLabel: 'Email',
      // Name field label
      nameLabel: 'Name',
      // Message field label
      messageLabel: 'What happened?',
      // Placeholder text
      messagePlaceholder: 'Describe what happened...',
      // Show email field
      showEmail: true,
      // Show name field
      showName: true,
      // Require email
      isEmailRequired: false,
      // Require name
      isNameRequired: false,
    }),

    // Console logging integration: Sends console logs to Sentry
    Sentry.consoleLoggingIntegration({
      levels: ['error', 'warn'],
    }),
  ],

  // Session Replay sample rates:
  // - Capture 10% of all sessions for general monitoring
  // - Capture 100% of sessions with an error for debugging
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
});

/**
 * Instruments router navigations for tracing.
 * This export is required for capturing route changes in Next.js App Router.
 *
 * Available from @sentry/nextjs version 9.12.0 onwards
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
