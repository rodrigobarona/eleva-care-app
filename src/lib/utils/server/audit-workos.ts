/**
 * Unified Audit Logging System (WorkOS Migration)
 *
 * This replaces the separate audit database approach with a unified schema
 * protected by Row-Level Security (RLS).
 *
 * Key Features:
 * - Automatic context extraction from JWT (no manual params!)
 * - RLS ensures org-scoped access
 * - Append-only audit logs (HIPAA compliant)
 * - Hybrid approach: WorkOS for auth, this DB for PHI
 *
 * @example
 * ```typescript
 * // Old way (separate DB, manual params):
 * await logAuditEvent(
 *   workosUserId, action, resourceType, resourceId,
 *   oldValues, newValues, ipAddress, userAgent
 * );
 *
 * // New way (automatic context):
 * await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', 'rec_123');
 * ```
 */

'use server';

import type { AuditEventAction, AuditResourceType } from '@/drizzle/schema';
import { AuditLogsTable } from '@/drizzle/schema';
import { getOrgScopedDb } from '@/lib/integrations/neon/rls-client';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { desc, eq, gte, lte } from 'drizzle-orm';
import { headers } from 'next/headers';

/**
 * Unified Audit Logging System (WorkOS Migration)
 *
 * This replaces the separate audit database approach with a unified schema
 * protected by Row-Level Security (RLS).
 *
 * Key Features:
 * - Automatic context extraction from JWT (no manual params!)
 * - RLS ensures org-scoped access
 * - Append-only audit logs (HIPAA compliant)
 * - Hybrid approach: WorkOS for auth, this DB for PHI
 *
 * @example
 * ```typescript
 * // Old way (separate DB, manual params):
 * await logAuditEvent(
 *   workosUserId, action, resourceType, resourceId,
 *   oldValues, newValues, ipAddress, userAgent
 * );
 *
 * // New way (automatic context):
 * await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', 'rec_123');
 * ```
 */

/**
 * Unified Audit Logging System (WorkOS Migration)
 *
 * This replaces the separate audit database approach with a unified schema
 * protected by Row-Level Security (RLS).
 *
 * Key Features:
 * - Automatic context extraction from JWT (no manual params!)
 * - RLS ensures org-scoped access
 * - Append-only audit logs (HIPAA compliant)
 * - Hybrid approach: WorkOS for auth, this DB for PHI
 *
 * @example
 * ```typescript
 * // Old way (separate DB, manual params):
 * await logAuditEvent(
 *   workosUserId, action, resourceType, resourceId,
 *   oldValues, newValues, ipAddress, userAgent
 * );
 *
 * // New way (automatic context):
 * await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', 'rec_123');
 * ```
 */

/**
 * Unified Audit Logging System (WorkOS Migration)
 *
 * This replaces the separate audit database approach with a unified schema
 * protected by Row-Level Security (RLS).
 *
 * Key Features:
 * - Automatic context extraction from JWT (no manual params!)
 * - RLS ensures org-scoped access
 * - Append-only audit logs (HIPAA compliant)
 * - Hybrid approach: WorkOS for auth, this DB for PHI
 *
 * @example
 * ```typescript
 * // Old way (separate DB, manual params):
 * await logAuditEvent(
 *   workosUserId, action, resourceType, resourceId,
 *   oldValues, newValues, ipAddress, userAgent
 * );
 *
 * // New way (automatic context):
 * await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', 'rec_123');
 * ```
 */

/**
 * Unified Audit Logging System (WorkOS Migration)
 *
 * This replaces the separate audit database approach with a unified schema
 * protected by Row-Level Security (RLS).
 *
 * Key Features:
 * - Automatic context extraction from JWT (no manual params!)
 * - RLS ensures org-scoped access
 * - Append-only audit logs (HIPAA compliant)
 * - Hybrid approach: WorkOS for auth, this DB for PHI
 *
 * @example
 * ```typescript
 * // Old way (separate DB, manual params):
 * await logAuditEvent(
 *   workosUserId, action, resourceType, resourceId,
 *   oldValues, newValues, ipAddress, userAgent
 * );
 *
 * // New way (automatic context):
 * await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', 'rec_123');
 * ```
 */

