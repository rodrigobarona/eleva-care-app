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
import { formatInTimeZone } from "date-fns-tz";
import { parseISO } from "date-fns";

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>,
): Promise<{ error: boolean } | undefined> {
  const { success, data } = meetingActionSchema.safeParse({
    ...unsafeData,
    startTime: new Date(
      formatInTimeZone(
        new Date(unsafeData.startTime),
        "UTC",
        "yyyy-MM-dd'T'HH:mm:ssX",
      ),
    ),
  });

  if (!success) return { error: true };

  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId, isActive, id }, { eq, and }) =>
      and(
        eq(isActive, true),
        eq(clerkUserId, data.clerkUserId),
        eq(id, data.eventId),
      ),
  });

  if (event == null) return { error: true };

  const startInTimezone = parseISO(
    formatInTimeZone(data.startTime, data.timezone, "yyyy-MM-dd'T'HH:mm:ssX"),
  );

  const validTimes = await getValidTimesFromSchedule([startInTimezone], event);
  if (validTimes.length === 0) return { error: true };

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
