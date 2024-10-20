import { auditLogs } from "@/drizzle/schema";

/* eslint-disable  @typescript-eslint/no-explicit-any */
export async function logAuditEvent(
  db: any,
  clerkUserId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | string,
  ipAddress: string,
  userAgent: string
) {
  await db.insert(auditLogs).values({
    clerkUserId,
    action,
    resourceType,
    resourceId,
    oldValues,
    newValues,
    ipAddress,
    userAgent,
  });
}
