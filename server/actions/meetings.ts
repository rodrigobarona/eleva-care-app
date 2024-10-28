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
import { toZonedTime } from "date-fns-tz";

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>,
) {
  console.log("Debug: Creating meeting with data:", {
    ...unsafeData,
    startTime: unsafeData.startTime?.toISOString(),
  });

  const { success, data } = meetingActionSchema.safeParse(unsafeData);

  if (!success) {
    console.log("Debug: Schema validation failed");
    return { error: true };
  }

  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId, isActive, id }, { eq, and }) =>
      and(
        eq(isActive, true),
        eq(clerkUserId, data.clerkUserId),
        eq(id, data.eventId),
      ),
  });

  if (event == null) {
    console.log("Debug: Event not found");
    return { error: true };
  }

  // Convert the start time to DB timezone first
  const dbStartTime = toZonedTime(data.startTime, "Europe/Frankfurt");

  // Add validation to ensure we have a valid date
  if (!(dbStartTime instanceof Date) || isNaN(dbStartTime.getTime())) {
    console.log("Debug: Invalid date conversion", {
      originalTime: data.startTime,
      convertedTime: dbStartTime,
    });
    return { error: true };
  }

  console.log("Debug: Time zones", {
    originalTime: data.startTime.toISOString(),
    dbTime: dbStartTime.toISOString(),
    userTimezone: data.timezone,
    dbTimezone: "Europe/Frankfurt",
  });

  // Generate a range of times around the selected time for validation
  const timeToCheck = new Date(dbStartTime);
  console.log("Debug: Checking time validity", {
    timeToCheck: timeToCheck.toISOString(),
    eventDuration: event.durationInMinutes,
  });

  const validTimes = await getValidTimesFromSchedule([timeToCheck], event);

  console.log("Debug: Validation result", {
    validTimesCount: validTimes.length,
    isValid: validTimes.length > 0,
  });

  if (validTimes.length === 0) {
    console.log("Debug: No valid times found");
    return { error: true };
  }

  const headersList = headers();

  const ipAddress = headersList.get("x-forwarded-for") ?? "Unknown";
  const userAgent = headersList.get("user-agent") ?? "Unknown";

  // Create a new calendar event
  await createCalendarEvent({
    ...data,
    startTime: dbStartTime,
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
    userAgent, // User agent for the audit log
  );

  // Redirect to success page with the start time of the meeting
  redirect(
    `/book/${data.clerkUserId}/${
      data.eventId
    }/success?startTime=${data.startTime.toISOString()}`,
  );
}
