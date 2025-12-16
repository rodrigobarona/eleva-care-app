import { db } from '@/drizzle/db';
import { MeetingsTable } from '@/drizzle/schema';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request, props: { params: Promise<{ email: string }> }) {
  const params = await props.params;
  try {
    const { user } = await withAuth();
    const userId = user?.id;
    if (!user || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = decodeURIComponent(params.email);
    const appointments = await db.query.MeetingsTable.findMany({
      where: and(eq(MeetingsTable.workosUserId, userId), eq(MeetingsTable.guestEmail, email)),
      orderBy: (meetings) => [meetings.startTime],
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch patient appointments' }, { status: 500 });
  }
}
