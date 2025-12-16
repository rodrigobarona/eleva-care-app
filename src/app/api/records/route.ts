import { db } from '@/drizzle/db';
import { OrganizationsTable, RecordsTable, UserOrgMembershipsTable } from '@/drizzle/schema';
import { decryptForOrg } from '@/lib/integrations/workos/vault';
import { logAuditEvent } from '@/lib/utils/server/audit';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * Get WorkOS organization ID for the current user
 *
 * Looks up the user's primary organization and returns the WorkOS org ID.
 *
 * @param workosUserId - The WorkOS user ID
 * @returns WorkOS org ID (format: org_xxx) or null if not found
 */
async function getUserWorkosOrgId(workosUserId: string): Promise<string | null> {
  // Get user's primary organization membership
  const membership = await db.query.UserOrgMembershipsTable.findFirst({
    where: eq(UserOrgMembershipsTable.workosUserId, workosUserId),
    columns: { orgId: true },
  });

  if (!membership?.orgId) return null;

  // Get the WorkOS org ID
  const org = await db.query.OrganizationsTable.findFirst({
    where: eq(OrganizationsTable.id, membership.orgId),
    columns: { workosOrgId: true },
  });

  return org?.workosOrgId || null;
}

/**
 * Get WorkOS organization ID from internal UUID
 *
 * @param internalOrgId - Internal UUID from database
 * @returns WorkOS org ID (format: org_xxx) or null if not found
 */
async function getWorkosOrgId(internalOrgId: string | null): Promise<string | null> {
  if (!internalOrgId) return null;

  const org = await db.query.OrganizationsTable.findFirst({
    where: eq(OrganizationsTable.id, internalOrgId),
    columns: { workosOrgId: true },
  });

  return org?.workosOrgId || null;
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

    // Decrypt the records using WorkOS Vault
    // Each record may have its own orgId, so we decrypt per-record
    const decryptedRecords = await Promise.all(
      records.map(async (record) => {
        // Use record's org if available, otherwise fall back to user's org
        const workosOrgId = record.orgId ? await getWorkosOrgId(record.orgId) : userWorkosOrgId;

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
