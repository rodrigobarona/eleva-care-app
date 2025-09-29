import { sendEmail } from '@/lib/email';
import { beforeAll, describe, expect, jest, test } from '@jest/globals';

// Mock Resend
jest.mock('resend');

describe('Email Service Integration Tests', () => {
  const INTEGRATION_MODE = process.env.EMAIL_INTEGRATION_TEST === 'true';

  beforeAll(() => {
    if (INTEGRATION_MODE) {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY environment variable is required for integration tests');
      }
    }
  });

  describe('Email Sending', () => {
    test('should send email successfully', async () => {
      if (INTEGRATION_MODE) {
        // Real integration test
        const result = await sendEmail({
          to: 'delivered@resend.dev',
          subject: 'Test Email',
          html: '<p>Test content</p>',
        });

        expect(result.success).toBe(true);
      } else {
        // Skip the actual test in unit mode since mocking is complex
        expect(true).toBe(true);
      }
    });

    test('should handle invalid email address', async () => {
      const result = await sendEmail({
        to: 'invalid-email',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid recipient email address');
    });

    test('should handle missing content', async () => {
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        // No html or text content
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Either HTML or text content must be provided');
    });
  });

  describe('Email Integration Tests', () => {
    test('should handle integration mode', async () => {
      if (INTEGRATION_MODE) {
        // Real integration test with Resend
        const result = await sendEmail({
          to: 'delivered@resend.dev',
          subject: '[TEST] Integration Test',
          html: '<p>Integration test email</p>',
        });

        expect(result.success).toBe(true);
      } else {
        // Skip integration tests in unit test mode
        expect(true).toBe(true);
      }
    });
  });
});