/**
 * Unified Audit Logging System (WorkOS Migration)
 *
 * This replaces the separate audit database approach with a unified schema
 * protected by Row-Level Security (RLS).
 *
 * Key Features:
 * - Automatic context extraction from JWT (no manual params!)
 * - RLS ensures org-scoped access
 * - Append-only audit logs (HIPAA compliant)
 * - Hybrid approach: WorkOS for auth, this DB for PHI
 *
 * @example
 * ```typescript
 * // Old way (separate DB, manual params):
 * await logAuditEvent(
 *   workosUserId, action, resourceType, resourceId,
 *   oldValues, newValues, ipAddress, userAgent
 * );
 *
 * // New way (automatic context):
 * await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', 'rec_123');
 * ```
 */

/**
 * Unified Audit Logging System (WorkOS Migration)
 *
 * This replaces the separate audit database approach with a unified schema
 * protected by Row-Level Security (RLS).
 *
 * Key Features:
 * - Automatic context extraction from JWT (no manual params!)
 * - RLS ensures org-scoped access
 * - Append-only audit logs (HIPAA compliant)
 * - Hybrid approach: WorkOS for auth, this DB for PHI
 *
 * @example
 * ```typescript
 * // Old way (separate DB, manual params):
 * await logAuditEvent(
 *   workosUserId, action, resourceType, resourceId,
 *   oldValues, newValues, ipAddress, userAgent
 * );
 *
 * // New way (automatic context):
 * await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', 'rec_123');
 * ```
 */

/**
 * Unified Audit Logging System (WorkOS Migration)
 *
 * This replaces the separate audit database approach with a unified schema
 * protected by Row-Level Security (RLS).
 *
 * Key Features:
 * - Automatic context extraction from JWT (no manual params!)
 * - RLS ensures org-scoped access
 * - Append-only audit logs (HIPAA compliant)
 * - Hybrid approach: WorkOS for auth, this DB for PHI
 *
 * @example
 * ```typescript
 * // Old way (separate DB, manual params):
 * await logAuditEvent(
 *   workosUserId, action, resourceType, resourceId,
 *   oldValues, newValues, ipAddress, userAgent
 * );
 *
 * // New way (automatic context):
 * await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', 'rec_123');
 * ```
 */

/**
 * Get request context (IP address and user agent)
 * Automatically extracts from Next.js headers
 */
async function getRequestContext(): Promise<{
  ipAddress: string;
  userAgent: string;
}> {
  const headersList = await headers();

  return {
    ipAddress:
      headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
      headersList.get('x-real-ip') ||
      'unknown',
    userAgent: headersList.get('user-agent') || 'unknown',
  };
}

/**
 * Log audit event with automatic context
 *
 * This function automatically extracts:
 * - workosUserId from JWT
 * - orgId from session
 * - ipAddress from request headers
 * - userAgent from request headers
 *
 * You only need to provide the event details!
 *
 * @param action - What happened (e.g., 'MEDICAL_RECORD_VIEWED')
 * @param resourceType - What type of resource (e.g., 'medical_record')
 * @param resourceId - ID of the affected resource
 * @param changes - Optional: old and new values for updates
 * @param metadata - Optional: additional context
 *
 * @example
 * ```typescript
 * // Log medical record access
 * await logAuditEvent(
 *   'MEDICAL_RECORD_VIEWED',
 *   'medical_record',
 *   'rec_123'
 * );
 *
 * // Log with change tracking
 * await logAuditEvent(
 *   'APPOINTMENT_UPDATED',
 *   'appointment',
 *   'apt_456',
 *   {
 *     oldValues: { status: 'pending' },
 *     newValues: { status: 'confirmed' }
 *   }
 * );
 *
 * // Log with metadata
 * await logAuditEvent(
 *   'PAYMENT_COMPLETED',
 *   'payment',
 *   'pay_789',
 *   undefined,
 *   { amount: 5000, currency: 'EUR' }
 * );
 * ```
 */
