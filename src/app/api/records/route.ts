import { db } from '@/drizzle/db';
import { OrganizationsTable, RecordsTable, UserOrgMembershipsTable } from '@/drizzle/schema';
import { decryptForOrg } from '@/lib/integrations/workos/vault';
import { logAuditEvent } from '@/lib/utils/server/audit';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * Get WorkOS organization ID for the current user
 *
 * Uses a single JOIN query for better performance.
 *
 * @param workosUserId - The WorkOS user ID
 * @returns WorkOS org ID (format: org_xxx) or null if not found
 */
async function getUserWorkosOrgId(workosUserId: string): Promise<string | null> {
  const result = await db
    .select({ workosOrgId: OrganizationsTable.workosOrgId })
    .from(UserOrgMembershipsTable)
    .innerJoin(OrganizationsTable, eq(UserOrgMembershipsTable.orgId, OrganizationsTable.id))
    .where(eq(UserOrgMembershipsTable.workosUserId, workosUserId))
    .limit(1);

  return result[0]?.workosOrgId || null;
}

/**
 * Batch fetch WorkOS organization IDs from internal UUIDs
 *
 * @param internalOrgIds - Array of internal UUIDs from database
 * @returns Map of internal org ID to WorkOS org ID
 */
async function getWorkosOrgIdMap(internalOrgIds: string[]): Promise<Map<string, string>> {
  if (internalOrgIds.length === 0) return new Map();

  const orgs = await db
    .select({ id: OrganizationsTable.id, workosOrgId: OrganizationsTable.workosOrgId })
    .from(OrganizationsTable)
    .where(inArray(OrganizationsTable.id, internalOrgIds));

  return new Map(orgs.map((o) => [o.id, o.workosOrgId]));
}

export async function GET() {
  try {
    const { user } = await withAuth();
    const workosUserId = user?.id;
    if (!workosUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all records for this expert
    const records = await db.query.RecordsTable.findMany({
      where: eq(RecordsTable.expertId, workosUserId),
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });

    // Get user's default WorkOS org ID for decryption
    const userWorkosOrgId = await getUserWorkosOrgId(workosUserId);

    // Batch fetch all org mappings in one query to avoid N+1
    const uniqueOrgIds = [...new Set(records.map((r) => r.orgId).filter(Boolean))] as string[];
    const orgIdMap = await getWorkosOrgIdMap(uniqueOrgIds);

    // Decrypt the records using WorkOS Vault
    // Each record may have its own orgId, so we decrypt per-record
    const decryptedRecords = await Promise.all(
      records.map(async (record) => {
        // Use record's org if available, otherwise fall back to user's org
        const workosOrgId = record.orgId ? (orgIdMap.get(record.orgId) ?? null) : userWorkosOrgId;

        if (!workosOrgId) {
          console.error('No organization found for record:', record.id);
          return {
            ...record,
            content: '[Decryption Error: Organization not found]',
            metadata: null,
            decryptionError: true,
          };
        }

        try {
          const content = await decryptForOrg(workosOrgId, record.vaultEncryptedContent, {
            userId: workosUserId,
            dataType: 'medical_record',
            recordId: record.id,
          });

          const metadata = record.vaultEncryptedMetadata
            ? JSON.parse(
                await decryptForOrg(workosOrgId, record.vaultEncryptedMetadata, {
                  userId: workosUserId,
                  dataType: 'medical_record',
                  recordId: record.id,
                }),
              )
            : null;

          return {
            ...record,
            content,
            metadata,
          };
        } catch (decryptError) {
          console.error('Failed to decrypt record:', record.id, decryptError);
          return {
            ...record,
            content: '[Decryption Error]',
            metadata: null,
            decryptionError: true,
          };
        }
      }),
    );

    // Log audit event (new API: automatically gets user context, IP, and user-agent)
    try {
      await logAuditEvent(
        'MEDICAL_RECORD_VIEWED',
        'medical_record',
        workosUserId, // Using expert's workosUserId as the resource identifier for this bulk action
        undefined,
        {
          expertId: workosUserId,
          recordsFetched: decryptedRecords.length,
          recordIds: decryptedRecords.map((r) => r.id),
        },
      );
    } catch (auditError) {
      console.error('Error logging audit event for MEDICAL_RECORD_VIEWED:', auditError);
    }

    return NextResponse.json({ records: decryptedRecords });
  } catch (error) {
    console.error('Error fetching records:', error);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}
