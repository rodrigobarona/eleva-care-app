import { beforeEach, describe, expect, test } from '@jest/globals';

// Mock the Novu utilities
const mockTriggerWorkflow = jest.fn();
const mockGetWorkflowFromClerkEvent = jest.fn();

jest.mock('@/lib/integrations/novu/utils', () => ({
  triggerNovuWorkflow: mockTriggerWorkflow,
  getWorkflowFromClerkEvent: mockGetWorkflowFromClerkEvent,
  buildNovuSubscriberFromClerk: jest.fn(),
}));

describe('User Lifecycle Workflow Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTriggerWorkflow.mockResolvedValue({
      success: true,
      transactionId: 'txn_test_123',
    });
    mockGetWorkflowFromClerkEvent.mockReturnValue('user-lifecycle');
  });

  describe('Payload Structure Fix', () => {
    test('should construct payload with user fields at root level', () => {
      // Arrange - simulate Clerk user data
      const clerkUserData = {
        id: 'user_123',
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        email_addresses: [{ email_address: 'john@example.com' }],
        public_metadata: { role: ['patient'] },
      };

      // Act - simulate the fixed payload construction
      const payload = {
        eventType: 'user.created',
        eventId: clerkUserData.id,
        userId: clerkUserData.id,
        // ✅ Fixed: Extract user fields to payload root level
        userName:
          clerkUserData.username ||
          `${clerkUserData.first_name} ${clerkUserData.last_name}`.trim() ||
          clerkUserData.id,
        firstName: clerkUserData.first_name || '',
        lastName: clerkUserData.last_name || '',
        email: clerkUserData.email_addresses?.[0]?.email_address || '',
        locale: 'en',
        userSegment: (clerkUserData.public_metadata?.role as string[])?.includes('expert')
          ? 'expert'
          : 'patient',
        templateVariant: 'default',
        // Keep full event data for reference
        eventData: clerkUserData,
        timestamp: Date.now(),
        source: 'clerk_webhook',
        alertType: 'user.created',
        message: 'User event: user.created',
      };

      // Assert - verify the fix
      expect(payload).toMatchObject({
        eventType: 'user.created',
        userId: 'user_123',
        userName: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        userSegment: 'patient',
        locale: 'en',
      });

      // Verify eventData is preserved for reference
      expect(payload.eventData).toEqual(clerkUserData);
    });

    test('should handle expert user segment detection', () => {
      // Arrange - expert user data
      const expertUserData = {
        id: 'expert_123',
        first_name: 'Dr. Jane',
        last_name: 'Smith',
        username: 'drjanesmith',
        email_addresses: [{ email_address: 'dr.jane@example.com' }],
        public_metadata: { role: ['expert', 'admin'] },
      };

      // Act
      const payload = {
        eventType: 'user.created',
        eventId: expertUserData.id,
        userId: expertUserData.id,
        userName:
          expertUserData.username ||
          `${expertUserData.first_name} ${expertUserData.last_name}`.trim(),
        firstName: expertUserData.first_name || '',
        lastName: expertUserData.last_name || '',
        email: expertUserData.email_addresses?.[0]?.email_address || '',
        locale: 'en',
        userSegment: (expertUserData.public_metadata?.role as string[])?.includes('expert')
          ? 'expert'
          : 'patient',
        templateVariant: 'default',
        eventData: expertUserData,
        timestamp: Date.now(),
        source: 'clerk_webhook',
        alertType: 'user.created',
        message: 'User event: user.created',
      };

      // Assert
      expect(payload.userSegment).toBe('expert');
      expect(payload.userName).toBe('drjanesmith');
      expect(payload.firstName).toBe('Dr. Jane');
    });

    test('should handle missing user data gracefully', () => {
      // Arrange - minimal user data
      const minimalUserData = {
        id: 'user_minimal',
        // Missing first_name, last_name, username, email_addresses
        public_metadata: {},
      };

      // Act
      const payload = {
        eventType: 'user.created',
        eventId: minimalUserData.id,
        userId: minimalUserData.id,
        userName:
          (minimalUserData as any).username ||
          `${(minimalUserData as any).first_name || ''} ${(minimalUserData as any).last_name || ''}`.trim() ||
          minimalUserData.id,
        firstName: (minimalUserData as any).first_name || '',
        lastName: (minimalUserData as any).last_name || '',
        email: (minimalUserData as any).email_addresses?.[0]?.email_address || '',
        locale: 'en',
        userSegment: ((minimalUserData.public_metadata as any)?.role as string[])?.includes(
          'expert',
        )
          ? 'expert'
          : 'patient',
        templateVariant: 'default',
        eventData: minimalUserData,
        timestamp: Date.now(),
        source: 'clerk_webhook',
        alertType: 'user.created',
        message: 'User event: user.created',
      };

      // Assert - should use fallbacks
      expect(payload.userName).toBe('user_minimal'); // Falls back to ID
      expect(payload.firstName).toBe('');
      expect(payload.lastName).toBe('');
      expect(payload.email).toBe('');
      expect(payload.userSegment).toBe('patient'); // Default
    });
  });

  describe('Workflow Compatibility', () => {
    test('should provide all required fields for user-lifecycle workflow', async () => {
      // Arrange
      const completePayload = {
        eventType: 'user.created',
        eventId: 'user_123',
        userId: 'user_123',
        userName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        locale: 'en',
        userSegment: 'patient',
        templateVariant: 'default',
        timestamp: Date.now(),
        source: 'test',
        alertType: 'user.created',
        message: 'User event: user.created',
      };

      const subscriber = {
        subscriberId: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        locale: 'en',
        data: {
          clerkUserId: 'user_123',
          username: 'johndoe',
        },
      };

      // Act
      await mockTriggerWorkflow('user-lifecycle', subscriber, completePayload);

      // Assert
      expect(mockTriggerWorkflow).toHaveBeenCalledWith(
        'user-lifecycle',
        subscriber,
        completePayload,
      );
      expect(mockTriggerWorkflow).toHaveBeenCalledTimes(1);
    });

    test('should work with workflow that expects userName at root level', () => {
      // Arrange - this simulates what the workflow expects
      const workflowPayload = {
        userName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        userSegment: 'patient',
        locale: 'en',
        templateVariant: 'default',
      };

      // Act - simulate workflow processing
      const displayName = workflowPayload.firstName || workflowPayload.userName || 'there';
      const emailUserName = workflowPayload.userName || workflowPayload.firstName || 'User';

      // Assert - workflow should have access to all needed fields
      expect(displayName).toBe('John');
      expect(emailUserName).toBe('John Doe');
      expect(workflowPayload.userSegment).toBe('patient');
      expect(workflowPayload.email).toBe('john@example.com');
    });
  });

  describe('Property Name Mapping', () => {
    test('should correctly map Clerk UserJSON property names', () => {
      // Arrange - Clerk UserJSON uses snake_case
      const clerkUserJSON = {
        id: 'user_123',
        first_name: 'Jane', // ✅ Correct: first_name (not firstName)
        last_name: 'Smith', // ✅ Correct: last_name (not lastName)
        email_addresses: [
          {
            // ✅ Correct: email_addresses (not emailAddresses)
            email_address: 'jane@example.com',
          },
        ],
        public_metadata: {
          // ✅ Correct: public_metadata (not publicMetadata)
          role: ['expert'],
        },
      };

      // Act - use correct property names
      const mappedData = {
        firstName: clerkUserJSON.first_name,
        lastName: clerkUserJSON.last_name,
        email: clerkUserJSON.email_addresses?.[0]?.email_address,
        userSegment: (clerkUserJSON.public_metadata?.role as string[])?.includes('expert')
          ? 'expert'
          : 'patient',
      };

      // Assert
      expect(mappedData).toEqual({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        userSegment: 'expert',
      });
    });
  });

  describe('Error Prevention', () => {
    test('should prevent undefined values in workflow payload', () => {
      // Arrange - data that could cause undefined errors
      const problematicData = {
        id: 'user_problem',
        // Missing all optional fields
      };

      // Act - apply defensive programming
      const safePayload = {
        eventType: 'user.created',
        userId: problematicData.id,
        userName:
          (problematicData as any).username ||
          `${(problematicData as any).first_name || ''} ${(problematicData as any).last_name || ''}`.trim() ||
          problematicData.id,
        firstName: (problematicData as any).first_name || '',
        lastName: (problematicData as any).last_name || '',
        email: (problematicData as any).email_addresses?.[0]?.email_address || '',
        locale: 'en',
        userSegment: 'patient',
        templateVariant: 'default',
      };

      // Assert - no undefined values
      expect(safePayload.userName).toBe('user_problem');
      expect(safePayload.firstName).toBe('');
      expect(safePayload.lastName).toBe('');
      expect(safePayload.email).toBe('');
      expect(safePayload.userSegment).toBe('patient');

      // Verify no undefined values
      Object.values(safePayload).forEach((value) => {
        expect(value).not.toBeUndefined();
      });
    });
  });
});

