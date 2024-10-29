"use server";

/**
 * Schedule Management Module
 * Handles all schedule-related operations including:
 * - Creating/updating user schedules
 * - Managing availability slots
 * - Audit logging for schedule changes
 */

import { db } from "@/drizzle/db";
import { ScheduleAvailabilityTable, ScheduleTable } from "@/drizzle/schema";
import { scheduleFormSchema } from "@/schema/schedule";
import { logAuditEvent } from "@/lib/logAuditEvent";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";
import "use-server";
import { z } from "zod";

/**
 * Saves or updates a user's schedule and availability
 * Performs the following operations:
 * 1. Validates incoming schedule data
 * 2. Updates base schedule information
 * 3. Replaces all availability slots
 * 4. Logs changes for audit purposes
 * 
 * @param unsafeData - Raw schedule data requiring validation
 */
export async function saveSchedule(
  unsafeData: z.infer<typeof scheduleFormSchema>,
) {
  const { userId } = auth();
  const headersList = headers();

  const ipAddress = headersList.get("x-forwarded-for") ?? "Unknown";
  const userAgent = headersList.get("user-agent") ?? "Unknown";
  const { success, data } = scheduleFormSchema.safeParse(unsafeData);

  if (!success || userId == null) {
    return { error: true };
  }

  const { availabilities, ...scheduleData } = data;

  // Fetch the existing schedule and its availabilities before updating
  const oldSchedule = await db.query.ScheduleTable.findFirst({
    where: eq(ScheduleTable.clerkUserId, userId),
    with: {
      availabilities: true,
    },
  });

  const [{ id: scheduleId }] = await db
    .insert(ScheduleTable)
    .values({ ...scheduleData, clerkUserId: userId })
    .onConflictDoUpdate({
      target: ScheduleTable.clerkUserId,
      set: scheduleData,
    })
    .returning({ id: ScheduleTable.id });

  const statements: [BatchItem<"pg">] = [
    db
      .delete(ScheduleAvailabilityTable)
      .where(eq(ScheduleAvailabilityTable.scheduleId, scheduleId)),
  ];

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

  await db.batch(statements);

  // Log audit event for schedule update
  await logAuditEvent(
    userId,
    "update",
    "schedules",
    scheduleId,
    oldSchedule ?? null, // Pass the old schedule data
    { ...scheduleData, availabilities }, // New schedule data
    ipAddress,
    userAgent,
  );
}
