import { NextResponse } from 'next/server';

import { db } from '@/drizzle/db';
import { RecordTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { decryptRecord } from '@/lib/encryption';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all records for this expert
    const records = await db.query.RecordTable.findMany({
      where: eq(RecordTable.expertId, userId),
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
