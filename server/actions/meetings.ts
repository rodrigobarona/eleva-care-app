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
  console.log("Meeting Creation - Raw Input:", {
    startTime: unsafeData.startTime?.toISOString(),
    startTimeLocal: unsafeData.startTime?.toLocaleTimeString(),
    timezone: unsafeData.timezone,
    region: process.env.VERCEL_REGION
  });

  // Validate and get data
  const result = meetingActionSchema.safeParse(unsafeData);
  if (!result.success) return { error: true };
  const data = result.data;

  // Convert time explicitly
  const userDateTime = new Date(data.startTime);
  const startInTimezone = fromZonedTime(userDateTime, data.timezone);

  console.log("Meeting Creation - Time Processing:", {
    originalTime: userDateTime.toISOString(),
    originalTimeLocal: userDateTime.toLocaleTimeString(),
    convertedTime: startInTimezone.toISOString(),
    convertedTimeLocal: startInTimezone.toLocaleTimeString(),
    timezone: data.timezone,
    region: process.env.VERCEL_REGION
  });

  // Validate times
  const validTimes = await getValidTimesFromSchedule([startInTimezone], event);

  console.log("Meeting Creation - Validation:", {
    validTimesCount: validTimes.length,
    requestedTime: startInTimezone.toISOString(),
    firstValidTime: validTimes[0]?.toISOString(),
    timezone: data.timezone,
    region: process.env.VERCEL_REGION
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
