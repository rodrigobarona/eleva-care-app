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
import GoogleCalendarService from "@/server/googleCalendar";
import { addMinutes } from "date-fns";

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>
) {
  // Step 1: Validate the incoming data against our schema
  const { success, data } = meetingActionSchema.safeParse(unsafeData);
  if (!success) return { error: true };

  // Step 2: Check for existing meeting first
  const existingMeeting = await db.query.MeetingTable.findFirst({
    where: (fields, operators) =>
      operators.or(
        data.stripePaymentIntentId
          ? operators.eq(
              fields.stripePaymentIntentId,
              data.stripePaymentIntentId
            )
          : undefined,
        data.stripeSessionId
          ? operators.eq(fields.stripeSessionId, data.stripeSessionId)
          : undefined,
        operators.and(
          operators.eq(fields.eventId, data.eventId),
          operators.eq(fields.startTime, data.startTime),
          operators.eq(fields.guestEmail, data.guestEmail)
        )
      ),
  });

  if (existingMeeting) {
    console.log("Meeting already exists:", {
      meetingId: existingMeeting.id,
      eventId: data.eventId,
      startTime: data.startTime,
      guestEmail: data.guestEmail,
    });
    return { error: false, meeting: existingMeeting };
  }

  // Step 3: Find the associated event and verify it exists and is active
  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId, isActive, id }, { eq, and }) =>
      and(
        eq(isActive, true),
        eq(clerkUserId, data.clerkUserId),
        eq(id, data.eventId)
      ),
  });
  if (event == null) return { error: true };

  // Step 4: Verify the requested time slot is valid according to the schedule
  const startTimeUTC = data.startTime;

  // Get calendar events for the time slot
  const calendarService = GoogleCalendarService.getInstance();
  const calendarEvents = await calendarService.getCalendarEventTimes(
    event.clerkUserId,
    {
      start: startTimeUTC,
      end: addMinutes(startTimeUTC, event.durationInMinutes),
    }
  );

  const validTimes = await getValidTimesFromSchedule(
    [startTimeUTC],
    event,
    calendarEvents
  );
  if (validTimes.length === 0) return { error: true };

  // Step 5: Calculate the end time based on event duration
  const endTimeUTC = new Date(
    startTimeUTC.getTime() + event.durationInMinutes * 60000
  );

  try {
    // Step 6: Create calendar event in Google Calendar
    const calendarEvent = await createCalendarEvent({
      clerkUserId: data.clerkUserId,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      startTime: startTimeUTC,
      guestNotes: data.guestNotes,
      durationInMinutes: event.durationInMinutes,
      eventName: event.name,
    });

    // Step 7: Create the meeting record in the database
    const [meeting] = await db
      .insert(MeetingTable)
      .values({
        eventId: data.eventId,
        clerkUserId: data.clerkUserId,
        guestEmail: data.guestEmail,
        guestName: data.guestName,
        guestNotes: data.guestNotes,
        startTime: startTimeUTC,
        endTime: endTimeUTC,
        timezone: data.timezone,
        meetingUrl: calendarEvent.conferenceData?.entryPoints?.[0]?.uri ?? null,
        stripePaymentIntentId: data.stripePaymentIntentId,
        stripeSessionId: data.stripeSessionId,
        stripePaymentStatus: data.stripePaymentStatus as
          | "pending"
          | "processing"
          | "succeeded"
          | "failed"
          | "refunded",
        stripeAmount: data.stripeAmount,
        stripeApplicationFeeAmount: data.stripeApplicationFeeAmount,
      })
      .returning();

    // Step 8: Log audit event
    await logAuditEvent(
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
    );

    return { error: false, meeting };
  } catch (error) {
    console.error("Error creating meeting:", {
      error: error instanceof Error ? error.message : "Unknown error",
      eventId: data.eventId,
      startTime: data.startTime,
      guestEmail: data.guestEmail,
    });
    return { error: true };
  }
}
