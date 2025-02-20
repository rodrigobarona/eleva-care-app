import { db } from '@/drizzle/db';
import { MeetingTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request, props: { params: Promise<{ email: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = decodeURIComponent(params.email);
    const appointments = await db.query.MeetingTable.findMany({
      where: and(eq(MeetingTable.clerkUserId, userId), eq(MeetingTable.guestEmail, email)),
      orderBy: (meetings) => [meetings.startTime],
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Error fetching customer appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch customer appointments' }, { status: 500 });
  }
}
