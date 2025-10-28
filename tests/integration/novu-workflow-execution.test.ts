import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Novu } from '@novu/api';

// This is an integration test that can optionally connect to real Novu API
// Set NOVU_INTEGRATION_TEST=true to run against real API
const INTEGRATION_MODE = process.env.NOVU_INTEGRATION_TEST === 'true';

// Mock Novu only if not in integration mode
if (!INTEGRATION_MODE) {
  jest.mock('@novu/api');
}

interface TriggerResponse {
  data: {
    transactionId: string;
    acknowledged: boolean;
    status?: string;
  };
}

interface SubscriberInfo {
  subscriberId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  locale?: string;
  data?: Record<string, unknown>;
}

interface WorkflowPayload {
  eventType: string;
  eventId: string;
  userId: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  locale?: string;
  userSegment?: string;
  templateVariant?: string;
  timestamp?: number;
  source?: string;
  alertType?: string;
  message?: string;
  eventData?: Record<string, unknown>;
}

describe('Novu Workflow Execution Integration Tests', () => {
  let novu: Novu;
  let testSubscriberId: string;

  beforeAll(async () => {
    if (INTEGRATION_MODE) {
      // Real Novu client for integration testing
      novu = new Novu({
        serverURL: process.env.NOVU_BASE_URL || 'https://eu.api.novu.co',
        secretKey: process.env.NOVU_SECRET_KEY!,
      });

      // Verify connection
      try {
        await novu.subscribers.list({ page: 0, limit: 1 });
        console.log('✅ Connected to Novu API for integration testing');
      } catch (error) {
        console.error('❌ Failed to connect to Novu API:', error);
        throw new Error('Novu API connection failed. Check your credentials.');
      }
    } else {
      // Mock Novu client with proper typing
      const mockTrigger = jest.fn<() => Promise<TriggerResponse>>();
      mockTrigger.mockResolvedValue({
        data: {
          transactionId: 'mock_txn_123',
          acknowledged: true,
          status: 'processed',
        },
      });

      const mockList = jest.fn<() => Promise<{ data: unknown[]; totalCount: number }>>();
      mockList.mockResolvedValue({
        data: [],
        totalCount: 0,
      });

      const mockIdentify = jest.fn<() => Promise<{ data: { _id: string } }>>();
      mockIdentify.mockResolvedValue({
        data: { _id: 'mock_subscriber_id' },
      });

      novu = {
        trigger: mockTrigger,
        subscribers: {
          list: mockList,
          identify: mockIdentify,
        },
      } as unknown as Novu;
    }

    testSubscriberId = `test_user_${Date.now()}`;
  });

  afterAll(async () => {
    // Cleanup test data if in integration mode
    if (INTEGRATION_MODE && testSubscriberId) {
      try {
        // Note: Novu doesn't have a delete subscriber API in the current version
        // In a real scenario, you might want to mark test subscribers differently
        console.log(`Test completed for subscriber: ${testSubscriberId}`);
      } catch (error) {
        console.warn('Cleanup warning:', error);
      }
    }
  });

  beforeEach(() => {
    if (!INTEGRATION_MODE) {
      jest.clearAllMocks();
    }
  });

  describe('user-lifecycle workflow', () => {
    test('should execute successfully with complete user data', async () => {
      // Arrange
      const testPayload: WorkflowPayload = {
        eventType: 'user.created',
        eventId: `test_event_${Date.now()}`,
        userId: testSubscriberId,
        userName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        locale: 'en',
        userSegment: 'patient',
        templateVariant: 'default',
        timestamp: Date.now(),
        source: 'integration_test',
        alertType: 'user.created',
        message: 'User event: user.created',
      };

      const testSubscriber: SubscriberInfo = {
        subscriberId: testSubscriberId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        locale: 'en_US',
        data: {
          clerkUserId: testSubscriberId,
          username: 'johndoe',
          testRun: true, // Mark as test data
        },
      };

      // Act - New Novu API uses direct trigger() method
      const result = await novu.trigger('user-lifecycle', {
        to: testSubscriber,
        payload: testPayload,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();

      if (INTEGRATION_MODE) {
        expect(result.data.transactionId).toBeTruthy();
        expect(result.data.acknowledged).toBe(true);
        console.log(`✅ Workflow triggered successfully: ${result.data.transactionId}`);
      } else {
        expect(novu.trigger).toHaveBeenCalledWith('user-lifecycle', {
          to: testSubscriber,
          payload: testPayload,
        });
      }
    });

    test('should handle expert user segment correctly', async () => {
      // Arrange
      const expertPayload: WorkflowPayload = {
        eventType: 'user.created',
        eventId: `expert_event_${Date.now()}`,
        userId: `expert_${testSubscriberId}`,
        userName: 'Dr. Jane Smith',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'dr.jane@example.com',
        locale: 'en',
        userSegment: 'expert', // Expert user
        templateVariant: 'default',
        timestamp: Date.now(),
        source: 'integration_test',
        alertType: 'user.created',
        message: 'User event: user.created',
      };

      const expertSubscriber: SubscriberInfo = {
        subscriberId: `expert_${testSubscriberId}`,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'dr.jane@example.com',
        locale: 'en_US',
        data: {
          clerkUserId: `expert_${testSubscriberId}`,
          username: 'drjanesmith',
          userType: 'expert',
          testRun: true,
        },
      };

      // Act
      const result = await novu.trigger('user-lifecycle', {
        to: expertSubscriber,
        payload: expertPayload,
      });

      // Assert
      expect(result).toBeDefined();

      if (INTEGRATION_MODE) {
        expect(result.data.acknowledged).toBe(true);
        console.log(`✅ Expert workflow triggered: ${result.data.transactionId}`);
      } else {
        expect(novu.trigger).toHaveBeenCalledWith('user-lifecycle', {
          to: expertSubscriber,
          payload: expertPayload,
        });
      }
    });

    test('should handle minimal payload gracefully', async () => {
      // Arrange - minimal required data
      const minimalPayload: WorkflowPayload = {
        eventType: 'user.created',
        eventId: `minimal_${Date.now()}`,
        userId: `minimal_${testSubscriberId}`,
        userName: 'MinimalUser',
        firstName: '',
        lastName: '',
        email: 'minimal@example.com',
        locale: 'en',
        userSegment: 'patient',
        templateVariant: 'default',
        timestamp: Date.now(),
        source: 'integration_test',
        alertType: 'user.created',
        message: 'User event: user.created',
      };

      const minimalSubscriber: SubscriberInfo = {
        subscriberId: `minimal_${testSubscriberId}`,
        email: 'minimal@example.com',
        data: {
          testRun: true,
        },
      };

      // Act & Assert - should not throw
      await expect(
        novu.trigger('user-lifecycle', {
          to: minimalSubscriber,
          payload: minimalPayload,
        }),
      ).resolves.toBeDefined();

      if (INTEGRATION_MODE) {
        console.log('✅ Minimal payload handled successfully');
      }
    });
  });

  describe('security-auth workflow', () => {
    test('should execute for security events', async () => {
      // Arrange
      const securityPayload: WorkflowPayload = {
        eventType: 'session.created',
        eventId: `security_${Date.now()}`,
        userId: testSubscriberId,
        eventData: {
          id: `sess_${Date.now()}`,
          user_id: testSubscriberId,
          status: 'active',
        },
        timestamp: Date.now(),
        source: 'integration_test',
        alertType: 'recent-login',
        message: 'New login detected on your account',
      };

      const securitySubscriber: SubscriberInfo = {
        subscriberId: testSubscriberId,
        email: 'security.test@example.com',
        data: {
          testRun: true,
        },
      };

      // Act
      const result = await novu.trigger('security-auth', {
        to: securitySubscriber,
        payload: securityPayload,
      });

      // Assert
      expect(result).toBeDefined();

      if (INTEGRATION_MODE) {
        expect(result.data.acknowledged).toBe(true);
        console.log(`✅ Security workflow triggered: ${result.data.transactionId}`);
      } else {
        expect(novu.trigger).toHaveBeenCalledWith('security-auth', {
          to: securitySubscriber,
          payload: securityPayload,
        });
      }
    });
  });

  describe('error scenarios', () => {
    test('should handle invalid workflow ID', async () => {
      // Arrange
      const invalidPayload: WorkflowPayload = {
        eventType: 'invalid.event',
        eventId: `invalid_${Date.now()}`,
        userId: testSubscriberId,
      };

      const subscriber: SubscriberInfo = {
        subscriberId: testSubscriberId,
        email: 'test@example.com',
      };

      // Act & Assert
      if (INTEGRATION_MODE) {
        await expect(
          novu.trigger('non-existent-workflow', {
            to: subscriber,
            payload: invalidPayload,
          }),
        ).rejects.toThrow();
      } else {
        // Mock should handle this gracefully
        const mockError = new Error('Workflow not found');
        (novu.trigger as jest.Mock).mockRejectedValueOnce(mockError);

        await expect(
          novu.trigger('non-existent-workflow', {
            to: subscriber,
            payload: invalidPayload,
          }),
        ).rejects.toThrow('Workflow not found');
      }
    });

    test('should handle missing subscriber email', async () => {
      // Arrange
      const payload: WorkflowPayload = {
        eventType: 'user.created',
        eventId: `missing_email_${Date.now()}`,
        userId: testSubscriberId,
        userName: 'Test User',
      };

      const invalidSubscriber: SubscriberInfo = {
        subscriberId: testSubscriberId,
        // Missing email
      };

      // Act & Assert
      if (INTEGRATION_MODE) {
        // Real API should reject missing email
        await expect(
          novu.trigger('user-lifecycle', {
            to: invalidSubscriber,
            payload,
          }),
        ).rejects.toThrow();
        return;
      } else {
        // Mock should still work
        await expect(
          novu.trigger('user-lifecycle', {
            to: invalidSubscriber,
            payload,
          }),
        ).resolves.toBeDefined();
      }
    });
  });

  describe('workflow performance', () => {
    test('should execute within reasonable time limits', async () => {
      // Arrange
      const startTime = Date.now();

      const payload: WorkflowPayload = {
        eventType: 'user.created',
        eventId: `perf_${Date.now()}`,
        userId: `perf_${testSubscriberId}`,
        userName: 'Performance Test User',
        email: 'perf@example.com',
        userSegment: 'patient',
      };

      const subscriber: SubscriberInfo = {
        subscriberId: `perf_${testSubscriberId}`,
        email: 'perf@example.com',
        data: { testRun: true },
      };

      // Act
      const result = await novu.trigger('user-lifecycle', {
        to: subscriber,
        payload,
      });

      const executionTime = Date.now() - startTime;

      // Assert
      expect(result).toBeDefined();

      if (INTEGRATION_MODE) {
        expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
        console.log(`✅ Workflow executed in ${executionTime}ms`);
      } else {
        expect(executionTime).toBeLessThan(100); // Mock should be very fast
      }
    });
  });
});

// Helper function to run integration tests
export function runIntegrationTests(): void {
  if (!process.env.NOVU_SECRET_KEY) {
    console.log('⚠️  Skipping integration tests - NOVU_SECRET_KEY not provided');
    return;
  }

  console.log('🧪 Running Novu integration tests...');
  console.log('Set NOVU_INTEGRATION_TEST=true to test against real API');
}
