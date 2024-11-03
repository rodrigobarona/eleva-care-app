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

  // Convert the time to UTC while preserving the intended time in the selected timezone
  const startTime = new Date(
    formatInTimeZone(
      data.startTime,
      data.timezone,
      "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
    )
  );

  console.log('Processed time:', {
    original: data.startTime.toISOString(),
    converted: startTime.toISOString(),
    timezone: data.timezone
  });

  const validTimes = await getValidTimesFromSchedule([startTime], event);
  if (validTimes.length === 0) {
    console.log('No valid times found');
    return { error: true };
  }

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