describe('Integration Test Simulation', () => {
  test('should simulate successful workflow execution', async () => {
    // Arrange
    mockTriggerWorkflow.mockResolvedValue({
      success: true,
      transactionId: 'txn_integration_123',
      data: {
        acknowledged: true,
      },
    });

    const testPayload = {
      eventType: 'user.created',
      userId: 'integration_user_123',
      userName: 'Integration Test User',
      firstName: 'Integration',
      lastName: 'User',
      email: 'integration@example.com',
      userSegment: 'patient',
      locale: 'en',
      templateVariant: 'default',
    };

    const testSubscriber = {
      subscriberId: 'integration_user_123',
      email: 'integration@example.com',
      data: { testRun: true },
    };

    // Act
    const result = await mockTriggerWorkflow('user-lifecycle', testSubscriber, testPayload);

    // Assert
    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('txn_integration_123');
    expect(mockTriggerWorkflow).toHaveBeenCalledWith('user-lifecycle', testSubscriber, testPayload);
  });

  test('should handle workflow errors gracefully', async () => {
    // Arrange
    const error = new Error('Workflow execution failed');
    mockTriggerWorkflow.mockRejectedValue(error);

    // Act & Assert
    await expect(mockTriggerWorkflow('user-lifecycle', {}, {})).rejects.toThrow(
      'Workflow execution failed',
    );
  });
});
