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
    startTime: unsafeData.startTime,
    timezone: unsafeData.timezone,
    rawData: unsafeData,
  });

  const { success, data } = meetingActionSchema.safeParse(unsafeData);
  if (!success) {
    console.error("Meeting Creation - Validation Failed:", unsafeData);
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
    console.error("Meeting Creation - Event Not Found");
    return { error: true };
  }

  const startInTimezone = fromZonedTime(data.startTime, data.timezone);
  console.log("Meeting Creation - Time Conversion:", {
    originalTime: data.startTime,
    convertedTime: startInTimezone,
    timezone: data.timezone,
  });

  const validTimes = await getValidTimesFromSchedule([startInTimezone], event);
  console.log("Meeting Creation - Valid Times Check:", {
    validTimesCount: validTimes.length,
    startInTimezone,
    firstValidTime: validTimes[0],
  });

  if (validTimes.length === 0) {
    console.error("Meeting Creation - No Valid Times Available");
    return { error: true };
  }

  const headersList = headers();

  const ipAddress = headersList.get("x-forwarded-for") ?? "Unknown";
  const userAgent = headersList.get("user-agent") ?? "Unknown";

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
    userAgent, // User agent for the audit log
  );

  redirect(
    `/book/${data.clerkUserId}/${
      data.eventId
    }/success?startTime=${data.startTime.toISOString()}`,
  );
}
