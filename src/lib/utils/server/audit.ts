/**
 * Audit Logging Compatibility Layer
 *
 * This file provides backward compatibility for the old audit logging API.
 * It wraps the new unified audit-workos.ts implementation.
 *
 * DEPRECATED: Use `logAuditEvent` from '@/lib/utils/server/audit-workos' instead.
 * This wrapper is provided for backward compatibility during migration.
 *
 * Migration Guide:
 * ================
 *
 * Old way (this file):
 * ```typescript
 * import { logAuditEvent } from '@/lib/utils/server/audit';
 * await logAuditEvent(
 *   workosUserId,
 *   'PROFILE_UPDATED',
 *   'profile',
 *   profileId,
 *   oldValues,
 *   newValues,
 *   ipAddress,
 *   userAgent
 * );
 * ```
 *
 * New way (audit-workos.ts):
 * ```typescript
 * import { logAuditEvent } from '@/lib/utils/server/audit-workos';
 * await logAuditEvent(
 *   'PROFILE_UPDATED',
 *   'profile',
 *   profileId,
 *   { oldValues, newValues }
 * );
 * // User context (workosUserId, ipAddress, userAgent) is extracted automatically!
 * ```
 */
import { db } from '@/drizzle/db';
import { AuditLogsTable } from '@/drizzle/schema';
import type { AuditEventType, AuditResourceType } from '@/types/audit';

/**
 * Logs an audit event to the unified audit database.
 *
 * @deprecated Use `logAuditEvent` from '@/lib/utils/server/audit-workos' instead.
 * This function is provided for backward compatibility.
 *
 * Note: This function uses the main database connection directly
 * (not the RLS-enabled connection) for compatibility with existing code
 * that doesn't have org context.
 */
export async function logAuditEvent(
  workosUserId: string,
  action: AuditEventType,
  resourceType: AuditResourceType,
  resourceId: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  try {
    // Use the unified schema in the main database
    // Note: orgId is null for backward compatibility
    // (old audit calls don't have org context)
    await db.insert(AuditLogsTable).values({
      workosUserId,
      orgId: null, // Legacy calls don't have org context
      action: action as typeof AuditLogsTable.$inferInsert.action,
      resourceType: resourceType as typeof AuditLogsTable.$inferInsert.resourceType,
      resourceId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      metadata: null,
    });
  } catch (error) {
    // Log the audit failure for monitoring and alerting
    const auditError = {
      message: 'AUDIT_LOGGING_FAILED',
      error: error instanceof Error ? error.message : String(error),
      auditData: {
        workosUserId,
        action,
        resourceType,
        resourceId,
        timestamp: new Date().toISOString(),
      },
    };

    // Log to console for immediate visibility
    console.error('[AUDIT FAILURE]', JSON.stringify(auditError, null, 2));

    // Do not re-throw - let the operation continue
    // Audit failures should never block user operations
  }
}
