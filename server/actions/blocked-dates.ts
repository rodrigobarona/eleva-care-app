'use server';

import { db } from '@/drizzle/db';
import { BlockedDatesTable, ScheduleTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { formatInTimeZone } from 'date-fns-tz';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

interface BlockedDateInput {
  date: Date;
  reason?: string;
}

export async function addBlockedDates(dates: BlockedDateInput[]) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // Get user's timezone from their schedule
  const schedule = await db.query.ScheduleTable.findFirst({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
  });

  const timezone = schedule?.timezone || 'UTC';

  const values = dates.map((date) => ({
    clerkUserId: userId,
    // Convert the date to YYYY-MM-DD format in the user's timezone
    date: formatInTimeZone(date.date, timezone, 'yyyy-MM-dd'),
    timezone, // Store the timezone
    reason: date.reason,
  }));

  await db.insert(BlockedDatesTable).values(values);
  revalidatePath('/booking/schedule');
}

export async function removeBlockedDate(id: number) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await db
    .delete(BlockedDatesTable)
    .where(and(eq(BlockedDatesTable.id, id), eq(BlockedDatesTable.clerkUserId, userId)));

  revalidatePath('/booking/schedule');
}

export async function getBlockedDates() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const blockedDates = await db.query.BlockedDatesTable.findMany({
    where: (table, { eq }) => eq(table.clerkUserId, userId),
    orderBy: (table) => [table.date],
  });

  return blockedDates.map((blocked) => ({
    id: blocked.id,
    // Use the stored timezone for each blocked date
    date: new Date(formatInTimeZone(blocked.date, blocked.timezone, 'yyyy-MM-dd')),
    reason: blocked.reason || undefined,
    timezone: blocked.timezone,
  }));
}
