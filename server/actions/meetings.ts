'use server';

import { db } from '@/drizzle/db';
import { MeetingTable } from '@/drizzle/schema';
import { triggerWorkflow } from '@/lib/integrations/novu';
import { logAuditEvent } from '@/lib/utils/server/audit';
import { getValidTimesFromSchedule } from '@/lib/utils/server/scheduling';
import { meetingActionSchema } from '@/schema/meetings';
import GoogleCalendarService, { createCalendarEvent } from '@/server/googleCalendar';
import { addMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
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
  // NOTE: BotID protection is NOT needed here because this function is called by:
  // 1. Stripe webhooks (server-to-server, would be flagged as bot)
  // 2. Internal server actions (after payment is verified)
  // BotID protection is applied at the payment intent creation level instead
  // where actual user interaction happens (create-payment-intent route)

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

    // Step 3.5: Check for active slot reservations by other users
    const conflictingReservation = await db.query.SlotReservationTable.findFirst({
      where: (fields, operators) =>
        operators.and(
          operators.eq(fields.eventId, data.eventId),
          operators.eq(fields.startTime, data.startTime),
          operators.ne(fields.guestEmail, data.guestEmail),
          operators.gt(fields.expiresAt, new Date()), // Only active reservations
        ),
    });

    if (conflictingReservation) {
      console.error('Time slot is currently reserved by another user:', {
        eventId: data.eventId,
        startTime: data.startTime,
        requestingUser: data.guestEmail,
        existingReservation: {
          id: conflictingReservation.id,
          email: conflictingReservation.guestEmail,
          expiresAt: conflictingReservation.expiresAt,
        },
      });
      return {
        error: true,
        code: 'SLOT_TEMPORARILY_RESERVED',
        message:
          'This time slot is temporarily reserved by another user. Please choose a different time or try again later.',
      };
    }

    // Step 4: Find the associated event and verify it exists and is active
    const event = await db.query.EventTable.findFirst({
      where: ({ clerkUserId, isActive, id }, { eq, and }) =>
        and(eq(isActive, true), eq(clerkUserId, data.clerkUserId), eq(id, data.eventId)),
      with: {
        user: true, // Include user data for Novu notifications
      },
    });
    if (event == null) return { error: true, code: 'EVENT_NOT_FOUND' };

    // Step 5: Verify the requested time slot is valid according to the schedule
    const startTimeUTC = data.startTime;

    // 🔐 IMPORTANT: Skip time slot validation for already-paid bookings
    // When a webhook arrives with payment_status='succeeded', the customer has already paid
    // and we MUST honor the booking even if the schedule has changed since payment.
    // This prevents issues when webhooks are resent or delayed.
    const isAlreadyPaid = data.stripePaymentStatus === 'succeeded';
    const shouldSkipTimeValidation = isAlreadyPaid && data.stripeSessionId;

    if (!shouldSkipTimeValidation) {
      console.log('⏰ Validating time slot availability...');

      // Get calendar events for the time slot
      const calendarService = GoogleCalendarService.getInstance();
      const calendarEvents = await calendarService.getCalendarEventTimes(event.clerkUserId, {
        start: startTimeUTC,
        end: addMinutes(startTimeUTC, event.durationInMinutes),
      });

      const validTimes = await getValidTimesFromSchedule([startTimeUTC], event, calendarEvents);
      if (validTimes.length === 0) {
        console.error('❌ Time slot validation failed:', {
          requestedTime: startTimeUTC,
          eventId: data.eventId,
          guestEmail: data.guestEmail,
        });
        return { error: true, code: 'INVALID_TIME_SLOT' };
      }

      console.log('✅ Time slot is valid');
    } else {
      console.log('⏭️ Skipping time slot validation (payment already succeeded):', {
        paymentStatus: data.stripePaymentStatus,
        sessionId: data.stripeSessionId,
        bookingTime: startTimeUTC,
      });
    }

    // Step 6: Calculate the end time based on event duration
    const endTimeUTC = new Date(startTimeUTC.getTime() + event.durationInMinutes * 60000);

    try {
      let calendarEvent: Awaited<ReturnType<typeof createCalendarEvent>> | null = null;
      let meetingUrl: string | null = null;

      // Only create calendar events for succeeded payments or free events
      const shouldCreateCalendarEvent =
        !data.stripePaymentStatus ||
        data.stripePaymentStatus === 'succeeded' ||
        data.stripePaymentStatus === 'processing';

      console.log('📅 Calendar event creation decision:', {
        shouldCreate: shouldCreateCalendarEvent,
        paymentStatus: data.stripePaymentStatus,
        eventId: data.eventId,
        guestEmail: data.guestEmail,
      });

      if (shouldCreateCalendarEvent) {
        // Step 7: Create calendar event in Google Calendar
        try {
          console.log('🚀 Creating Google Calendar event...');
          calendarEvent = await createCalendarEvent({
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
          meetingUrl = calendarEvent.conferenceData?.entryPoints?.[0]?.uri ?? null;
          console.log('✅ Calendar event created successfully:', {
            paymentStatus: data.stripePaymentStatus || 'free',
            hasUrl: !!meetingUrl,
            hasConferenceData: !!calendarEvent.conferenceData,
          });
        } catch (calendarError) {
          console.error('❌ Failed to create calendar event:', {
            error: calendarError instanceof Error ? calendarError.message : calendarError,
            stack: calendarError instanceof Error ? calendarError.stack : undefined,
            eventId: data.eventId,
            clerkUserId: data.clerkUserId,
            guestEmail: data.guestEmail,
          });
          // Don't fail the meeting creation - calendar can be created later
          // Log the error but continue
        }
      } else {
        console.log(
          `⏳ Calendar event deferred for meeting with payment status: ${data.stripePaymentStatus}. Will be created when payment succeeds.`,
        );
      }

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
          meetingUrl: meetingUrl,
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
        'MEETING_CREATED',
        'meeting',
        data.eventId,
        null,
        {
          ...data,
          endTime: endTimeUTC,
          meetingUrl: meetingUrl,
          calendarEventCreated: shouldCreateCalendarEvent,
        },
        (await headers()).get('x-forwarded-for') ?? 'Unknown',
        (await headers()).get('user-agent') ?? 'Unknown',
      );

      // Step 10: Fetch expert's timezone and trigger Novu workflow for expert notification
      try {
        // CRITICAL: Fetch expert's timezone from their schedule settings
        const expertSchedule = await db.query.ScheduleTable.findFirst({
          where: (fields, { eq: eqOp }) => eqOp(fields.clerkUserId, data.clerkUserId),
        });

        const expertTimezone = expertSchedule?.timezone || 'UTC';
        const guestTimezone = data.timezone || 'UTC';

        // Format date and time for the EXPERT in THEIR timezone
        const appointmentDateForExpert = formatInTimeZone(
          startTimeUTC,
          expertTimezone,
          'EEEE, MMMM d, yyyy',
        );
        const appointmentTimeForExpert = formatInTimeZone(startTimeUTC, expertTimezone, 'h:mm a');
        const appointmentDuration = `${event.durationInMinutes} minutes`;

        // Trigger Novu workflow to notify the expert (with EXPERT's timezone)
        const novuResult = await triggerWorkflow({
          workflowId: 'appointment-confirmation',
          to: {
            subscriberId: data.clerkUserId, // Expert's Clerk ID
            email: event.user?.email || undefined,
            firstName: event.user?.firstName || undefined,
            lastName: event.user?.lastName || undefined,
          },
          payload: {
            expertName:
              `${event.user?.firstName || ''} ${event.user?.lastName || ''}`.trim() || 'Expert',
            clientName: data.guestName,
            appointmentDate: appointmentDateForExpert, // ✅ Expert's timezone
            appointmentTime: appointmentTimeForExpert, // ✅ Expert's timezone
            timezone: expertTimezone, // ✅ Expert's timezone for display
            guestTimezone: guestTimezone, // Store guest's timezone for reference
            appointmentDuration,
            eventTitle: event.name,
            meetLink: meetingUrl || undefined,
            notes: data.guestNotes || undefined,
            locale: data.locale || 'en',
          },
        });

        if (novuResult) {
          console.log('✅ Novu appointment confirmation sent to expert:', data.clerkUserId);
        } else {
          console.warn('⚠️ Failed to send Novu notification to expert');
        }
      } catch (novuError) {
        // Don't fail the whole meeting creation if Novu fails
        console.error('❌ Error sending Novu notification:', novuError);
      }

      return { error: false, meeting };
    } catch (error) {
      console.error('❌ Error creating meeting:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        eventId: data.eventId,
        startTime: data.startTime,
        guestEmail: data.guestEmail,
        clerkUserId: data.clerkUserId,
      });
      return { error: true, code: 'CREATION_ERROR' };
    }
  } catch (error) {
    console.error('❌ Unexpected error in createMeeting:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      eventId: unsafeData.eventId,
      clerkUserId: unsafeData.clerkUserId,
      guestEmail: unsafeData.guestEmail,
    });
    return { error: true, code: 'UNEXPECTED_ERROR' };
  }
}
