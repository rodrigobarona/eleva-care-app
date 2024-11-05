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
import { formatTimezoneOffset } from "@/lib/formatters";

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>,
) {
  const { success, data } = meetingActionSchema.safeParse(unsafeData);
  if (!success) return { error: true };

  console.log('[PROD] Creating meeting:', {
    startTime: {
      raw: data.startTime,
      iso: data.startTime.toISOString(),
      timezone: data.timezone
    }
  });

  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId, isActive, id }, { eq, and }) =>
      and(eq(isActive, true), eq(clerkUserId, data.clerkUserId), eq(id, data.eventId)),
  });

  if (event == null) return { error: true };

  // Keep startTime in UTC throughout the process
  const startTimeUTC = data.startTime;
  
  console.log('[PROD] Validating time:', {
    utc: startTimeUTC.toISOString(),
    userTimezone: `${data.timezone} (${formatTimezoneOffset(data.timezone)})`
  });

  const validTimes = await getValidTimesFromSchedule([startTimeUTC], event);
  if (validTimes.length === 0) return { error: true };

  await createCalendarEvent({
    ...data,
    startTime: startTimeUTC,
    durationInMinutes: event.durationInMinutes,
    eventName: event.name,
    timezone: data.timezone // Pass timezone to calendar creation
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
