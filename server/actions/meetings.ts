'use server';

import { db } from '@/drizzle/db';
import { MeetingTable } from '@/drizzle/schema';
import { getValidTimesFromSchedule } from '@/lib/getValidTimesFromSchedule';
import { logAuditEvent } from '@/lib/logAuditEvent';
import { meetingActionSchema } from '@/schema/meetings';
import GoogleCalendarService, { createCalendarEvent } from '@/server/googleCalendar';
import { addMinutes } from 'date-fns';
import { headers } from 'next/headers';
import 'use-server';
import type { z } from 'zod';

/**
 * @fileoverview Server actions for managing meetings in the Eleva Care application.
 * This file handles the creation and management of meetings between experts and guests,
 * including validation, scheduling, payment processing, and Google Calendar integration.
 
 * Creates a new meeting between an expert and a guest.
 *
 * This function performs several validation and creation steps:
 * 1. Validates the incoming data against the meeting schema
 * 2. Checks for duplicate bookings from the same user
 * 3. Verifies the time slot is not already taken
 * 4. Validates the event exists and is active
 * 5. Verifies the time slot is valid according to the expert's schedule
 * 6. Creates a Google Calendar event
 * 7. Creates the meeting record in the database
 * 8. Logs the audit event
 *
 * @param unsafeData - The meeting data to be validated and processed
 * @returns An object containing:
 *   - error: boolean indicating if an error occurred
 *   - code?: error code if applicable
 *   - message?: error message if applicable
 *   - meeting?: the created meeting object if successful
 *
 * @example
 * const meetingData = {
 *   eventId: "event-123",
 *   clerkUserId: "user-123",
 *   guestEmail: "guest@example.com",
 *   guestName: "John Doe",
 *   startTime: new Date(),
 *   timezone: "America/New_York",
 *   stripePaymentIntentId: "pi_123",
 *   stripePaymentStatus: "succeeded",
 *   stripeAmount: 5000
 * };
 *
 * const result = await createMeeting(meetingData);
 * if (result.error) {
 *   console.error("Meeting creation failed:", result.code);
 * } else {
 *   console.log("Meeting created:", result.meeting);
 * }
 *
 * @throws Will not throw errors directly, but returns error information in the result object
 */
export async function createMeeting(unsafeData: z.infer<typeof meetingActionSchema>) {
  // Step 1: Validate the incoming data against our schema
  const { success, data } = meetingActionSchema.safeParse(unsafeData);
  if (!success) return { error: true, code: 'VALIDATION_ERROR' };

  try {
    // Step 2: Check for duplicate booking from the same user first
    const existingUserMeeting = await db.query.MeetingTable.findFirst({
      where: (fields, operators) =>
        operators.or(
          data.stripePaymentIntentId
            ? operators.eq(fields.stripePaymentIntentId, data.stripePaymentIntentId)
            : undefined,
          data.stripeSessionId
            ? operators.eq(fields.stripeSessionId, data.stripeSessionId)
            : undefined,
          operators.and(
            operators.eq(fields.eventId, data.eventId),
            operators.eq(fields.startTime, data.startTime),
            operators.eq(fields.guestEmail, data.guestEmail),
          ),
        ),
    });

    if (existingUserMeeting) {
      console.log('Duplicate booking from same user:', {
        meetingId: existingUserMeeting.id,
        eventId: data.eventId,
        startTime: data.startTime,
        guestEmail: data.guestEmail,
      });
      return { error: false, meeting: existingUserMeeting };
    }

    // Step 3: Check if time slot is already taken by a different user
    const conflictingMeeting = await db.query.MeetingTable.findFirst({
      where: (fields, operators) =>
        operators.and(
          operators.eq(fields.eventId, data.eventId),
          operators.eq(fields.startTime, data.startTime),
          operators.ne(fields.guestEmail, data.guestEmail),
        ),
    });

    if (conflictingMeeting) {
      console.error('Time slot already taken by another user:', {
        eventId: data.eventId,
        startTime: data.startTime,
        requestingUser: data.guestEmail,
        existingBooking: {
          id: conflictingMeeting.id,
          email: conflictingMeeting.guestEmail,
        },
      });
      return {
        error: true,
        code: 'SLOT_ALREADY_BOOKED',
        message:
          'This time slot has just been booked by another user. Please choose a different time.',
      };
    }

    // Step 4: Find the associated event and verify it exists and is active
    const event = await db.query.EventTable.findFirst({
      where: ({ clerkUserId, isActive, id }, { eq, and }) =>
        and(eq(isActive, true), eq(clerkUserId, data.clerkUserId), eq(id, data.eventId)),
    });
    if (event == null) return { error: true, code: 'EVENT_NOT_FOUND' };

    // Step 5: Verify the requested time slot is valid according to the schedule
    const startTimeUTC = data.startTime;

    // Get calendar events for the time slot
    const calendarService = GoogleCalendarService.getInstance();
    const calendarEvents = await calendarService.getCalendarEventTimes(event.clerkUserId, {
      start: startTimeUTC,
      end: addMinutes(startTimeUTC, event.durationInMinutes),
    });

    const validTimes = await getValidTimesFromSchedule([startTimeUTC], event, calendarEvents);
    if (validTimes.length === 0) return { error: true, code: 'INVALID_TIME_SLOT' };

    // Step 6: Calculate the end time based on event duration
    const endTimeUTC = new Date(startTimeUTC.getTime() + event.durationInMinutes * 60000);

    try {
      // Step 7: Create calendar event in Google Calendar
      const calendarEvent = await createCalendarEvent({
        clerkUserId: data.clerkUserId,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        startTime: startTimeUTC,
        guestNotes: data.guestNotes,
        durationInMinutes: event.durationInMinutes,
        eventName: event.name,
        timezone: data.timezone,
        locale: data.locale || 'en',
      });

      // Step 8: Create the meeting record in the database
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
            | 'pending'
            | 'processing'
            | 'succeeded'
            | 'failed'
            | 'refunded',
          stripeAmount: data.stripeAmount,
          stripeApplicationFeeAmount: data.stripeApplicationFeeAmount,
        })
        .returning();

      // Step 9: Log audit event
      await logAuditEvent(
        data.clerkUserId,
        'create',
        'meetings',
        data.eventId,
        null,
        {
          ...data,
          endTime: endTimeUTC,
          meetingUrl: calendarEvent.conferenceData?.entryPoints?.[0]?.uri ?? null,
        },
        (await headers()).get('x-forwarded-for') ?? 'Unknown',
        (await headers()).get('user-agent') ?? 'Unknown',
      );

      return { error: false, meeting };
    } catch (error) {
      console.error('Error creating meeting:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId: data.eventId,
        startTime: data.startTime,
        guestEmail: data.guestEmail,
      });
      return { error: true, code: 'CREATION_ERROR' };
    }
  } catch (error) {
    console.error('Unexpected error in createMeeting:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      data,
    });
    return { error: true, code: 'UNEXPECTED_ERROR' };
  }
}
