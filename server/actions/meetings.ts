"use server";
import { DateTime } from "luxon";
import { db } from "@/drizzle/db";
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule";
import { meetingActionSchema } from "@/schema/meetings";
import { logAuditEvent } from "@/lib/logAuditEvent";
import { headers } from "next/headers";
import { z } from "zod";
import { createCalendarEvent } from "../googleCalendar";
import { redirect } from "next/navigation";

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>,
) {
  console.log("Meeting Creation - Input:", {
    startTime: unsafeData.startTime?.toISOString(),
    timezone: unsafeData.timezone,
  });

  // Validate input data
  const { success, data } = meetingActionSchema.safeParse(unsafeData);
  if (!success) return { error: true };

  // Get event details from database
  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId, isActive, id }, { eq, and }) =>
      and(
        eq(isActive, true),
        eq(clerkUserId, data.clerkUserId),
        eq(id, data.eventId),
      ),
  });

  if (event == null) return { error: true };

  // Convert the selected time from user's timezone to UTC
  const startDateTime = DateTime.fromJSDate(data.startTime)
    .setZone(data.timezone)
    .toUTC();

  console.log("Meeting Creation - Time Conversion:", {
    originalTime: data.startTime.toISOString(),
    convertedTime: startDateTime.toISO(),
    timezone: data.timezone,
  });

  // Validate if the converted time is within available slots
  const validTimes = await getValidTimesFromSchedule(
    [startDateTime.toJSDate()],
    event,
  );

  if (validTimes.length === 0) return { error: true };

  // Create calendar event using the UTC time
  await createCalendarEvent({
    ...data,
    startTime: startDateTime.toJSDate(),
    durationInMinutes: event.durationInMinutes,
    eventName: event.name,
  });

  // Log audit event
  await logAuditEvent(
    data.clerkUserId,
    "create",
    "meetings",
    data.eventId,
    null,
    {
      ...data,
      startTime: startDateTime.toISO(),
    },
    headers().get("x-forwarded-for") ?? "Unknown",
    headers().get("user-agent") ?? "Unknown",
  );

  redirect(
    `/book/${data.clerkUserId}/${data.eventId}/success?startTime=${startDateTime.toISO()}`,
  );
}
