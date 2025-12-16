import { db } from '@/drizzle/db';
import { OrganizationsTable, RecordsTable } from '@/drizzle/schema-workos';
import { decryptForOrg, encryptForOrg } from '@/lib/integrations/workos/vault';
import { logAuditEvent } from '@/lib/utils/server/audit';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

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
      return NextResponse.json(
        { error: 'Organization not found for encryption' },
        { status: 500 },
      );
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

    // Log audit event
    const headersList = await headers();
    try {
      await logAuditEvent(
        workosUserId,
        'CREATE_MEDICAL_RECORD',
        'medical_record',
        record.id,
        null,
        {
          recordId: record.id,
          meetingId: params.meetingId,
          expertId: workosUserId,
          guestEmail: meeting.guestEmail,
          contentProvided: !!content,
          metadataProvided: !!metadata,
          encryptionMethod: 'vault',
        },
        headersList.get('x-forwarded-for') ?? 'Unknown',
        headersList.get('user-agent') ?? 'Unknown',
      );
    } catch (auditError) {
      console.error('Error logging audit event for CREATE_MEDICAL_RECORD:', auditError);
      // Do not fail the request if audit logging fails
    }

    return NextResponse.json({ success: true, recordId: record.id });
  } catch (error) {
    console.error('Error creating record:', error);

    // Log security-sensitive failures and errors
    const headersList = await headers();
    try {
      const { user } = await withAuth();
      const workosUserId = user?.id;
      const isSecuritySensitive =
        error instanceof Error &&
        (error.message.includes('unauthorized') ||
          error.message.includes('Unauthorized') ||
          error.message.includes('permission') ||
          error.message.includes('access denied') ||
          error.message.includes('forbidden') ||
          error.message.includes('Vault'));

      const auditAction = isSecuritySensitive
        ? 'FAILED_CREATE_MEDICAL_RECORD_UNAUTHORIZED'
        : 'FAILED_CREATE_MEDICAL_RECORD';

      await logAuditEvent(
        workosUserId || 'unknown',
        auditAction,
        'medical_record',
        params.meetingId,
        null,
        {
          meetingId: params.meetingId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          isSecuritySensitive,
          timestamp: new Date().toISOString(),
        },
        headersList.get('x-forwarded-for') ?? 'Unknown',
        headersList.get('user-agent') ?? 'Unknown',
      );
    } catch (auditError) {
      console.error('Error logging audit event for failed record creation:', auditError);
    }

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
      return NextResponse.json(
        { error: 'Organization not found for decryption' },
        { status: 500 },
      );
    }

    // Get all records for this meeting
    const records = await db.query.RecordsTable.findMany({
      where: eq(RecordsTable.meetingId, params.meetingId),
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });

    // Decrypt the records using WorkOS Vault
    const decryptedRecords = await Promise.all(
      records.map(async (record) => {
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
      }),
    );

    // Log audit event
    const headersList = await headers();
    try {
      await logAuditEvent(
        workosUserId,
        'READ_MEDICAL_RECORDS_FOR_MEETING',
        'medical_record',
        params.meetingId,
        null,
        {
          meetingId: params.meetingId,
          expertId: workosUserId,
          recordsFetched: decryptedRecords.length,
          recordIds: decryptedRecords.map((r) => r.id),
        },
        headersList.get('x-forwarded-for') ?? 'Unknown',
        headersList.get('user-agent') ?? 'Unknown',
      );
    } catch (auditError) {
      console.error('Error logging audit event for READ_MEDICAL_RECORDS_FOR_MEETING:', auditError);
    }

    return NextResponse.json({ records: decryptedRecords });
  } catch (error) {
    console.error('Error fetching records:', error);

    // Log security-sensitive failures and errors
    const headersList = await headers();
    try {
      const { user } = await withAuth();
      const workosUserId = user?.id;
      const isSecuritySensitive =
        error instanceof Error &&
        (error.message.includes('unauthorized') ||
          error.message.includes('Unauthorized') ||
          error.message.includes('permission') ||
          error.message.includes('access denied') ||
          error.message.includes('forbidden') ||
          error.message.includes('decrypt') ||
          error.message.includes('Vault'));

      const auditAction = isSecuritySensitive
        ? 'FAILED_READ_MEDICAL_RECORDS_UNAUTHORIZED'
        : 'FAILED_READ_MEDICAL_RECORDS';

      await logAuditEvent(
        workosUserId || 'unknown',
        auditAction,
        'medical_record',
        params.meetingId,
        null,
        {
          meetingId: params.meetingId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          isSecuritySensitive,
          timestamp: new Date().toISOString(),
        },
        headersList.get('x-forwarded-for') ?? 'Unknown',
        headersList.get('user-agent') ?? 'Unknown',
      );
    } catch (auditError) {
      console.error('Error logging audit event for failed records fetch:', auditError);
    }

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
      return NextResponse.json(
        { error: 'Organization not found for encryption' },
        { status: 500 },
      );
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

    // Log audit event
    const headersList = await headers();
    try {
      await logAuditEvent(
        workosUserId,
        'UPDATE_MEDICAL_RECORD',
        'medical_record',
        recordId,
        {
          oldVersion: oldRecord.version,
          contentChanged: true, // With Vault, encrypted content is always different due to unique DEKs
          metadataChanged: !!metadata,
        },
        {
          newVersion: updatedRecord.version,
          recordId: updatedRecord.id,
          meetingId: params.meetingId,
          expertId: workosUserId,
          contentProvided: !!content,
          metadataProvided: !!metadata,
          encryptionMethod: 'vault',
        },
        headersList.get('x-forwarded-for') ?? 'Unknown',
        headersList.get('user-agent') ?? 'Unknown',
      );
    } catch (auditError) {
      console.error('Error logging audit event for UPDATE_MEDICAL_RECORD:', auditError);
    }

    return NextResponse.json({ success: true, recordId: updatedRecord.id });
  } catch (error) {
    console.error('Error updating record:', error);

    // Log security-sensitive failures and errors
    const headersList = await headers();
    try {
      const { user } = await withAuth();
      const workosUserId = user?.id;
      const isSecuritySensitive =
        error instanceof Error &&
        (error.message.includes('unauthorized') ||
          error.message.includes('Unauthorized') ||
          error.message.includes('permission') ||
          error.message.includes('access denied') ||
          error.message.includes('forbidden') ||
          error.message.includes('encrypt') ||
          error.message.includes('decrypt') ||
          error.message.includes('Vault'));

      const auditAction = isSecuritySensitive
        ? 'FAILED_UPDATE_MEDICAL_RECORD_UNAUTHORIZED'
        : 'FAILED_UPDATE_MEDICAL_RECORD';

      await logAuditEvent(
        workosUserId || 'unknown',
        auditAction,
        'medical_record',
        params.meetingId,
        null,
        {
          meetingId: params.meetingId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          isSecuritySensitive,
          timestamp: new Date().toISOString(),
        },
        headersList.get('x-forwarded-for') ?? 'Unknown',
        headersList.get('user-agent') ?? 'Unknown',
      );
    } catch (auditError) {
      console.error('Error logging audit event for failed record update:', auditError);
    }

    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}
