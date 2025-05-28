import { auditDb } from '@/drizzle/auditDb';
import { auditLogs } from '@/drizzle/auditSchema';
import type { AuditEventMetadata, AuditEventType, AuditResourceType } from '@/types/audit';

export async function logAuditEvent(
  clerkUserId: string,
  action: AuditEventType,
  resourceType: AuditResourceType,
  resourceId: string,
  oldValues: Record<string, unknown> | null,
  newValues: AuditEventMetadata,
  ipAddress: string,
  userAgent: string,
) {
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
}
