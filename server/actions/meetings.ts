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

      // Only create calendar events for confirmed payments or free events.
      // Deferred methods (e.g. Multibanco / processing) get calendar events
      // via createDeferredCalendarEvent in the payment_intent.succeeded handler.
      const shouldCreateCalendarEvent =
        !data.stripePaymentStatus || data.stripePaymentStatus === 'succeeded';

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
            guestPhone: data.guestPhone,
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
          guestPhone: data.guestPhone,
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

      // Step 10: Notify the expert that they have a new booking — but ONLY if
      // payment has actually succeeded (or there is no payment, e.g. free events).
      //
      // For deferred-payment methods (Multibanco), `stripePaymentStatus` is 'pending'
      // here. Triggering the expert email at this point spammed experts with "New
      // Booking" notifications for unpaid bookings (production incident:
      // patimota@gmail.com received 7 such emails plus 7 cancellations when the
      // vouchers eventually expired). Defer the notification to
      // `createDeferredCalendarEvent` in the payment_intent.succeeded handler instead.
      const shouldNotifyExpertNow =
        !data.stripePaymentStatus || data.stripePaymentStatus === 'succeeded';

      if (shouldNotifyExpertNow) {
        await triggerExpertAppointmentConfirmation({
          meetingId: meeting.id,
          clerkUserId: data.clerkUserId,
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          guestNotes: data.guestNotes,
          guestTimezone: data.timezone,
          startTime: startTimeUTC,
          meetingUrl,
          locale: data.locale,
          event: {
            name: event.name,
            durationInMinutes: event.durationInMinutes,
            user: event.user,
          },
        });
      } else {
        console.log(
          `⏳ Deferring expert notification for meeting ${meeting.id} ` +
            `(payment status: ${data.stripePaymentStatus}). ` +
            `Will be sent when payment_intent.succeeded fires.`,
        );
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

/**
 * Triggers the Novu `appointment-confirmation` workflow that emails the EXPERT
 * about a new (paid) booking. Errors are logged but never thrown — failing to
 * send a notification must not break webhook processing.
 *
 * Called from two places, mutually exclusive at runtime:
 * 1. {@link createMeeting} — for card payments and free events, where the
 *    meeting row is created with `stripePaymentStatus === 'succeeded'`.
 * 2. `createDeferredCalendarEvent` in
 *    `app/api/webhooks/stripe/handlers/payment.ts` — for deferred-payment
 *    methods (Multibanco) once `payment_intent.succeeded` fires and the
 *    calendar event/`meetingUrl` is finally created.
 *
 * Idempotency: both call sites pass the same `transactionId`
 * (`expert-appointment-${meetingId}`). Novu deduplicates by `transactionId`,
 * so retries or accidental double-fires from race conditions cannot send the
 * same expert two emails for the same meeting.
 *
 * @example
 * ```ts
 * await triggerExpertAppointmentConfirmation({
 *   meetingId: 'meeting-123',
 *   clerkUserId: 'user_2tYRmKEdAbmZUJUDPvkIzzdnMvq',
 *   guestName: 'Matilde Henriques',
 *   guestPhone: '+351912345678',
 *   guestNotes: 'First session',
 *   guestTimezone: 'Europe/Lisbon',
 *   startTime: new Date('2026-04-22T13:00:00Z'),
 *   meetingUrl: 'https://meet.google.com/abc-defg-hij',
 *   locale: 'pt',
 *   event: {
 *     name: 'Physiotherapy session',
 *     durationInMinutes: 45,
 *     user: { email: 'expert@example.com', firstName: 'Patricia', lastName: 'Mota' },
 *   },
 * });
 * ```
 */
export async function triggerExpertAppointmentConfirmation(params: {
  meetingId: string;
  clerkUserId: string;
  guestName: string;
  guestPhone?: string | null;
  guestNotes?: string | null;
  guestTimezone?: string;
  startTime: Date;
  meetingUrl?: string | null;
  locale?: string;
  event: {
    name: string;
    durationInMinutes: number;
    user?: {
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  };
}): Promise<void> {
  try {
    const expertSchedule = await db.query.ScheduleTable.findFirst({
      where: (fields, { eq: eqOp }) => eqOp(fields.clerkUserId, params.clerkUserId),
    });

    const expertTimezone = expertSchedule?.timezone || 'UTC';
    const guestTimezone = params.guestTimezone || 'UTC';

    const appointmentDateForExpert = formatInTimeZone(
      params.startTime,
      expertTimezone,
      'EEEE, MMMM d, yyyy',
    );
    const appointmentTimeForExpert = formatInTimeZone(params.startTime, expertTimezone, 'h:mm a');
    const appointmentDuration = `${params.event.durationInMinutes} minutes`;

    const transactionId = `expert-appointment-${params.meetingId}`;

    const novuResult = await triggerWorkflow({
      workflowId: 'appointment-confirmation',
      to: {
        subscriberId: params.clerkUserId,
        email: params.event.user?.email || undefined,
        firstName: params.event.user?.firstName || undefined,
        lastName: params.event.user?.lastName || undefined,
      },
      payload: {
        expertName:
          `${params.event.user?.firstName || ''} ${params.event.user?.lastName || ''}`.trim() ||
          'Expert',
        clientName: params.guestName,
        clientPhone: params.guestPhone || undefined,
        appointmentDate: appointmentDateForExpert,
        appointmentTime: appointmentTimeForExpert,
        timezone: expertTimezone,
        guestTimezone,
        appointmentDuration,
        eventTitle: params.event.name,
        meetLink: params.meetingUrl || undefined,
        notes: params.guestNotes || undefined,
        locale: params.locale || 'en',
      },
      transactionId,
    });

    if (novuResult) {
      console.log('✅ Novu appointment confirmation sent to expert:', params.clerkUserId);
    } else {
      console.warn('⚠️ Failed to send Novu notification to expert');
    }
  } catch (novuError) {
    console.error('❌ Error sending Novu notification:', novuError);
  }
}
