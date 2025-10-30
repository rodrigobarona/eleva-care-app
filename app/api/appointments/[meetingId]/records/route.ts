import { db } from '@/drizzle/db';
import { RecordTable } from '@/drizzle/schema';
import { decryptRecord, encryptRecord } from '@/lib/utils/encryption';
import { logAuditEvent } from '@/lib/utils/server/audit';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request, props: { params: Promise<{ meetingId: string }> }) {
  const params = await props.params;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, metadata } = await request.json();

    // Verify the meeting belongs to this expert
    const meeting = await db.query.MeetingTable.findFirst({
      where: ({ id, clerkUserId: expertUserId }, { eq, and }) =>
        and(eq(id, params.meetingId), eq(expertUserId, clerkUserId)),
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found or unauthorized' }, { status: 404 });
    }

    // Encrypt the content and metadata
    const encryptedContent = encryptRecord(content);
    const encryptedMetadata = metadata ? encryptRecord(JSON.stringify(metadata)) : null;

    // Create the record
    const [record] = await db
      .insert(RecordTable)
      .values({
        meetingId: params.meetingId,
        expertId: clerkUserId,
        guestEmail: meeting.guestEmail,
        encryptedContent,
        encryptedMetadata: encryptedMetadata || undefined,
      })
      .returning();

    // Log audit event
    const headersList = await headers();
    try {
      await logAuditEvent(
        clerkUserId,
        'CREATE_MEDICAL_RECORD',
        'medical_record',
        record.id,
        null,
        {
          recordId: record.id,
          meetingId: params.meetingId,
          expertId: clerkUserId,
          guestEmail: meeting.guestEmail,
          contentProvided: !!content,
          metadataProvided: !!metadata,
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
      const { userId: clerkUserId } = await auth();
      const isSecuritySensitive =
        error instanceof Error &&
        (error.message.includes('unauthorized') ||
          error.message.includes('Unauthorized') ||
          error.message.includes('permission') ||
          error.message.includes('access denied') ||
          error.message.includes('forbidden'));

      const auditAction = isSecuritySensitive
        ? 'FAILED_CREATE_MEDICAL_RECORD_UNAUTHORIZED'
        : 'FAILED_CREATE_MEDICAL_RECORD';

      await logAuditEvent(
        clerkUserId || 'unknown',
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
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the meeting belongs to this expert
    const meeting = await db.query.MeetingTable.findFirst({
      where: ({ id, clerkUserId: expertUserId }, { eq, and }) =>
        and(eq(id, params.meetingId), eq(expertUserId, clerkUserId)),
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found or unauthorized' }, { status: 404 });
    }

    // Get all records for this meeting
    const records = await db.query.RecordTable.findMany({
      where: eq(RecordTable.meetingId, params.meetingId),
      orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });

    // Decrypt the records
    const decryptedRecords = records.map((record) => ({
      ...record,
      content: decryptRecord(record.encryptedContent),
      metadata: record.encryptedMetadata
        ? JSON.parse(decryptRecord(record.encryptedMetadata))
        : null,
    }));

    // Log audit event
    const headersList = await headers();
    try {
      await logAuditEvent(
        clerkUserId,
        'READ_MEDICAL_RECORDS_FOR_MEETING',
        'medical_record', // resourceType could also be 'meeting_records'
        params.meetingId, // Using meetingId as the primary resource identifier for this action
        null,
        {
          meetingId: params.meetingId,
          expertId: clerkUserId,
          recordsFetched: decryptedRecords.length,
          recordIds: decryptedRecords.map((r) => r.id), // Log IDs of records accessed
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
      const { userId: clerkUserId } = await auth();
      const isSecuritySensitive =
        error instanceof Error &&
        (error.message.includes('unauthorized') ||
          error.message.includes('Unauthorized') ||
          error.message.includes('permission') ||
          error.message.includes('access denied') ||
          error.message.includes('forbidden') ||
          error.message.includes('decrypt'));

      const auditAction = isSecuritySensitive
        ? 'FAILED_READ_MEDICAL_RECORDS_UNAUTHORIZED'
        : 'FAILED_READ_MEDICAL_RECORDS';

      await logAuditEvent(
        clerkUserId || 'unknown',
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
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recordId, content, metadata } = await request.json();

    // Verify the record belongs to this expert and retrieve its current state for audit logging
    const oldRecord = await db.query.RecordTable.findFirst({
      where: ({ id, expertId, meetingId }, { eq, and }) =>
        and(eq(id, recordId), eq(expertId, clerkUserId), eq(meetingId, params.meetingId)),
    });

    if (!oldRecord) {
      return NextResponse.json({ error: 'Record not found or unauthorized' }, { status: 404 });
    }

    // Encrypt the updated content and metadata
    const newEncryptedContent = encryptRecord(content);
    const newEncryptedMetadata = metadata ? encryptRecord(JSON.stringify(metadata)) : null;

    // Update the record
    const [updatedRecord] = await db
      .update(RecordTable)
      .set({
        encryptedContent: newEncryptedContent,
        encryptedMetadata: newEncryptedMetadata || undefined,
        lastModifiedAt: new Date(),
        version: oldRecord.version + 1,
      })
      .where(eq(RecordTable.id, recordId))
      .returning();

    // Log audit event
    const headersList = await headers();
    try {
      await logAuditEvent(
        clerkUserId,
        'UPDATE_MEDICAL_RECORD',
        'medical_record',
        recordId,
        {
          oldVersion: oldRecord.version,
          // To avoid logging actual old encrypted content in audit,
          // we indicate if it changed by comparing new encrypted values with old ones.
          // This assumes that if the encrypted string is the same, the content is the same.
          contentChanged: oldRecord.encryptedContent !== newEncryptedContent,
          metadataChanged: oldRecord.encryptedMetadata !== newEncryptedMetadata,
        },
        {
          newVersion: updatedRecord.version,
          recordId: updatedRecord.id,
          meetingId: params.meetingId,
          expertId: clerkUserId,
          contentProvided: !!content, // Indicates if new content was part of the update payload
          metadataProvided: !!metadata, // Indicates if new metadata was part of the update payload
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
      const { userId: clerkUserId } = await auth();
      const isSecuritySensitive =
        error instanceof Error &&
        (error.message.includes('unauthorized') ||
          error.message.includes('Unauthorized') ||
          error.message.includes('permission') ||
          error.message.includes('access denied') ||
          error.message.includes('forbidden') ||
          error.message.includes('encrypt') ||
          error.message.includes('decrypt'));

      const auditAction = isSecuritySensitive
        ? 'FAILED_UPDATE_MEDICAL_RECORD_UNAUTHORIZED'
        : 'FAILED_UPDATE_MEDICAL_RECORD';

      await logAuditEvent(
        clerkUserId || 'unknown',
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
