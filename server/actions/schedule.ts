/**
 * @fileoverview Server actions for managing expert schedules in the Eleva Care application.
 * This file handles the creation and management of expert availability schedules,
 * including time slots, timezone settings, and audit logging. It provides functionality
 * for saving and updating schedule data with proper validation and error handling.
 */

'use server';

import { headers } from 'next/headers';

import { db } from '@/drizzle/db';
import { ScheduleAvailabilityTable, ScheduleTable } from '@/drizzle/schema';
import { scheduleFormSchema } from '@/schema/schedule';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import 'use-server';
import type { z } from 'zod';

import { logAuditEvent } from '@/lib/logAuditEvent';

/**
 * @fileoverview Server actions for managing expert schedules in the Eleva Care application.
 * This file handles the creation and management of expert availability schedules,
 * including time slots, timezone settings, and audit logging. It provides functionality
 * for saving and updating schedule data with proper validation and error handling.
 */

/**
 * @fileoverview Server actions for managing expert schedules in the Eleva Care application.
 * This file handles the creation and management of expert availability schedules,
 * including time slots, timezone settings, and audit logging. It provides functionality
 * for saving and updating schedule data with proper validation and error handling.
 */

/**
 * @fileoverview Server actions for managing expert schedules in the Eleva Care application.
 * This file handles the creation and management of expert availability schedules,
 * including time slots, timezone settings, and audit logging. It provides functionality
 * for saving and updating schedule data with proper validation and error handling.
 */

/**
 * Saves or updates an expert's schedule and their availability time slots.
 *
 * This function performs several operations in a transactional manner:
 * 1. Validates the incoming schedule data against the schema
 * 2. Retrieves the existing schedule for audit logging
 * 3. Upserts the schedule data (creates new or updates existing)
 * 4. Replaces all availability time slots with new ones
 * 5. Logs the changes for audit purposes
 *
 * @param unsafeData - The schedule data to be validated and saved, including:
 *   - timezone: The expert's timezone
 *   - availabilities: Array of time slots when the expert is available
 *   - Other schedule-related settings
 * @returns Object indicating success or failure of the operation
 *
 * @example
 * const result = await saveSchedule({
 *   timezone: "Europe/London",
 *   availabilities: [
 *     {
 *       dayOfWeek: "monday",
 *       startTime: "09:00",
 *       endTime: "17:00"
 *     },
 *     {
 *       dayOfWeek: "tuesday",
 *       startTime: "10:00",
 *       endTime: "18:00"
 *     }
 *   ]
 * });
 *
 * if (result?.error) {
 *   console.error("Failed to save schedule");
 * }
 */
export async function saveSchedule(unsafeData: z.infer<typeof scheduleFormSchema>) {
  // Get user authentication and request metadata
  const { userId } = auth();
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') ?? 'Unknown';
  const userAgent = headersList.get('user-agent') ?? 'Unknown';

  // Validate the incoming data against the schema
  const { success, data } = scheduleFormSchema.safeParse(unsafeData);
  if (!success || userId == null) {
    return { error: true };
  }

  // Separate availabilities from other schedule data
  const { availabilities, ...scheduleData } = data;

  // Fetch existing schedule for audit logging
  const oldSchedule = await db.query.ScheduleTable.findFirst({
    where: eq(ScheduleTable.clerkUserId, userId),
    with: {
      availabilities: true,
    },
  });

  // Upsert the schedule data (create new or update existing)
  const [{ id: scheduleId }] = await db
    .insert(ScheduleTable)
    .values({ ...scheduleData, clerkUserId: userId })
    .onConflictDoUpdate({
      target: ScheduleTable.clerkUserId,
      set: scheduleData,
    })
    .returning({ id: ScheduleTable.id });

  // Prepare batch operations for availability updates
  const statements: [BatchItem<'pg'>] = [
    // First, delete all existing availabilities
    db
      .delete(ScheduleAvailabilityTable)
      .where(eq(ScheduleAvailabilityTable.scheduleId, scheduleId)),
  ];

  // If new availabilities exist, prepare to insert them
  if (availabilities.length > 0) {
    statements.push(
      db.insert(ScheduleAvailabilityTable).values(
        availabilities.map((availability) => ({
          ...availability,
          scheduleId,
        })),
      ),
    );
  }

  // Execute all database operations in a batch
  await db.batch(statements);

  // Log the schedule update for audit purposes
  await logAuditEvent(
    userId,
    'update',
    'schedules',
    scheduleId,
    oldSchedule ?? null,
    { ...scheduleData, availabilities },
    ipAddress,
    userAgent,
  );
}
