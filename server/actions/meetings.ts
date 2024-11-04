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
  console.log("Meeting Creation - Input Data:", {
    startTime: unsafeData.startTime?.toISOString(),
    timezone: unsafeData.timezone,
    rawData: unsafeData,
  });

  // Add region and server info logging
  console.log("Meeting Creation - Server Environment:", {
    region: process.env.VERCEL_REGION ?? "local",
    serverTime: new Date().toISOString(),
    serverTimeLocal: new Date().toLocaleString(),
  });

  // Force UTC handling for dates
  const inputStartTime = new Date(unsafeData.startTime!.toISOString());

  console.log("Meeting Creation - Input Processing:", {
    rawStartTime: unsafeData.startTime?.toISOString(),
    normalizedStartTime: inputStartTime.toISOString(),
    timezone: unsafeData.timezone,
  });

  // Validate input data
  const result = meetingActionSchema.safeParse(unsafeData);
  if (!result.success) {
    console.log("Meeting Creation - Validation Failed:", {
      errors: result.error.format(),
    });
    return { error: true };
  }

  const data = result.data;

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
  const startInTimezone = new Date(
    fromZonedTime(data.startTime, data.timezone).toISOString(),
  );

  console.log("Meeting Creation - Time Conversion:", {
    originalTime: data.startTime.toISOString(),
    convertedTime: startInTimezone.toISOString(),
    timezone: data.timezone,
    region: process.env.VERCEL_REGION ?? "local",
  });

  // Validate if the converted time is within available slots
  const validTimes = await getValidTimesFromSchedule([startInTimezone], event);

  console.log("Meeting Creation - Valid Times Check:", {
    validTimesCount: validTimes.length,
    startInTimezone: startInTimezone.toISOString(),
    firstValidTime: validTimes[0]?.toISOString(),
  });

  if (validTimes.length === 0) {
    console.log("Meeting Creation - No Valid Times Available");
    return { error: true };
  }

  // Create calendar event using the UTC time
  await createCalendarEvent({
    ...data,
    startTime: startInTimezone, // Using UTC time for calendar creation
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
