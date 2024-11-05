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
import { MeetingTable } from "@/drizzle/schema";

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>,
) {
  const { success, data } = meetingActionSchema.safeParse(unsafeData);
  if (!success) return { error: true };

  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId, isActive, id }, { eq, and }) =>
      and(eq(isActive, true), eq(clerkUserId, data.clerkUserId), eq(id, data.eventId)),
  });

  if (event == null) return { error: true };

  const startTimeUTC = data.startTime;
  const validTimes = await getValidTimesFromSchedule([startTimeUTC], event);
  if (validTimes.length === 0) return { error: true };

  const endTimeUTC = new Date(startTimeUTC.getTime() + event.durationInMinutes * 60000);

  const newMeeting = await db.insert(MeetingTable).values({
    eventId: data.eventId,
    clerkUserId: data.clerkUserId,
    guestEmail: data.guestEmail,
    guestName: data.guestName,
    durationInMinutes: event.durationInMinutes,
    eventName: event.name,
    guestNotes: data.guestNotes,
    startTime: startTimeUTC,
    endTime: endTimeUTC,
    timezone: data.timezone,
  }).returning();

  await Promise.all([
    createCalendarEvent({
      clerkUserId: data.clerkUserId,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      startTime: startTimeUTC,
      guestNotes: data.guestNotes,
      durationInMinutes: event.durationInMinutes,
      eventName: event.name,
    }),
    logAuditEvent(
      data.clerkUserId,
      "create",
      "meetings",
      data.eventId,
      null,
      { ...data },
      headers().get("x-forwarded-for") ?? "Unknown",
      headers().get("user-agent") ?? "Unknown",
    )
  ]);

  redirect(`/book/${data.clerkUserId}/${data.eventId}/success?startTime=${data.startTime.toISOString()}`);
}