export async function logAuditEvent(
  action: AuditEventAction,
  resourceType: AuditResourceType,
  resourceId: string,
  changes?: {
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
  },
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    // Get session (includes user.id and organizationId)
    const { user, organizationId } = await withAuth({ ensureSignedIn: true });

    // Get request context
    const { ipAddress, userAgent } = await getRequestContext();

    // Get RLS-enabled database
    const db = await getOrgScopedDb();

    // Insert audit log - RLS automatically scopes by org!
    await db.insert(AuditLogsTable).values({
      workosUserId: user.id,
      orgId: organizationId!,
      action,
      resourceType,
      resourceId,
      oldValues: changes?.oldValues || null,
      newValues: changes?.newValues || null,
      ipAddress,
      userAgent,
      metadata: metadata || null,
    });
  } catch (error) {
    // 🚨 CRITICAL: Audit log failures must be captured but not block user actions
    console.error(
      '[AUDIT FAILURE - CRITICAL]',
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          auditData: {
            action,
            resourceType,
            resourceId,
            timestamp: new Date().toISOString(),
          },
        },
        null,
        2,
      ),
    );

    // Alert monitoring service
    // TODO: Add Sentry/monitoring integration
    // Sentry.captureException(error, {
    //   tags: { context: 'audit_failure' },
    //   extra: { action, resourceType, resourceId },
    // });

    // DO NOT throw - never block user actions due to audit failures
  }
}

/**
 * Query audit logs for a specific organization
 *
 * RLS automatically filters by user's org membership, so you can query freely.
 *
 * @param filters - Query filters
 * @returns Array of audit log entries
 *
 * @example
 * ```typescript
 * // Get all audit logs for current org
 * const logs = await getAuditLogs({
 *   startDate: new Date('2025-01-01'),
 *   endDate: new Date('2025-01-31'),
 * });
 *
 * // Filter by action type
 * const medicalRecordLogs = await getAuditLogs({
 *   actions: ['MEDICAL_RECORD_VIEWED', 'MEDICAL_RECORD_UPDATED'],
 * });
 *
 * // Filter by resource
 * const patientLogs = await getAuditLogs({
 *   resourceId: 'patient_123',
 * });
 * ```
 */
export async function getAuditLogs(filters?: {
  startDate?: Date;
  endDate?: Date;
  actions?: AuditEventAction[];
  resourceTypes?: AuditResourceType[];
  resourceId?: string;
  workosUserId?: string;
  limit?: number;
}) {
  await withAuth({ ensureSignedIn: true }); // Verify authentication
  const db = await getOrgScopedDb();

  // Build query with filters
  let query = db.select().from(AuditLogsTable);

  // RLS automatically filters by org - no need to add WHERE clause!

  // Apply additional filters
  if (filters?.startDate) {
    query = query.where(gte(AuditLogsTable.createdAt, filters.startDate)) as typeof query;
  }

  if (filters?.endDate) {
    query = query.where(lte(AuditLogsTable.createdAt, filters.endDate)) as typeof query;
  }

  if (filters?.resourceId) {
    query = query.where(eq(AuditLogsTable.resourceId, filters.resourceId)) as typeof query;
  }

  if (filters?.workosUserId) {
    query = query.where(eq(AuditLogsTable.workosUserId, filters.workosUserId)) as typeof query;
  }

  // Order by most recent first
  query = query.orderBy(desc(AuditLogsTable.createdAt)) as typeof query;

  // Limit results
  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }

  return await query;
}

/**
 * Export audit logs for compliance reporting
 *
 * Creates an export record and returns the audit logs for the specified period.
 * Useful for HIPAA audits, GDPR data requests, and compliance reporting.
 *
 * @param params - Export parameters
 * @returns Export record and audit logs
 *
 * @example
 * ```typescript
 * // Export all logs for a month
 * const { exportRecord, logs } = await exportAuditLogs({
 *   startDate: new Date('2025-01-01'),
 *   endDate: new Date('2025-01-31'),
 *   reason: 'HIPAA audit request',
 * });
 *
 * // Export specific event types
 * const { exportRecord, logs } = await exportAuditLogs({
 *   startDate: new Date('2025-01-01'),
 *   endDate: new Date('2025-01-31'),
 *   actions: ['MEDICAL_RECORD_VIEWED', 'MEDICAL_RECORD_UPDATED'],
 *   reason: 'PHI access audit',
 * });
 * ```
 */
