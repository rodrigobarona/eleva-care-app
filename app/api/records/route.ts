import { db } from '@/drizzle/db';
import { RecordTable } from '@/drizzle/schema';
import { logAuditEvent } from '@/lib/utils/audit';
import { decryptRecord } from '@/lib/utils/encryption';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all records for this expert
    const records = await db.query.RecordTable.findMany({
      where: eq(RecordTable.expertId, clerkUserId),
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
        'medical_record', // resourceType could also be 'expert_records_collection'
        clerkUserId, // Using expert's clerkUserId as the resource identifier for this bulk action
        null,
        {
          expertId: clerkUserId,
          recordsFetched: decryptedRecords.length,
          recordIds: decryptedRecords.map((r) => r.id), // Log IDs of all records accessed
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
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}
