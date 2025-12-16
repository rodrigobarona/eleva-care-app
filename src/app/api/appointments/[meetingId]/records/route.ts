import { db } from '@/drizzle/db';
import { OrganizationsTable, RecordsTable } from '@/drizzle/schema';
import { logSecurityError } from '@/lib/constants/security';
import { decryptForOrg, encryptForOrg } from '@/lib/integrations/workos/vault';
import { logAuditEvent } from '@/lib/utils/server/audit';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * Decrypted record shape returned to clients.
 * Failed decryptions are filtered out (not returned with error placeholders).
 */
interface DecryptedRecord {
  id: string;
  orgId: string | null;
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
 * Get WorkOS organization ID for Vault encryption
 *
 * Looks up the WorkOS org ID from the internal UUID to use with Vault API.
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

export async function POST(request: Request, props: { params: Promise<{ meetingId: string }> }) {
  const params = await props.params;
  try {
    const { user } = await withAuth();
    const workosUserId = user?.id;
    if (!workosUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, metadata } = await request.json();

    // Verify the meeting belongs to this expert
    const meeting = await db.query.MeetingsTable.findFirst({
      where: ({ id, workosUserId: expertUserId }, { eq, and }) =>
        and(eq(id, params.meetingId), eq(expertUserId, workosUserId)),
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found or unauthorized' }, { status: 404 });
    }

    // Get WorkOS org ID for Vault encryption
    const workosOrgId = await getWorkosOrgId(meeting.orgId);
    if (!workosOrgId) {
      console.error('No organization found for meeting:', params.meetingId);
      return NextResponse.json({ error: 'Organization not found for encryption' }, { status: 500 });
    }

    // Encrypt the content and metadata using WorkOS Vault
    const vaultEncryptedContent = await encryptForOrg(workosOrgId, content, {
      userId: workosUserId,
      dataType: 'medical_record',
    });

    const vaultEncryptedMetadata = metadata
      ? await encryptForOrg(workosOrgId, JSON.stringify(metadata), {
          userId: workosUserId,
          dataType: 'medical_record',
        })
      : null;

    // Create the record with orgId for RLS
    const [record] = await db
      .insert(RecordsTable)
      .values({
        orgId: meeting.orgId,
        meetingId: params.meetingId,
        expertId: workosUserId,
        guestEmail: meeting.guestEmail,
        vaultEncryptedContent,
        vaultEncryptedMetadata: vaultEncryptedMetadata || undefined,
        encryptionMethod: 'vault',
      })
      .returning();

    // Log audit event (user context automatically extracted)
    try {
      await logAuditEvent('MEDICAL_RECORD_CREATED', 'medical_record', record.id, {
        newValues: {
          recordId: record.id,
          meetingId: params.meetingId,
          expertId: workosUserId,
          guestEmail: meeting.guestEmail,
          contentProvided: !!content,
          metadataProvided: !!metadata,
          encryptionMethod: 'vault',
        },
      });
    } catch (auditError) {
      console.error('Error logging audit event for MEDICAL_RECORD_CREATED:', auditError);
      // Do not fail the request if audit logging fails
    }

    return NextResponse.json({ success: true, recordId: record.id });
  } catch (error) {
    console.error('Error creating record:', error);
    logSecurityError(error, 'MEDICAL_RECORD_CREATED', 'medical_record', params.meetingId);
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}

export async function GET(request: Request, props: { params: Promise<{ meetingId: string }> }) {
  const params = await props.params;
  try {
    const { user } = await withAuth();
    const workosUserId = user?.id;
    if (!workosUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the meeting belongs to this expert
    const meeting = await db.query.MeetingsTable.findFirst({
      where: ({ id, workosUserId: expertUserId }, { eq, and }) =>
        and(eq(id, params.meetingId), eq(expertUserId, workosUserId)),
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found or unauthorized' }, { status: 404 });
    }

    // Get WorkOS org ID for Vault decryption
    const workosOrgId = await getWorkosOrgId(meeting.orgId);
    if (!workosOrgId) {
      console.error('No organization found for meeting:', params.meetingId);
      return NextResponse.json({ error: 'Organization not found for decryption' }, { status: 500 });
    }

    // Get all records for this meeting
    const records = await db.query.RecordsTable.findMany({
      where: eq(RecordsTable.meetingId, params.meetingId),
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });

    // Decrypt the records using WorkOS Vault
    // Failed decryptions are filtered out (not returned with error placeholders)
    // to avoid information leakage about internal failure modes.
    const decryptionResults = await Promise.all(
      records.map(async (record) => {
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
            orgId: record.orgId,
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
            JSON.stringify({
              recordId: record.id,
              meetingId: params.meetingId,
              error: decryptError instanceof Error ? decryptError.message : 'Unknown',
            }),
          );
          return null;
        }
      }),
    );

    // Filter out failed decryptions (null values)
    const decryptedRecords = decryptionResults.filter((r): r is DecryptedRecord => r !== null);
    const failedCount = records.length - decryptedRecords.length;

    // Log audit event (user context automatically extracted)
    try {
      await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', params.meetingId, undefined, {
        meetingId: params.meetingId,
        expertId: workosUserId,
        recordsFetched: decryptedRecords.length,
        recordIds: decryptedRecords.map((r) => r.id),
        // Include failure stats in audit (internal only)
        totalRecords: records.length,
        failedDecryptions: failedCount,
      });
    } catch (auditError) {
      console.error('Error logging audit event for MEDICAL_RECORD_VIEWED:', auditError);
    }

    // Return records with metadata about the response
    return NextResponse.json({
      records: decryptedRecords,
      meta: {
        total: records.length,
        returned: decryptedRecords.length,
        failed: failedCount,
      },
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    logSecurityError(error, 'MEDICAL_RECORD_VIEWED', 'medical_record', params.meetingId);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ meetingId: string }> }) {
  const params = await props.params;
  try {
    const { user } = await withAuth();
    const workosUserId = user?.id;
    if (!workosUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recordId, content, metadata } = await request.json();

    // Verify the record belongs to this expert and retrieve its current state for audit logging
    const oldRecord = await db.query.RecordsTable.findFirst({
      where: ({ id, expertId, meetingId }, { eq, and }) =>
        and(eq(id, recordId), eq(expertId, workosUserId), eq(meetingId, params.meetingId)),
    });

    if (!oldRecord) {
      return NextResponse.json({ error: 'Record not found or unauthorized' }, { status: 404 });
    }

    // Get WorkOS org ID for Vault encryption
    const workosOrgId = await getWorkosOrgId(oldRecord.orgId);
    if (!workosOrgId) {
      console.error('No organization found for record:', recordId);
      return NextResponse.json({ error: 'Organization not found for encryption' }, { status: 500 });
    }

    // Encrypt the updated content and metadata using WorkOS Vault
    const newVaultEncryptedContent = await encryptForOrg(workosOrgId, content, {
      userId: workosUserId,
      dataType: 'medical_record',
      recordId,
    });

    const newVaultEncryptedMetadata = metadata
      ? await encryptForOrg(workosOrgId, JSON.stringify(metadata), {
          userId: workosUserId,
          dataType: 'medical_record',
          recordId,
        })
      : null;

    // Update the record
    const [updatedRecord] = await db
      .update(RecordsTable)
      .set({
        vaultEncryptedContent: newVaultEncryptedContent,
        vaultEncryptedMetadata: newVaultEncryptedMetadata || undefined,
        lastModifiedAt: new Date(),
        version: oldRecord.version + 1,
      })
      .where(eq(RecordsTable.id, recordId))
      .returning();

    // Log audit event (user context automatically extracted)
    try {
      await logAuditEvent('MEDICAL_RECORD_UPDATED', 'medical_record', recordId, {
        oldValues: {
          version: oldRecord.version,
        },
        newValues: {
          version: updatedRecord.version,
          recordId: updatedRecord.id,
          meetingId: params.meetingId,
          expertId: workosUserId,
          contentProvided: !!content,
          metadataProvided: !!metadata,
          encryptionMethod: 'vault',
        },
      });
    } catch (auditError) {
      console.error('Error logging audit event for MEDICAL_RECORD_UPDATED:', auditError);
    }

    return NextResponse.json({ success: true, recordId: updatedRecord.id });
  } catch (error) {
    console.error('Error updating record:', error);
    logSecurityError(error, 'MEDICAL_RECORD_UPDATED', 'medical_record', params.meetingId);
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}
