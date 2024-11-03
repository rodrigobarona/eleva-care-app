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

  // Convert the input time to UTC, preserving the intended local time
  startTime = new Date(data.startTime);

  // Log the original date details for debugging
  console.log("Original date details:", {
    localISOString: startTime.toISOString(),
    localHours: startTime.getHours(),
    utcHours: startTime.getUTCHours(),
    timezone: data.timezone,
    timezoneOffset: startTime.getTimezoneOffset(),
  });

  // No need for special timezone handling - the Date object already handles
  // the conversion to UTC when created from an ISO string
  // We just need to ensure the date we're passing represents the correct
  // local time in the user's timezone

  console.log("Final time:", {
    utc: startTime.toISOString(),
    localHours: startTime.getHours(),
    utcHours: startTime.getUTCHours(),
    timezone: data.timezone,
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
