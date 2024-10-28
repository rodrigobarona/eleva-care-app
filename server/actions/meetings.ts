"use server";
import { db } from "@/drizzle/db";
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule";
import { meetingActionSchema } from "@/schema/meetings";
import { logAuditEvent } from "@/lib/logAuditEvent";
import { headers } from "next/headers";
import "use-server";
import { z } from "zod";
import { createCalendarEvent } from "../googleCalendar";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>
) {
  // Parse the incoming data with schema validation
  const { success, data } = meetingActionSchema.safeParse(unsafeData);

  if (!success) return { error: true }; // Exit if data validation fails

  // Retrieve the relevant event if it is active and belongs to the given user
  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId, isActive, id }, { eq, and }) =>
      and(
        eq(isActive, true),
        eq(clerkUserId, data.clerkUserId),
        eq(id, data.eventId)
      ),
  });

  if (event == null) return { error: true }; // Exit if no valid event is found

  // Convert the start time to the specified timezone
  const startInTimezone = fromZonedTime(data.startTime, data.timezone);

  // Check if the chosen start time is valid based on the schedule
  const validTimes = await getValidTimesFromSchedule([startInTimezone], event);
  if (validTimes.length === 0) return { error: true }; // Exit if no valid times are found

  const headersList = headers();

  const ipAddress = headersList.get("x-forwarded-for") ?? "Unknown";
  const userAgent = headersList.get("user-agent") ?? "Unknown";

  // Create a new calendar event
  await createCalendarEvent({
    ...data,
    startTime: startInTimezone,
    durationInMinutes: event.durationInMinutes,
    eventName: event.name,
  });

  // Log the audit event for meeting creation
  await logAuditEvent(
    data.clerkUserId, // User ID (related to the clerk user)
    "create", // Action type (creating a new meeting)
    "meetings", // Table name for audit logging
    data.eventId, // Event ID (foreign key for the event)
    null, // Previous data (none in this case)
    { ...data }, // Current data to log
    ipAddress, // IP address of the user
    userAgent // User agent for the audit log
  );

  // Redirect to success page with the start time of the meeting
  redirect(
    `/book/${data.clerkUserId}/${
      data.eventId
    }/success?startTime=${data.startTime.toISOString()}`
  );
}
