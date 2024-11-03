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
import {
  utcToZonedTime,
  zonedTimeToUtc as convertToUtc,
  format,
} from "date-fns-tz";
import { parseISO } from "date-fns";

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

  // Parse the date and handle the timezone conversion
  const originalDate = parseISO(data.startTime.toISOString());

  // Convert to the target timezone first
  const zonedDate = utcToZonedTime(originalDate, data.timezone);

  // Then convert back to UTC for storage
  const startTime = convertToUtc(zonedDate, data.timezone);

  // Log the conversion details
  console.log("Time conversion details:", {
    originalTime: originalDate.toISOString(),
    originalTimezone: data.timezone,
    convertedUtc: startTime.toISOString(),
    inOriginalTimezone: format(zonedDate, "yyyy-MM-dd HH:mm:ss zzz", {
      timeZone: data.timezone,
    }),
    inPST: format(
      utcToZonedTime(startTime, "America/Los_Angeles"),
      "yyyy-MM-dd HH:mm:ss zzz",
      { timeZone: "America/Los_Angeles" }
    ),
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
