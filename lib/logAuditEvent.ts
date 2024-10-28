import { auditDb } from "@/drizzle/auditDb";
import { auditLogs } from "@/drizzle/auditSchema";

export async function logAuditEvent(
  clerkUserId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | string,
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
