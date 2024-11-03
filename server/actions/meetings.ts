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
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

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

  // Convert the startTime to the correct timezone
  const startTime = toZonedTime(data.startTime, data.timezone);

  console.log("Time conversion details:", {
    originalTime: data.startTime.toISOString(),
    originalLocalTime: formatInTimeZone(
      data.startTime,
      data.timezone,
      "yyyy-MM-dd HH:mm:ss zzz"
    ),
    convertedTime: startTime.toISOString(),
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
    `/book/${data.clerkUserId}/${
      data.eventId
    }/success?startTime=${startTime.toISOString()}`
  );
}
