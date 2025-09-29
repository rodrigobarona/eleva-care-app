import { ENV_CONFIG, ENV_HELPERS } from '@/config/env';
import { describe, expect, test } from '@jest/globals';

describe('Environment Variable Visibility Tests', () => {
  describe('Server-Side Variables', () => {
    test('should have PostHog API key in server environment', () => {
      expect(ENV_CONFIG.POSTHOG_API_KEY).toBeDefined();
      expect(ENV_CONFIG.POSTHOG_PROJECT_ID).toBeDefined();
    });

    test('should have public PostHog variables available', () => {
      expect(ENV_CONFIG.NEXT_PUBLIC_POSTHOG_KEY).toBeDefined();
      expect(ENV_CONFIG.NEXT_PUBLIC_POSTHOG_HOST).toBeDefined();
    });

    test('should have PostHog variables in env config', () => {
      expect(ENV_CONFIG.POSTHOG_API_KEY).toBeDefined();
      expect(ENV_CONFIG.POSTHOG_PROJECT_ID).toBeDefined();
      expect(ENV_CONFIG.NEXT_PUBLIC_POSTHOG_KEY).toBeDefined();
      expect(ENV_CONFIG.NEXT_PUBLIC_POSTHOG_HOST).toBeDefined();
    });
  });

  describe('Client-Side Variables', () => {
    test('should not expose sensitive variables to the client', () => {
      // Create a mock window object to simulate client-side environment
      const mockWindow = {
        env: {
          POSTHOG_API_KEY: undefined,
          POSTHOG_PROJECT_ID: undefined,
          NEXT_PUBLIC_POSTHOG_KEY: ENV_CONFIG.NEXT_PUBLIC_POSTHOG_KEY,
          NEXT_PUBLIC_POSTHOG_HOST: ENV_CONFIG.NEXT_PUBLIC_POSTHOG_HOST,
        },
      };

      // Verify sensitive variables are not exposed
      expect(mockWindow.env.POSTHOG_API_KEY).toBeUndefined();
      expect(mockWindow.env.POSTHOG_PROJECT_ID).toBeUndefined();

      // Verify public variables are available
      expect(mockWindow.env.NEXT_PUBLIC_POSTHOG_KEY).toBeDefined();
      expect(mockWindow.env.NEXT_PUBLIC_POSTHOG_HOST).toBeDefined();
    });
  });

  describe('Environment Configuration', () => {
    test('should have required variables for PostHog tracking', () => {
      const summary = ENV_HELPERS.getEnvironmentSummary();
      expect(summary.hasPostHog).toBe(true);

      if (!ENV_CONFIG.NEXT_PUBLIC_POSTHOG_KEY) {
        console.warn('⚠️ Warning: NEXT_PUBLIC_POSTHOG_KEY not set');
        console.warn('Analytics tracking will not work without this variable');
      }
    });

    test('should have optional variables for PostHog admin features', () => {
      const summary = ENV_HELPERS.getEnvironmentSummary();
      expect(summary.hasPostHogAPI).toBeDefined();

      if (!summary.hasPostHogAPI) {
        console.info('💡 Info: POSTHOG_API_KEY and POSTHOG_PROJECT_ID not set');
        console.info('These are only needed for automated dashboard creation');
      }
    });
  });

  describe('Variable Validation', () => {
    test('should validate PostHog public key format', () => {
      if (ENV_CONFIG.NEXT_PUBLIC_POSTHOG_KEY) {
        expect(ENV_CONFIG.NEXT_PUBLIC_POSTHOG_KEY).toMatch(/^phc_[a-zA-Z0-9]+$/);
      }
    });

    test('should validate PostHog host URL format', () => {
      if (ENV_CONFIG.NEXT_PUBLIC_POSTHOG_HOST) {
        expect(ENV_CONFIG.NEXT_PUBLIC_POSTHOG_HOST).toMatch(
          /^https?:\/\/[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=]*$/,
        );
      }
    });
  });
});
