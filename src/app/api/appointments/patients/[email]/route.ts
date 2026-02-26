import * as Sentry from '@sentry/nextjs';
import { db } from '@/drizzle/db';
import { MeetingsTable } from '@/drizzle/schema';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const { logger } = Sentry;

const emailParamSchema = z.string().email();

/** WorkOS user IDs typically start with user_ */
function looksLikeWorkosUserId(value: string): boolean {
  return value.startsWith('user_') && value.length > 10;
}

export async function GET(request: Request, props: { params: Promise<{ email: string }> }) {
  const params = await props.params;
  try {
    const { user } = await withAuth();
    const userId = user?.id;
    if (!user || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const identifier = decodeURIComponent(params.email);

    // Support lookup by email OR by guestWorkosUserId
    if (looksLikeWorkosUserId(identifier)) {
      const appointments = await db.query.MeetingsTable.findMany({
        where: and(
          eq(MeetingsTable.workosUserId, userId),
          eq(MeetingsTable.guestWorkosUserId, identifier),
        ),
        orderBy: (meetings) => [meetings.startTime],
      });
      return NextResponse.json({ appointments });
    }

    const emailResult = emailParamSchema.safeParse(identifier);
    if (!emailResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid format: provide a valid email or WorkOS user ID',
          details: emailResult.error.flatten(),
        },
        { status: 400 },
      );
    }
    const email = emailResult.data;
    const appointments = await db.query.MeetingsTable.findMany({
      where: and(eq(MeetingsTable.workosUserId, userId), eq(MeetingsTable.guestEmail, email)),
      orderBy: (meetings) => [meetings.startTime],
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error fetching patient appointments', { error });
    return NextResponse.json({ error: 'Failed to fetch patient appointments' }, { status: 500 });
  }
}
