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
 * Creates a new meeting between an expert and a guest, handling validation, scheduling, payment, and calendar integration.
 *
 * Validates input data, checks for duplicate or conflicting bookings, verifies event status, ensures the requested time slot is available, creates a Google Calendar event, and records the meeting in the database. Returns structured error information for all failure cases.
 *
 * @param unsafeData - The meeting details to validate and process.
 * @returns An object indicating success or failure, with optional error code, message, and the created meeting record.
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
