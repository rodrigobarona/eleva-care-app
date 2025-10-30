import type { AuditEventMetadata, AuditEventType, AuditResourceType } from '@/types/audit';

/**
 * Logs an audit event to the audit database.
 * This function handles errors gracefully and logs them for monitoring.
 * Audit failures will NOT prevent the main operation from succeeding,
 * but they will be logged for alerting and investigation.
 *
 * @throws {AuditLoggingError} Only in critical scenarios where audit logging must succeed
 */
export async function logAuditEvent(
  clerkUserId: string,
  action: AuditEventType,
  resourceType: AuditResourceType,
  resourceId: string,
  oldValues: Record<string, unknown> | null,
  newValues: AuditEventMetadata,
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  try {
    // Lazy import to avoid loading auditDb at module level
    const { auditDb } = await import('@/drizzle/auditDb');
    const { auditLogs } = await import('@/drizzle/auditSchema');

    await auditDb.insert(auditLogs).values({
      clerkUserId,
      action,
      resourceType,
      resourceId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      createdAt: new Date(),
    });
  } catch (error) {
    // Log the audit failure for monitoring and alerting
    const auditError = {
      message: 'AUDIT_LOGGING_FAILED',
      error: error instanceof Error ? error.message : String(error),
      auditData: {
        clerkUserId,
        action,
        resourceType,
        resourceId,
        timestamp: new Date().toISOString(),
      },
    };

    // Log to console for immediate visibility
    // Note: Two separate arguments for easier parsing in monitoring tools
    console.error('[AUDIT FAILURE]', JSON.stringify(auditError, null, 2));

    // In production, this should be sent to a monitoring service (e.g., Sentry, BetterStack)
    // Example: Sentry.captureException(error, { extra: auditError });

    // For critical audit events that must succeed, uncomment to re-throw:
    // if (isCriticalAuditEvent(action)) {
    //   throw new AuditLoggingError('Critical audit event failed', { cause: error });
    // }

    // Do not re-throw - let the operation continue
  }
}

/**
 * Determines if an audit event is critical and must succeed.
 * Critical events should fail the entire operation if audit logging fails.
 */
// function isCriticalAuditEvent(action: AuditEventType): boolean {
//   const criticalActions: AuditEventType[] = [
//     'PRACTITIONER_AGREEMENT_ACCEPTED',
//     'SECURITY_ALERT_NOTIFIED',
//   ];
//   return criticalActions.includes(action);
// }

/**
 * Custom error for audit logging failures
 */
// export class AuditLoggingError extends Error {
//   constructor(message: string, options?: ErrorOptions) {
//     super(message, options);
//     this.name = 'AuditLoggingError';
//   }
// }
