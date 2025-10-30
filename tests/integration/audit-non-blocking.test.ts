// Import after mock
import { auditDb } from '@/drizzle/auditDb';
import { logAuditEvent } from '@/lib/utils/server/audit';

/**
 * @jest-environment node
 *
 * Integration tests to verify that audit logging failures don't break operations
 */
// Unmock logAuditEvent to test the real implementation
jest.unmock('@/lib/utils/server/audit');

// Mock the audit schema module
jest.mock('@/drizzle/auditSchema', () => ({
  auditLogs: 'audit_logs_table_mock',
}));

// Mock the entire audit database module
jest.mock('@/drizzle/auditDb', () => ({
  auditDb: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('Audit Logging - Non-Blocking Behavior', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Critical Operations Should Complete Despite Audit Failures', () => {
    it('should complete meeting creation even if audit logging fails', async () => {
      // Simulate audit DB failure
      const mockValues = jest.fn().mockRejectedValue(new Error('Audit DB Unavailable'));
      (auditDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      // Simulate meeting creation with audit logging
      const createMeetingWithAudit = async () => {
        // Meeting creation logic (simplified)
        const meeting = {
          id: 'mtg_123',
          expertId: 'exp_456',
          clientId: 'cli_789',
          status: 'scheduled',
        };

        // Try to log audit event
        await logAuditEvent(
          meeting.expertId,
          'MEETING_CREATED',
          'meeting',
          meeting.id,
          null,
          { ...meeting },
          '127.0.0.1',
          'Test Agent',
        );

        // Meeting should be created regardless of audit failure
        return { success: true, meeting };
      };

      const result = await createMeetingWithAudit();

      expect(result.success).toBe(true);
      expect(result.meeting.id).toBe('mtg_123');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AUDIT FAILURE]',
        expect.stringContaining('AUDIT_LOGGING_FAILED'),
      );
    });

    it('should complete profile publication even if audit logging fails', async () => {
      // Simulate audit DB failure
      const mockValues = jest.fn().mockRejectedValue(new Error('Connection timeout'));
      (auditDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      // Simulate profile publication with audit logging
      const publishProfileWithAudit = async () => {
        const profile = {
          id: 'prof_123',
          userId: 'user_456',
          published: true,
        };

        // Try to log audit event
        await logAuditEvent(
          profile.userId,
          'PROFILE_PUBLISHED',
          'profile',
          profile.id,
          { published: false },
          { published: true },
          '127.0.0.1',
          'Test Agent',
        );

        // Profile should be published regardless of audit failure
        return { success: true, profile };
      };

      const result = await publishProfileWithAudit();

      expect(result.success).toBe(true);
      expect(result.profile.published).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AUDIT FAILURE]',
        expect.stringContaining('AUDIT_LOGGING_FAILED'),
      );
    });

    it('should complete event creation even if audit logging fails', async () => {
      const mockValues = jest.fn().mockRejectedValue(new Error('Network error'));
      (auditDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const createEventWithAudit = async () => {
        const event = {
          id: 'evt_123',
          userId: 'user_456',
          name: 'Consultation',
          isActive: true,
        };

        await logAuditEvent(
          event.userId,
          'EVENT_CREATED',
          'event',
          event.id,
          null,
          { ...event },
          '127.0.0.1',
          'Test Agent',
        );

        return { success: true, event };
      };

      const result = await createEventWithAudit();

      expect(result.success).toBe(true);
      expect(result.event.id).toBe('evt_123');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AUDIT FAILURE]',
        expect.stringContaining('AUDIT_LOGGING_FAILED'),
      );
    });

    it('should complete schedule update even if audit logging fails', async () => {
      const mockValues = jest.fn().mockRejectedValue(new Error('Database locked'));
      (auditDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const updateScheduleWithAudit = async () => {
        const schedule = {
          id: 'sch_123',
          userId: 'user_456',
          timezone: 'America/New_York',
        };

        await logAuditEvent(
          schedule.userId,
          'SCHEDULE_UPDATED',
          'schedule',
          schedule.id,
          { timezone: 'UTC' },
          { timezone: 'America/New_York' },
          '127.0.0.1',
          'Test Agent',
        );

        return { success: true, schedule };
      };

      const result = await updateScheduleWithAudit();

      expect(result.success).toBe(true);
      expect(result.schedule.timezone).toBe('America/New_York');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AUDIT FAILURE]',
        expect.stringContaining('AUDIT_LOGGING_FAILED'),
      );
    });
  });

  describe('Multiple Audit Failures Should Not Block Operations', () => {
    it('should handle consecutive audit failures gracefully', async () => {
      const mockValues = jest.fn().mockRejectedValue(new Error('Persistent DB issue'));
      (auditDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const operations = [
        {
          action: 'MEETING_CREATED' as const,
          resourceType: 'meeting' as const,
          resourceId: 'mtg_1',
        },
        {
          action: 'EVENT_CREATED' as const,
          resourceType: 'event' as const,
          resourceId: 'evt_1',
        },
        {
          action: 'PROFILE_PUBLISHED' as const,
          resourceType: 'profile' as const,
          resourceId: 'prof_1',
        },
      ];

      // All operations should complete despite audit failures
      for (const op of operations) {
        await logAuditEvent(
          'user_123',
          op.action,
          op.resourceType,
          op.resourceId,
          null,
          { test: 'data' },
          '127.0.0.1',
          'Test Agent',
        );
      }

      // Should have logged all 3 failures
      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AUDIT FAILURE]',
        expect.stringContaining('AUDIT_LOGGING_FAILED'),
      );
    });
  });

  describe('Error Context Preservation', () => {
    it('should preserve all audit context even when logging fails', async () => {
      const mockValues = jest.fn().mockRejectedValue(new Error('DB Error'));
      (auditDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const testData = {
        clerkUserId: 'user_abc123',
        action: 'MEETING_PAYMENT_FAILED' as const,
        resourceType: 'meeting' as const,
        resourceId: 'mtg_xyz789',
        oldValues: { status: 'scheduled' },
        newValues: {
          status: 'failed',
          paymentIntentId: 'pi_123',
          failureReason: 'card_declined',
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      await logAuditEvent(
        testData.clerkUserId,
        testData.action,
        testData.resourceType,
        testData.resourceId,
        testData.oldValues,
        testData.newValues,
        testData.ipAddress,
        testData.userAgent,
      );

      // Check that error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AUDIT FAILURE]',
        expect.stringContaining('AUDIT_LOGGING_FAILED'),
      );

      const errorLog = consoleErrorSpy.mock.calls[0][1];
      const parsedError = JSON.parse(errorLog);

      expect(parsedError.auditData).toMatchObject({
        clerkUserId: testData.clerkUserId,
        action: testData.action,
        resourceType: testData.resourceType,
        resourceId: testData.resourceId,
      });
    });
  });
});
