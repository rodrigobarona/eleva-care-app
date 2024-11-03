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

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>
) {
  console.log("Server received:", {
    startTime: unsafeData.startTime?.toISOString(),
    timezone: unsafeData.timezone,
  });

  const { success, data } = meetingActionSchema.safeParse(unsafeData);

  if (!success) return { error: true };

  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId: userIdCol, isActive, id }, { eq, and }) =>
      and(
        eq(isActive, true),
        eq(userIdCol, data.clerkUserId),
        eq(id, data.eventId)
      ),
  });

  if (event == null) return { error: true };

  // Handle timezone conversions
  let startTime: Date;
  if (data.timezone === 'UTC' || data.timezone === 'GMT' || data.timezone === 'Europe/Lisbon') {
    startTime = new Date(data.startTime);
    // No adjustment needed - keep the UTC time as is
    // 11:00 PM GMT (23:00) will be received as 23:00 UTC
    // which corresponds correctly to 3:00 PM PST
  } else {
    // For other timezones (like PST), keep the existing conversion
    startTime = new Date(data.startTime.getTime() - (new Date().getTimezoneOffset() * 60000));
  }

  console.log("Adjusted time:", {
    original: data.startTime.toISOString(),
    adjusted: startTime.toISOString(),
    timezone: data.timezone,
    originalHour: data.startTime.getUTCHours()
  });

  const validTimes = await getValidTimesFromSchedule([startTime], event);

  console.log("Validation:", {
    requestedTime: startTime.toISOString(),
    validTimesCount: validTimes.length,
    validTimes: validTimes.map((t) => t.toISOString()),
  });

  if (validTimes.length === 0) {
    console.log("No valid times found");
    return { error: true };
  }

  const headersList = headers();

  const ipAddress = headersList.get("x-forwarded-for") ?? "Unknown";
  const userAgent = headersList.get("user-agent") ?? "Unknown";

  await createCalendarEvent({
    ...data,
    startTime: startTime,
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

  redirect(
    `/book/${data.clerkUserId}/${
      data.eventId
    }/success?startTime=${data.startTime.toISOString()}`
  );
}
