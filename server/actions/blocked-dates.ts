'use server';

import { db } from '@/drizzle/db';
import { BlockedDatesTable, ScheduleTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

interface BlockedDateInput {
  date: Date;
  reason?: string;
  timezone?: string;
}

export async function addBlockedDates(dates: BlockedDateInput[]) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // Get user's timezone from their schedule as fallback
  const schedule = await db.query.ScheduleTable.findFirst({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
  });

  const defaultTimezone = schedule?.timezone || 'UTC';

  const values = dates.map((date) => {
    const timezone = date.timezone || defaultTimezone;
    // Convert the input date to the target timezone first
    const dateInTimezone = toDate(date.date, { timeZone: timezone });
    return {
      clerkUserId: userId,
      date: formatInTimeZone(dateInTimezone, timezone, 'yyyy-MM-dd'),
      timezone,
      reason: date.reason,
    };
  });

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

  return blockedDates.map((blocked) => {
    // Create a date object at midnight in the blocked timezone
    const dateStr = `${blocked.date}T00:00:00`;
    const date = toDate(dateStr, { timeZone: blocked.timezone });

    return {
      id: blocked.id,
      date,
      reason: blocked.reason || undefined,
      timezone: blocked.timezone,
    };
  });
}

// New function to get blocked dates for a specific user (for public booking pages)
export async function getBlockedDatesForUser(clerkUserId: string) {
  const blockedDates = await db.query.BlockedDatesTable.findMany({
    where: (table, { eq }) => eq(table.clerkUserId, clerkUserId),
    orderBy: (table) => [table.date],
  });

  return blockedDates.map((blocked) => {
    // Create a date object at midnight in the blocked timezone
    const dateStr = `${blocked.date}T00:00:00`;
    const date = toDate(dateStr, { timeZone: blocked.timezone });

    return {
      id: blocked.id,
      date,
      reason: blocked.reason || undefined,
      timezone: blocked.timezone,
    };
  });
}
