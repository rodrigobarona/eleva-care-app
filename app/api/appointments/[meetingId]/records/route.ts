import { db } from '@/drizzle/db';
import { RecordTable } from '@/drizzle/schema';
import { decryptRecord, encryptRecord } from '@/lib/encryption';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(request: Request, props: { params: Promise<{ meetingId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, metadata } = await request.json();

    // Verify the meeting belongs to this expert
    const meeting = await db.query.MeetingTable.findFirst({
      where: ({ id, clerkUserId }, { eq, and }) =>
        and(eq(id, params.meetingId), eq(clerkUserId, userId)),
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
        expertId: userId,
        guestEmail: meeting.guestEmail,
        encryptedContent,
        encryptedMetadata: encryptedMetadata || undefined,
      })
      .returning();

    return NextResponse.json({ success: true, recordId: record.id });
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}

export async function GET(request: Request, props: { params: Promise<{ meetingId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the meeting belongs to this expert
    const meeting = await db.query.MeetingTable.findFirst({
      where: ({ id, clerkUserId }, { eq, and }) =>
        and(eq(id, params.meetingId), eq(clerkUserId, userId)),
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

    return NextResponse.json({ records: decryptedRecords });
  } catch (error) {
    console.error('Error fetching records:', error);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ meetingId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recordId, content, metadata } = await request.json();

    // Verify the record belongs to this expert
    const record = await db.query.RecordTable.findFirst({
      where: ({ id, expertId, meetingId }, { eq, and }) =>
        and(eq(id, recordId), eq(expertId, userId), eq(meetingId, params.meetingId)),
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found or unauthorized' }, { status: 404 });
    }

    // Encrypt the updated content and metadata
    const encryptedContent = encryptRecord(content);
    const encryptedMetadata = metadata ? encryptRecord(JSON.stringify(metadata)) : null;

    // Update the record
    const [updatedRecord] = await db
      .update(RecordTable)
      .set({
        encryptedContent,
        encryptedMetadata: encryptedMetadata || undefined,
        lastModifiedAt: new Date(),
        version: record.version + 1,
      })
      .where(eq(RecordTable.id, recordId))
      .returning();

    return NextResponse.json({ success: true, recordId: updatedRecord.id });
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}
