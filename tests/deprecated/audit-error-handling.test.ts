import { db } from '@/drizzle/db';
// Import after mocks are set up
import { logAuditEvent } from '@/lib/utils/server/audit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Audit Error Handling Tests
 *
 * Tests for the unified audit logging system (now in main database).
 * The separate auditDb has been removed - audit logs are now stored
 * in the main database via AuditLogsTable.
 */

// Use vi.hoisted for mocks that need to be available in vi.mock factories
const mocks = vi.hoisted(() => ({
  dbInsert: vi.fn(),
  dbInsertValues: vi.fn(),
}));

// Mock the main database (audit logs are now in the main db)
vi.mock('@/drizzle/db', () => ({
  db: {
    insert: mocks.dbInsert.mockReturnValue({
      values: mocks.dbInsertValues,
    }),
  },
}));

// Mock the schema
vi.mock('@/drizzle/schema', () => ({
  AuditLogsTable: { _: 'audit_logs_table_mock' },
}));

describe('Audit Error Handling', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Reset default mock behavior
    mocks.dbInsertValues.mockResolvedValue(undefined);
    mocks.dbInsert.mockReturnValue({ values: mocks.dbInsertValues });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('logAuditEvent', () => {
    const mockAuditData = {
      workosUserId: 'user_123',
      action: 'APPOINTMENT_CREATED' as const,
      resourceType: 'appointment' as const,
      resourceId: 'mtg_456',
      oldValues: null,
      newValues: {
        meetingId: 'mtg_456',
        expertId: 'exp_123',
        clientId: 'cli_456',
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
    };

    it('should log audit event successfully', async () => {
      mocks.dbInsertValues.mockResolvedValue(undefined);

      const result = logAuditEvent(
        mockAuditData.workosUserId,
        mockAuditData.action,
        mockAuditData.resourceType,
        mockAuditData.resourceId,
        mockAuditData.oldValues,
        mockAuditData.newValues,
        mockAuditData.ipAddress,
        mockAuditData.userAgent,
      );

      await expect(result).resolves.not.toThrow();
      expect(db.insert).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully without throwing', async () => {
      const mockError = new Error('Database connection failed');
      mocks.dbInsertValues.mockRejectedValue(mockError);

      // Should NOT throw despite database error
      const result = logAuditEvent(
        mockAuditData.workosUserId,
        mockAuditData.action,
        mockAuditData.resourceType,
        mockAuditData.resourceId,
        mockAuditData.oldValues,
        mockAuditData.newValues,
        mockAuditData.ipAddress,
        mockAuditData.userAgent,
      );

      await expect(result).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AUDIT FAILURE]',
        expect.stringContaining('AUDIT_LOGGING_FAILED'),
      );
    });

    it('should log error with [AUDIT FAILURE] prefix when insert fails', async () => {
      const mockError = new Error('Database connection timeout');
      mocks.dbInsertValues.mockRejectedValue(mockError);

      await logAuditEvent(
        mockAuditData.workosUserId,
        mockAuditData.action,
        mockAuditData.resourceType,
        mockAuditData.resourceId,
        mockAuditData.oldValues,
        mockAuditData.newValues,
        mockAuditData.ipAddress,
        mockAuditData.userAgent,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AUDIT FAILURE]',
        expect.stringContaining('AUDIT_LOGGING_FAILED'),
      );
    });

    it('should include audit context in error logs', async () => {
      const mockError = new Error('Connection timeout');
      mocks.dbInsertValues.mockRejectedValue(mockError);

      await logAuditEvent(
        mockAuditData.workosUserId,
        mockAuditData.action,
        mockAuditData.resourceType,
        mockAuditData.resourceId,
        mockAuditData.oldValues,
        mockAuditData.newValues,
        mockAuditData.ipAddress,
        mockAuditData.userAgent,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AUDIT FAILURE]',
        expect.stringContaining('AUDIT_LOGGING_FAILED'),
      );

      const errorLog = consoleErrorSpy.mock.calls[0][1];
      const parsedError = JSON.parse(errorLog);

      expect(parsedError).toMatchObject({
        message: 'AUDIT_LOGGING_FAILED',
        error: 'Connection timeout',
        auditData: {
          workosUserId: mockAuditData.workosUserId,
          action: mockAuditData.action,
          resourceType: mockAuditData.resourceType,
          resourceId: mockAuditData.resourceId,
        },
      });
      expect(parsedError.auditData.timestamp).toBeDefined();
    });

    it('should handle non-Error objects gracefully', async () => {
      mocks.dbInsertValues.mockRejectedValue('String error');

      const result = logAuditEvent(
        mockAuditData.workosUserId,
        mockAuditData.action,
        mockAuditData.resourceType,
        mockAuditData.resourceId,
        mockAuditData.oldValues,
        mockAuditData.newValues,
        mockAuditData.ipAddress,
        mockAuditData.userAgent,
      );

      await expect(result).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AUDIT FAILURE]',
        expect.stringContaining('String error'),
      );
    });

    it('should preserve timestamp in ISO format', async () => {
      const mockError = new Error('Test error');
      mocks.dbInsertValues.mockRejectedValue(mockError);

      await logAuditEvent(
        mockAuditData.workosUserId,
        mockAuditData.action,
        mockAuditData.resourceType,
        mockAuditData.resourceId,
        mockAuditData.oldValues,
        mockAuditData.newValues,
        mockAuditData.ipAddress,
        mockAuditData.userAgent,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AUDIT FAILURE]',
        expect.stringContaining('AUDIT_LOGGING_FAILED'),
      );

      const errorLog = consoleErrorSpy.mock.calls[0][1];
      const parsedError = JSON.parse(errorLog);

      expect(parsedError.auditData.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });

  describe('Unified Audit Database Architecture', () => {
    // Note: With the unified schema, audit logs are now in the main database
    // using the AuditLogsTable from schema-workos.ts
    // There is no separate AUDITLOG_DATABASE_URL anymore

    it('should use the main database for audit logging', async () => {
      mocks.dbInsertValues.mockResolvedValue(undefined);

      await logAuditEvent(
        'user_123',
        'PROFILE_UPDATED',
        'profile',
        'profile_456',
        { name: 'Old Name' },
        { name: 'New Name' },
        '127.0.0.1',
        'Test Agent',
      );

      // Verify db.insert was called (main database)
      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle audit logging for various action types', async () => {
      mocks.dbInsertValues.mockResolvedValue(undefined);

      const auditActions = [
        { action: 'APPOINTMENT_CREATED', resourceType: 'appointment' },
        { action: 'PAYMENT_COMPLETED', resourceType: 'payment' },
        { action: 'PROFILE_UPDATED', resourceType: 'profile' },
        { action: 'MEDICAL_RECORD_VIEWED', resourceType: 'medical_record' },
      ] as const;

      for (const { action, resourceType } of auditActions) {
        await logAuditEvent(
          'user_123',
          action,
          resourceType,
          'resource_id_123',
          null,
          { data: 'test' },
          '127.0.0.1',
          'Test Agent',
        );
      }

      expect(db.insert).toHaveBeenCalledTimes(auditActions.length);
    });
  });
});
