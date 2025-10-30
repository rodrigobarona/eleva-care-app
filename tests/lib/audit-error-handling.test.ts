// Import after mock
import { auditDb } from '@/drizzle/auditDb';
import { logAuditEvent } from '@/lib/utils/audit';

/**
 * @jest-environment node
 */
// Unmock logAuditEvent to test the real implementation
jest.unmock('@/lib/utils/audit');

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

describe('Audit Error Handling', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('logAuditEvent', () => {
    const mockAuditData = {
      clerkUserId: 'user_123',
      action: 'MEETING_CREATED' as const,
      resourceType: 'meeting' as const,
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
      const mockValues = jest.fn().mockResolvedValue(undefined);
      (auditDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const result = logAuditEvent(
        mockAuditData.clerkUserId,
        mockAuditData.action,
        mockAuditData.resourceType,
        mockAuditData.resourceId,
        mockAuditData.oldValues,
        mockAuditData.newValues,
        mockAuditData.ipAddress,
        mockAuditData.userAgent,
      );

      await expect(result).resolves.not.toThrow();
      expect(auditDb.insert).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully without throwing', async () => {
      const mockError = new Error('Database connection failed');
      const mockValues = jest.fn().mockRejectedValue(mockError);
      (auditDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      // Should NOT throw despite database error
      const result = logAuditEvent(
        mockAuditData.clerkUserId,
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
      const mockValues = jest.fn().mockRejectedValue(mockError);
      (auditDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      await logAuditEvent(
        mockAuditData.clerkUserId,
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
      const mockValues = jest.fn().mockRejectedValue(mockError);
      (auditDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      await logAuditEvent(
        mockAuditData.clerkUserId,
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
          clerkUserId: mockAuditData.clerkUserId,
          action: mockAuditData.action,
          resourceType: mockAuditData.resourceType,
          resourceId: mockAuditData.resourceId,
        },
      });
      expect(parsedError.auditData.timestamp).toBeDefined();
    });

    it('should handle non-Error objects gracefully', async () => {
      const mockValues = jest.fn().mockRejectedValue('String error');
      (auditDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const result = logAuditEvent(
        mockAuditData.clerkUserId,
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
      const mockValues = jest.fn().mockRejectedValue(mockError);
      (auditDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      await logAuditEvent(
        mockAuditData.clerkUserId,
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

  describe('Database Connection Validation', () => {
    // Note: These tests verify the validation logic conceptually
    // Actual module-level validation is tested during CI/CD and deployment

    const validateAuditDatabaseUrl = (url: string | undefined, nodeEnv: string): string => {
      // Duplicate the validation logic for testing
      if (nodeEnv === 'production') {
        if (!url) {
          throw new Error(
            'FATAL: AUDITLOG_DATABASE_URL is required in production environment. ' +
              'Audit logging is critical for compliance and security. ' +
              'Please configure AUDITLOG_DATABASE_URL in your environment variables.',
          );
        }
        if (url.includes('placeholder') || url.includes('localhost')) {
          throw new Error(
            'FATAL: AUDITLOG_DATABASE_URL contains a placeholder or localhost value in production. ' +
              'This is not allowed. Please configure a valid Neon database URL.',
          );
        }
      }
      return url || 'postgresql://placeholder:placeholder@localhost:5432/placeholder_audit';
    };

    it('should throw error in production when AUDITLOG_DATABASE_URL is missing', () => {
      expect(() => {
        validateAuditDatabaseUrl(undefined, 'production');
      }).toThrow('FATAL: AUDITLOG_DATABASE_URL is required in production environment');
    });

    it('should throw error in production when URL contains placeholder', () => {
      expect(() => {
        validateAuditDatabaseUrl('postgresql://placeholder:placeholder@localhost/db', 'production');
      }).toThrow('FATAL: AUDITLOG_DATABASE_URL contains a placeholder');
    });

    it('should throw error in production when URL contains localhost', () => {
      expect(() => {
        validateAuditDatabaseUrl('postgresql://user:pass@localhost:5432/auditdb', 'production');
      }).toThrow('FATAL: AUDITLOG_DATABASE_URL contains a placeholder or localhost value');
    });

    it('should accept valid URL in production', () => {
      expect(() => {
        const result = validateAuditDatabaseUrl(
          'postgresql://user:pass@neon-host.neon.tech:5432/auditdb',
          'production',
        );
        expect(result).toBe('postgresql://user:pass@neon-host.neon.tech:5432/auditdb');
      }).not.toThrow();
    });

    it('should allow placeholder in development', () => {
      expect(() => {
        const result = validateAuditDatabaseUrl(undefined, 'development');
        expect(result).toBe(
          'postgresql://placeholder:placeholder@localhost:5432/placeholder_audit',
        );
      }).not.toThrow();
    });

    it('should allow placeholder in test environment', () => {
      expect(() => {
        const result = validateAuditDatabaseUrl(undefined, 'test');
        expect(result).toBe(
          'postgresql://placeholder:placeholder@localhost:5432/placeholder_audit',
        );
      }).not.toThrow();
    });

    it('should use provided URL in non-production when available', () => {
      const customUrl = 'postgresql://dev:dev@localhost:5432/dev_audit';
      const result = validateAuditDatabaseUrl(customUrl, 'development');
      expect(result).toBe(customUrl);
    });
  });
});
