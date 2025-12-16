import { db } from '@/drizzle/db';
import { OrganizationsTable, RecordsTable } from '@/drizzle/schema';
import { decryptForOrg } from '@/lib/integrations/workos/vault';
import { logAuditEvent } from '@/lib/utils/server/audit';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { count, eq, inArray } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

/** Maximum records per page to prevent excessive memory/decryption costs */
const MAX_PAGE_SIZE = 100;
/** Default page size if not specified */
const DEFAULT_PAGE_SIZE = 50;

/**
 * Decrypted record shape returned to clients.
 * Failed decryptions are filtered out (not returned with error placeholders).
 */
interface DecryptedRecord {
  id: string;
  orgId: string;
  meetingId: string;
  expertId: string;
  guestEmail: string;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  lastModifiedAt: Date | null;
  version: number;
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

export async function GET(request: NextRequest) {
  try {
    const { user } = await withAuth();
    const workosUserId = user?.id;
    if (!workosUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse pagination params with bounds checking
    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

    // Get total count for pagination metadata (single count query)
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(RecordsTable)
      .where(eq(RecordsTable.expertId, workosUserId));

    // Get paginated records for this expert
    const records = await db.query.RecordsTable.findMany({
      where: eq(RecordsTable.expertId, workosUserId),
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
      limit,
      offset,
    });

    // Partition records: those with orgId (can decrypt) vs those without (legacy/invalid)
    // Records MUST have an orgId for decryption - we don't fall back to arbitrary user org
    // as that could decrypt with wrong keys for multi-org users.
    const recordsWithOrg = records.filter((r) => r.orgId !== null);
    const recordsWithoutOrg = records.filter((r) => r.orgId === null);

    // Log security warning for records missing required orgId
    if (recordsWithoutOrg.length > 0) {
      console.error(
        '[SECURITY] Records missing required orgId - cannot decrypt:',
        JSON.stringify({
          count: recordsWithoutOrg.length,
          recordIds: recordsWithoutOrg.map((r) => r.id),
          expertId: workosUserId,
        }),
      );
    }

    // Batch fetch all org mappings in one query to avoid N+1
    const uniqueOrgIds = [...new Set(recordsWithOrg.map((r) => r.orgId))] as string[];
    const orgIdMap = await getWorkosOrgIdMap(uniqueOrgIds);

    // Decrypt the records using WorkOS Vault
    // Failed decryptions are filtered out (not returned with error placeholders)
    // to avoid information leakage about internal failure modes.
    const decryptionResults = await Promise.all(
      recordsWithOrg.map(async (record) => {
        const workosOrgId = orgIdMap.get(record.orgId!);

        // Organization mapping not found - data integrity issue
        if (!workosOrgId) {
          console.error(
            '[SECURITY] Organization mapping not found for record:',
            JSON.stringify({ recordId: record.id, orgId: record.orgId }),
          );
          return null;
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

          // Return typed decrypted record (omit encrypted fields)
          const decryptedRecord: DecryptedRecord = {
            id: record.id,
            orgId: record.orgId!,
            meetingId: record.meetingId,
            expertId: record.expertId,
            guestEmail: record.guestEmail,
            content,
            metadata,
            createdAt: record.createdAt,
            lastModifiedAt: record.lastModifiedAt,
            version: record.version,
          };

          return decryptedRecord;
        } catch (decryptError) {
          // Log internally but don't expose failure details to client
          console.error(
            '[SECURITY] Failed to decrypt record:',
            JSON.stringify({ recordId: record.id, error: decryptError instanceof Error ? decryptError.message : 'Unknown' }),
          );
          return null;
        }
      }),
    );

    // Filter out failed decryptions (null values)
    const decryptedRecords = decryptionResults.filter((r): r is DecryptedRecord => r !== null);

    // Calculate failure counts for metadata (don't expose which records failed)
    const failedCount = records.length - decryptedRecords.length;

    // Log individual audit events per record for HIPAA/GDPR compliance.
    // Each medical record access must be independently auditable to answer
    // "who accessed record X and when?" without scanning bulk operation metadata.
    try {
      await Promise.all(
        decryptedRecords.map((record) =>
          logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', record.id, undefined, {
            expertId: workosUserId,
            guestEmail: record.guestEmail,
            meetingId: record.meetingId,
            bulkFetch: true, // Indicates this was part of a list operation
          }),
        ),
      );
    } catch (auditError) {
      // Log but don't fail the request - audit is best-effort
      console.error('Error logging audit events for MEDICAL_RECORD_VIEWED:', auditError);
    }

    // Return records with pagination metadata
    // meta.failed indicates some records couldn't be decrypted (client may want to retry or report)
    const hasMore = offset + decryptedRecords.length < totalCount;
    return NextResponse.json({
      records: decryptedRecords,
      meta: {
        total: totalCount,
        returned: decryptedRecords.length,
        failed: failedCount,
        limit,
        offset,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}
