"use server";
import { db } from "@/drizzle/db";
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule";
import { meetingActionSchema } from "@/schema/meetings";
import "use-server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/logAuditEvent";
import { headers } from "next/headers";
import { createCalendarEvent } from "../googleCalendar";
import { redirect } from "next/navigation";
import { toZonedTime } from "date-fns-tz";

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>
) {
  console.log('Server received:', {
    startTime: unsafeData.startTime?.toISOString(),
    timezone: unsafeData.timezone
  });

  const { success, data } = meetingActionSchema.safeParse(unsafeData);

  if (!success) return { error: true };

  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId, isActive, id }, { eq, and }) =>
      and(
        eq(isActive, true),
        eq(clerkUserId, data.clerkUserId),
        eq(id, data.eventId)
      ),
  });

  if (event == null) return { error: true };

  // Convert the time back to the original timezone for validation
  const startTimeInOriginalTZ = toZonedTime(data.startTime, data.timezone);

  console.log('Time validation:', {
    receivedTime: data.startTime.toISOString(),
    startTimeInTZ: startTimeInOriginalTZ.toISOString(),
    timezone: data.timezone,
    validationTime: new Date().toISOString()
  });

  // Get valid times in the selected timezone
  const validTimesInTZ = await getValidTimesFromSchedule(
    [startTimeInOriginalTZ], 
    event,
    data.timezone // Pass timezone to validation function
  );

  console.log('Valid times:', {
    requestedTime: startTimeInOriginalTZ.toISOString(),
    validTimesCount: validTimesInTZ.length,
    validTimes: validTimesInTZ.map(t => ({
      iso: t.toISOString(),
      local: t.toLocaleString('en-US', { timeZone: data.timezone })
    }))
  });

  if (validTimesInTZ.length === 0) {
    console.log('No valid times found in timezone');
    return { error: true };
  }

  // Use the validated time for the calendar event
  const startTime = validTimesInTZ[0];

  const headersList = headers();
  const ipAddress = headersList.get("x-forwarded-for") ?? "Unknown";
  const userAgent = headersList.get("user-agent") ?? "Unknown";

  await createCalendarEvent({
    ...data,
    startTime,
    durationInMinutes: event.durationInMinutes,
    eventName: event.name,
  });

  // Log the audit event
  await logAuditEvent(
    data.clerkUserId,
    "create",
    "meetings",
    data.eventId,
    null,
    { ...data },
    ipAddress,
    userAgent
  );

  redirect(
    `/book/${data.clerkUserId}/${data.eventId}/success?startTime=${startTime.toISOString()}`
  );
}
