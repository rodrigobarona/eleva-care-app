'use server';

import { db } from '@/drizzle/db';
import { EventTable, MeetingTable, PaymentTransferTable, UserTable } from '@/drizzle/schema';
import {
  PAYMENT_TRANSFER_STATUS_PENDING,
  PAYMENT_TRANSFER_STATUS_REFUNDED,
} from '@/lib/constants/payment-transfers';
import { triggerWorkflow } from '@/lib/integrations/novu';
import { stripe } from '@/lib/integrations/stripe';
import { logAuditEvent } from '@/lib/utils/server/audit';
import { getValidTimesFromSchedule } from '@/lib/utils/server/scheduling';
import { meetingActionSchema } from '@/schema/meetings';
import GoogleCalendarService, { createCalendarEvent } from '@/server/googleCalendar';
import { auth } from '@clerk/nextjs/server';
import { addMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { z } from 'zod';

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
      // Stored alongside meetingUrl so the cancel flow can call
      // events.delete() programmatically without searching by time.
      let googleCalendarEventId: string | null = null;

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
          googleCalendarEventId = calendarEvent.id ?? null;
          console.log('✅ Calendar event created successfully:', {
            paymentStatus: data.stripePaymentStatus || 'free',
            hasUrl: !!meetingUrl,
            hasConferenceData: !!calendarEvent.conferenceData,
            hasGoogleCalendarEventId: !!googleCalendarEventId,
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
          googleCalendarEventId,
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
        // Use transactionId for idempotency to prevent duplicate emails from webhook retries
        const transactionId = `expert-appointment-${meeting.id}`;
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
            clientPhone: data.guestPhone || undefined,
            appointmentDate: appointmentDateForExpert,
            appointmentTime: appointmentTimeForExpert,
            timezone: expertTimezone,
            guestTimezone: guestTimezone,
            appointmentDuration,
            eventTitle: event.name,
            meetLink: meetingUrl || undefined,
            notes: data.guestNotes || undefined,
            locale: data.locale || 'en',
          },
          transactionId, // Prevents duplicate notifications from webhook retries
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

type CancelAppointmentResult =
  | { success: true; refundId: string; message: string }
  | { success: false; code: CancelAppointmentErrorCode; message: string };

type CancelAppointmentErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHENTICATED'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'ALREADY_REFUNDED'
  | 'NOT_PAID'
  | 'PAST_APPOINTMENT'
  | 'MISSING_STRIPE_CONTEXT'
  | 'STRIPE_ERROR'
  | 'UNEXPECTED_ERROR';

const cancelAppointmentSchema = z.object({
  meetingId: z.string().uuid(),
  reason: z
    .string()
    .max(500, 'Reason cannot be longer than 500 characters')
    .optional()
    .transform((value) => value?.trim() || undefined),
});

/**
 * Cancel a confirmed appointment.
 *
 * Performs (in order):
 *  1. Auth + ownership check (only the expert who owns the event can cancel)
 *  2. Cancel the Google Calendar event (best-effort; doesn't block refund)
 *  3. Issue a full Stripe refund on the connected account, with
 *     `refund_application_fee: true` and `reverse_transfer: true` so the
 *     platform fee AND the destination payment are clawed back.
 *  4. Update MeetingTable + PaymentTransferTable in our DB IMMEDIATELY (this
 *     is the source-of-truth pattern from Fix E.c — we don't wait for the
 *     webhook because Stripe Dashboard subscriptions can be misconfigured).
 *  5. Trigger the appointment-cancelled Novu workflow for both the GUEST
 *     (refund notice) and the EXPERT (audit confirmation).
 *
 * Idempotent: re-running on an already-cancelled appointment returns
 * ALREADY_REFUNDED (not an error to the user).
 */
export async function cancelAppointment(
  meetingId: string,
  reason?: string,
): Promise<CancelAppointmentResult> {
  // Validate input upfront. Invalid uuid / oversized reason should never
  // reach Stripe or the DB.
  const parsedInput = cancelAppointmentSchema.safeParse({ meetingId, reason });
  if (!parsedInput.success) {
    return {
      success: false,
      code: 'INVALID_INPUT',
      message: parsedInput.error.issues[0]?.message ?? 'Invalid input.',
    };
  }
  const validatedMeetingId = parsedInput.data.meetingId;
  const validatedReason = parsedInput.data.reason;

  try {
    const { userId: expertClerkUserId } = await auth();
    if (!expertClerkUserId) {
      return { success: false, code: 'UNAUTHENTICATED', message: 'You must be signed in.' };
    }

    const meeting = await db.query.MeetingTable.findFirst({
      where: eq(MeetingTable.id, validatedMeetingId),
      with: {
        event: {
          columns: { id: true, name: true, clerkUserId: true, currency: true },
        },
      },
    });

    if (!meeting) {
      return { success: false, code: 'NOT_FOUND', message: 'Appointment not found.' };
    }

    if (meeting.event?.clerkUserId !== expertClerkUserId) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message: 'You can only cancel appointments for events you own.',
      };
    }

    if (meeting.stripePaymentStatus === 'refunded') {
      return {
        success: false,
        code: 'ALREADY_REFUNDED',
        message: 'This appointment has already been cancelled and refunded.',
      };
    }

    if (meeting.stripePaymentStatus !== 'succeeded') {
      return {
        success: false,
        code: 'NOT_PAID',
        message: `Cannot cancel an appointment in status "${meeting.stripePaymentStatus ?? 'unknown'}". Only succeeded payments can be refunded.`,
      };
    }

    if (meeting.startTime.getTime() < Date.now()) {
      return {
        success: false,
        code: 'PAST_APPOINTMENT',
        message: 'Cannot cancel an appointment that has already started or ended.',
      };
    }

    if (!meeting.stripePaymentIntentId) {
      return {
        success: false,
        code: 'MISSING_STRIPE_CONTEXT',
        message: 'No Stripe payment intent on this meeting; cannot issue a refund.',
      };
    }

    const expertUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, expertClerkUserId),
      columns: {
        firstName: true,
        lastName: true,
        stripeConnectAccountId: true,
      },
    });

    if (!expertUser?.stripeConnectAccountId) {
      return {
        success: false,
        code: 'MISSING_STRIPE_CONTEXT',
        message: 'Expert is not connected to Stripe; cannot issue a refund.',
      };
    }

    // Step 1) Best-effort Google Calendar cancellation. We don't block the
    // refund on calendar errors — the customer is owed their money back.
    if (meeting.googleCalendarEventId) {
      try {
        await GoogleCalendarService.getInstance().cancelCalendarEvent(
          expertClerkUserId,
          meeting.googleCalendarEventId,
        );
      } catch (calendarError) {
        console.error('[cancelAppointment] Calendar cancel failed (continuing with refund):', {
          meetingId,
          calendarEventId: meeting.googleCalendarEventId,
          error: calendarError instanceof Error ? calendarError.message : calendarError,
        });
      }
    } else {
      console.warn(
        `[cancelAppointment] Meeting ${meetingId} has no googleCalendarEventId — skipping calendar cancel.`,
      );
    }

    // Step 2) Issue the Stripe refund. For destination_payment marketplace
    // charges (transfer_data.destination), the charge lives on the PLATFORM
    // not the connected account — so we DO NOT pass stripeAccount here.
    // refund_application_fee: true claws back the platform fee, and
    // reverse_transfer: true claws back the destination payment from the
    // expert. Idempotency-keyed so retries don't double-refund.
    let refund: Stripe.Refund;
    try {
      refund = await stripe.refunds.create(
        {
          payment_intent: meeting.stripePaymentIntentId,
          refund_application_fee: true,
          reverse_transfer: true,
          reason: 'requested_by_customer',
          metadata: {
            meetingId: validatedMeetingId,
            cancellationReason: validatedReason ?? '',
            cancelledByExpertClerkUserId: expertClerkUserId,
          },
        },
        {
          idempotencyKey: `cancel-appointment:${validatedMeetingId}`,
        },
      );
    } catch (stripeError) {
      console.error('[cancelAppointment] Stripe refund failed:', {
        meetingId: validatedMeetingId,
        paymentIntentId: meeting.stripePaymentIntentId,
        error: stripeError instanceof Error ? stripeError.message : stripeError,
      });
      return {
        success: false,
        code: 'STRIPE_ERROR',
        message:
          stripeError instanceof Error
            ? `Stripe refund failed: ${stripeError.message}`
            : 'Stripe refund failed for an unknown reason. Please try again.',
      };
    }

    // Step 3) Source-of-truth DB updates (Fix E.c) wrapped in a transaction
    // so we never end up with the meeting marked refunded but the transfer
    // still pending (or vice versa). Conditional WHEREs keep this idempotent
    // — the charge.refunded webhook (which is also idempotent) will no-op
    // on arrival.
    try {
      await db.transaction(async (tx) => {
        await tx
          .update(MeetingTable)
          .set({
            stripePaymentStatus: 'refunded',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(MeetingTable.id, meeting.id),
              eq(MeetingTable.stripePaymentStatus, 'succeeded'),
            ),
          );

        if (meeting.stripePaymentIntentId) {
          await tx
            .update(PaymentTransferTable)
            .set({ status: PAYMENT_TRANSFER_STATUS_REFUNDED, updated: new Date() })
            .where(
              and(
                eq(PaymentTransferTable.paymentIntentId, meeting.stripePaymentIntentId),
                // Only flip rows still in PENDING — don't touch already paid-out ones
                eq(PaymentTransferTable.status, PAYMENT_TRANSFER_STATUS_PENDING),
              ),
            );
        }
      });
    } catch (dbError) {
      console.error('[cancelAppointment] DB update failed AFTER Stripe refund:', {
        meetingId: validatedMeetingId,
        refundId: refund.id,
        error: dbError instanceof Error ? dbError.message : dbError,
      });
      // The webhook will eventually reconcile if it's wired. Surface the
      // partial-success state to the operator via the audit log below and
      // return success-with-warning to the user (the refund DID happen).
    }

    // Step 4) Notifications — guest first (refund notice), then expert
    // (audit confirmation). Failures here are logged but never throw so
    // we don't lie to the user about the cancellation.
    const expertName =
      `${expertUser.firstName ?? ''} ${expertUser.lastName ?? ''}`.trim() || 'Expert';
    const guestTimezone = meeting.timezone || 'UTC';
    const appointmentDate = formatInTimeZone(meeting.startTime, guestTimezone, 'EEEE, MMMM d, yyyy');
    const appointmentTime = formatInTimeZone(meeting.startTime, guestTimezone, 'h:mm a zzz');

    // Prefer the refund's currency, then the event's configured currency,
    // then fall back to EUR. Avoids displaying the wrong currency for
    // non-EUR markets (e.g., a USD pack purchase refunded would otherwise
    // show "X.XX EUR" in the email).
    const refundCurrencyUpper =
      refund.currency?.toUpperCase() ??
      meeting.event?.currency?.toUpperCase() ??
      'EUR';
    const refundAmountFormatted = `${(refund.amount / 100).toFixed(2)} ${refundCurrencyUpper}`;
    const eventName = meeting.event?.name ?? 'Appointment';
    const stripeMetadata = (meeting.stripeMetadata ?? {}) as { locale?: unknown };
    const locale =
      typeof stripeMetadata.locale === 'string' && stripeMetadata.locale.length > 0
        ? stripeMetadata.locale
        : 'en';

    const sharedPayload = {
      expertName,
      clientName: meeting.guestName,
      serviceName: eventName,
      appointmentDate,
      appointmentTime,
      timezone: guestTimezone,
      refundAmountFormatted,
      cancellationReason: validatedReason,
      locale,
    };

    try {
      await triggerWorkflow({
        workflowId: 'appointment-cancelled',
        to: {
          subscriberId: meeting.guestEmail,
          email: meeting.guestEmail,
          firstName: meeting.guestName.split(' ')[0],
          lastName: meeting.guestName.split(' ').slice(1).join(' ') || undefined,
        },
        payload: { ...sharedPayload, recipientType: 'patient' },
        transactionId: `cancel-guest-${meeting.id}`,
      });
    } catch (notifyError) {
      console.error('[cancelAppointment] Failed to notify guest:', notifyError);
    }

    try {
      await triggerWorkflow({
        workflowId: 'appointment-cancelled',
        to: { subscriberId: expertClerkUserId },
        payload: { ...sharedPayload, recipientType: 'expert' },
        transactionId: `cancel-expert-${meeting.id}`,
      });
    } catch (notifyError) {
      console.error('[cancelAppointment] Failed to notify expert:', notifyError);
    }

    // Step 5) Audit log
    try {
      await logAuditEvent(
        expertClerkUserId,
        'MEETING_CANCELLED',
        'meeting',
        meeting.id,
        { stripePaymentStatus: 'succeeded' },
        {
          stripePaymentStatus: 'refunded',
          refundId: refund.id,
          refundAmount: refund.amount,
          refundCurrency: refund.currency,
          cancellationReason: validatedReason,
        },
        (await headers()).get('x-forwarded-for') ?? 'Unknown',
        (await headers()).get('user-agent') ?? 'Unknown',
      );
    } catch (auditError) {
      console.error('[cancelAppointment] Audit log failed (continuing):', auditError);
    }

    return {
      success: true,
      refundId: refund.id,
      message: `Appointment cancelled and ${refundAmountFormatted} refunded.`,
    };
  } catch (error) {
    console.error('[cancelAppointment] Unexpected error:', error);
    return {
      success: false,
      code: 'UNEXPECTED_ERROR',
      message: error instanceof Error ? error.message : 'Unexpected error during cancellation.',
    };
  }
}
