"use server";
import { db } from "@/drizzle/db";
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule";
import { meetingActionSchema } from "@/schema/meetings";
import { logAuditEvent } from "@/lib/logAuditEvent";
import { headers } from "next/headers";
import "use-server";
import type { z } from "zod";
import { createCalendarEvent } from "../googleCalendar";
import { redirect } from "next/navigation";
import { MeetingTable } from "@/drizzle/schema";
import { createClerkClient } from "@clerk/nextjs/server";

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>
) {
  // Step 1: Validate the incoming data against our schema
  const { success, data } = meetingActionSchema.safeParse(unsafeData);
  if (!success) return { error: true };

  // Step 2: Find the associated event and verify it exists and is active
  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId, isActive, id }, { eq, and }) =>
      and(
        eq(isActive, true),
        eq(clerkUserId, data.clerkUserId),
        eq(id, data.eventId)
      ),
  });
  if (event == null) return { error: true };

  // Step 3: Verify the requested time slot is valid according to the schedule
  const startTimeUTC = data.startTime;
  const validTimes = await getValidTimesFromSchedule([startTimeUTC], event);
  if (validTimes.length === 0) return { error: true };

  // Step 4: Calculate the end time based on event duration
  const endTimeUTC = new Date(
    startTimeUTC.getTime() + event.durationInMinutes * 60000
  );

  // Step 6: Create calendar event in Google Calendar first
  const calendarEvent = await createCalendarEvent({
    clerkUserId: data.clerkUserId,
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    startTime: startTimeUTC,
    guestNotes: data.guestNotes,
    durationInMinutes: event.durationInMinutes,
    eventName: event.name,
  });

  // Step 5: Create the meeting record in the database
  await db.insert(MeetingTable).values({
    eventId: data.eventId,
    clerkUserId: data.clerkUserId,
    guestEmail: data.guestEmail,
    guestName: data.guestName,
    guestNotes: data.guestNotes,
    startTime: startTimeUTC,
    endTime: endTimeUTC,
    timezone: data.timezone,
    meetingUrl: calendarEvent.conferenceData?.entryPoints?.[0]?.uri ?? null,
  });

  // Step 6: Parallel operations:
  // - Log audit event for tracking
  await Promise.all([
    logAuditEvent(
      data.clerkUserId,
      "create",
      "meetings",
      data.eventId,
      null,
      {
        ...data,
        endTime: endTimeUTC,
        meetingUrl: calendarEvent.conferenceData?.entryPoints?.[0]?.uri ?? null,
      },
      headers().get("x-forwarded-for") ?? "Unknown",
      headers().get("user-agent") ?? "Unknown"
    ),
  ]);

  // Step 7: Get username and use event slug for the redirect
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const user = await clerk.users.getUser(data.clerkUserId);
  const username = user.username ?? data.clerkUserId;

  redirect(
    `/${username}/${event.slug}/success?startTime=${data.startTime.toISOString()}`
  );
}