export async function exportAuditLogs(params: {
  startDate: Date;
  endDate: Date;
  actions?: AuditEventAction[];
  resourceTypes?: AuditResourceType[];
  reason?: string;
  format?: 'json' | 'csv';
}) {
  // Fetch audit logs with filters
  const logs = await getAuditLogs({
    startDate: params.startDate,
    endDate: params.endDate,
    actions: params.actions,
    resourceTypes: params.resourceTypes,
  });

  // TODO: Re-implement export record tracking after adding AuditLogExportsTable to schema-workos.ts
  // For now, just return the logs without creating an export record
  return {
    logs,
    format: params.format || 'json',
    reason: params.reason || 'Manual export',
    recordCount: logs.length,
  };
}

/**
 * Get audit logs for a specific resource
 *
 * Useful for showing "Activity" or "History" on a record.
 *
 * @param resourceType - Type of resource
 * @param resourceId - ID of resource
 * @returns Audit logs for that resource
 *
 * @example
 * ```typescript
 * // Show all activity on a medical record
 * const activity = await getResourceAuditTrail('medical_record', 'rec_123');
 *
 * // Show appointment history
 * const history = await getResourceAuditTrail('appointment', 'apt_456');
 * ```
 */
export async function getResourceAuditTrail(resourceType: AuditResourceType, resourceId: string) {
  return await getAuditLogs({
    resourceTypes: [resourceType],
    resourceId,
  });
}

/**
 * Get audit logs for a specific user
 *
 * Useful for user activity reports and security investigations.
 *
 * @param workosUserId - WorkOS user ID
 * @param startDate - Optional start date
 * @param endDate - Optional end date
 * @returns Audit logs for that user
 *
 * @example
 * ```typescript
 * // Get all activity for a user this month
 * const userActivity = await getUserAuditLogs(
 *   'user_123',
 *   new Date('2025-01-01'),
 *   new Date('2025-01-31')
 * );
 * ```
 */
export async function getUserAuditLogs(workosUserId: string, startDate?: Date, endDate?: Date) {
  return await getAuditLogs({
    workosUserId,
    startDate,
    endDate,
  });
}

/**
 * Generate compliance report
 *
 * Aggregates audit data for compliance reporting (HIPAA, GDPR, etc.)
 *
 * @param startDate - Report start date
 * @param endDate - Report end date
 * @returns Compliance report summary
 *
 * @example
 * ```typescript
 * // Generate quarterly compliance report
 * const report = await generateComplianceReport(
 *   new Date('2025-01-01'),
 *   new Date('2025-03-31')
 * );
 *
 * console.log(report.summary);
 * // {
 * //   totalEvents: 1234,
 * //   medicalRecordAccess: 456,
 * //   appointmentEvents: 678,
 * //   paymentEvents: 100,
 * //   securityEvents: 0
 * // }
 * ```
 */
export async function generateComplianceReport(startDate: Date, endDate: Date) {
  const logs = await getAuditLogs({ startDate, endDate });

  // Aggregate by action category
  const summary = {
    totalEvents: logs.length,
    medicalRecordAccess: logs.filter((log) => log.action.includes('MEDICAL_RECORD')).length,
    appointmentEvents: logs.filter((log) => log.action.includes('APPOINTMENT')).length,
    paymentEvents: logs.filter((log) => log.action.includes('PAYMENT')).length,
    securityEvents: logs.filter(
      (log) => log.action.includes('SECURITY') || log.action.includes('UNAUTHORIZED'),
    ).length,
    prescriptionEvents: logs.filter((log) => log.action.includes('PRESCRIPTION')).length,
  };

  // Group by user
  const byUser = logs.reduce(
    (acc, log) => {
      if (!acc[log.workosUserId]) {
        acc[log.workosUserId] = [];
      }
      acc[log.workosUserId].push(log);
      return acc;
    },
    {} as Record<string, typeof logs>,
  );

  // Group by day
  const byDay = logs.reduce(
    (acc, log) => {
      const day = log.createdAt.toISOString().split('T')[0];
      if (!acc[day]) {
        acc[day] = 0;
      }
      acc[day]++;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    summary,
    byUser,
    byDay,
    logs,
  };
}
