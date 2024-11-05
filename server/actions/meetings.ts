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
  unsafeData: z.infer<typeof meetingActionSchema>,
) {
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

  // Remove the timezone conversion since data.startTime is already in UTC
  const startTime = data.startTime;

  // Validate if the time is within available slots
  const validTimes = await getValidTimesFromSchedule([startTime], event);
  if (validTimes.length === 0) return { error: true };

  // Create calendar event using UTC time directly
  await createCalendarEvent({
    ...data,
    startTime, // Using UTC time directly
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
    headers().get("x-forwarded-for") ?? "Unknown", // IP address of the user
    headers().get("user-agent") ?? "Unknown", // User agent for the audit log
  );

  redirect(
    `/book/${data.clerkUserId}/${
      data.eventId
    }/success?startTime=${data.startTime.toISOString()}`,
  );
}
