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
  console.log('Server received:', {
    startTime: unsafeData.startTime?.toISOString(),
    timezone: unsafeData.timezone
  });

  const { success, data } = meetingActionSchema.safeParse(unsafeData);

  if (!success) {
    console.log('Validation failed:', meetingActionSchema.safeParse(unsafeData).error);
    return { error: true };
  }

  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId, isActive, id }, { eq, and }) =>
      and(
        eq(isActive, true),
        eq(clerkUserId, data.clerkUserId),
        eq(id, data.eventId)
      ),
  });

  if (event == null) return { error: true };

  // Use the startTime directly without conversion
  const startTime = new Date(data.startTime);

  const validTimes = await getValidTimesFromSchedule([startTime], event);
  
  console.log('Validation check:', {
    requestedTime: startTime.toISOString(),
    validTimesCount: validTimes.length,
    validTimes: validTimes.map(t => t.toISOString())
  });

  if (validTimes.length === 0) {
    console.log('No valid times found');
    return { error: true };
  }

  await createCalendarEvent({
    ...data,
    startTime,
    durationInMinutes: event.durationInMinutes,
    eventName: event.name,
  });

  redirect(
    `/book/${data.clerkUserId}/${data.eventId}/success?startTime=${startTime.toISOString()}`
  );
}
