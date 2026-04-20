import { db } from '@/drizzle/db';
import {
  BlockedDatesTable,
  EventTable,
  MeetingTable,
  PackPurchaseTable,
  PaymentTransferTable,
  schedulingSettings,
  SlotReservationTable,
  UserTable,
} from '@/drizzle/schema';
import {
  NOTIFICATION_TYPE_ACCOUNT_UPDATE,
  NOTIFICATION_TYPE_SECURITY_ALERT,
} from '@/lib/constants/notifications';
import {
  PAYMENT_TRANSFER_STATUS_DISPUTED,
  PAYMENT_TRANSFER_STATUS_FAILED,
  PAYMENT_TRANSFER_STATUS_PENDING,
  PAYMENT_TRANSFER_STATUS_READY,
  PAYMENT_TRANSFER_STATUS_REFUNDED,
} from '@/lib/constants/payment-transfers';
import { triggerWorkflow } from '@/lib/integrations/novu';
import { sendEmail } from '@/lib/integrations/novu/email';
import { elevaEmailService } from '@/lib/integrations/novu/email-service';
import { stripe, withRetry } from '@/lib/integrations/stripe';
import { createUserNotification } from '@/lib/notifications/core';
import { resolveMarketplaceAmounts } from '@/lib/payments/marketplace-amounts';
import { extractLocaleFromPaymentIntent } from '@/lib/utils/locale';
import { logAuditEvent } from '@/lib/utils/server/audit';
import { format, toZonedTime } from 'date-fns-tz';
import { and, eq, isNull } from 'drizzle-orm';
import Stripe from 'stripe';

// Helper function to parse metadata safely
function parseMetadata<T>(json: string | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Failed to parse metadata:', error);
    return fallback;
  }
}

/**
 * Map a Stripe `payment_method_types` array (e.g. `['mb_way']`,
 * `['card', 'multibanco']`) to a human-readable label suitable for the
 * "Payment Method:" row in `PaymentConfirmationEmail`. Returns the original
 * Stripe id title-cased when no friendly mapping exists, or `undefined` when
 * the array is empty (template hides the row).
 */
function friendlyPaymentMethod(types: string[] | null | undefined): string | undefined {
  if (!types || types.length === 0) return undefined;
  const primary = types[0];
  const labels: Record<string, string> = {
    card: 'Card',
    multibanco: 'Multibanco',
    mb_way: 'MB WAY',
    link: 'Link',
    klarna: 'Klarna',
    revolut_pay: 'Revolut Pay',
    sepa_debit: 'SEPA Debit',
    bancontact: 'Bancontact',
    ideal: 'iDEAL',
    sofort: 'Sofort',
    giropay: 'Giropay',
    eps: 'EPS',
    p24: 'Przelewy24',
    apple_pay: 'Apple Pay',
    google_pay: 'Google Pay',
  };
  return labels[primary] ?? primary.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Note: notifyExpertOfPaymentSuccess was removed - it incorrectly used user-lifecycle
// workflow with eventType: 'welcome', sending welcome emails instead of payment notifications.
// Expert payment notifications are now handled by marketplace-universal workflow.

/**
 * Notify expert about failed payment
 */
async function notifyExpertOfPaymentFailure(
  transfer: { expertClerkUserId: string },
  paymentIntentId: string,
  lastPaymentError: string,
  meetingDetails?: {
    guestName: string | null;
    eventId: string;
    startTime: Date;
  },
) {
  let message = `A payment for one of your sessions (PI: ${paymentIntentId}) has failed. Reason: ${lastPaymentError}. The client may need to update their payment method or rebook.`;

  if (meetingDetails) {
    message = `Payment for your session with ${meetingDetails.guestName || 'guest'} for event ID ${meetingDetails.eventId} scheduled at ${meetingDetails.startTime.toISOString()} has failed. Reason: ${lastPaymentError}. The meeting has been canceled and the guest notified. They may attempt to rebook.`;
  }

  await createUserNotification({
    userId: transfer.expertClerkUserId,
    type: NOTIFICATION_TYPE_ACCOUNT_UPDATE,
    data: {
      userName: 'Expert',
      title: 'Important: Session Payment Failed & Canceled',
      message,
      actionUrl: '/account/payments',
    },
  });
}

/**
 * Notify expert about payment refund
 */
async function notifyExpertOfPaymentRefund(transfer: { expertClerkUserId: string }) {
  await createUserNotification({
    userId: transfer.expertClerkUserId,
    type: NOTIFICATION_TYPE_ACCOUNT_UPDATE,
    data: {
      userName: 'Expert',
      title: 'Payment Refunded',
      message: 'A payment has been refunded for one of your sessions.',
      actionUrl: '/account/payments',
    },
  });
}

/**
 * Notify expert about payment dispute
 */
async function notifyExpertOfPaymentDispute(transfer: { expertClerkUserId: string }) {
  await createUserNotification({
    userId: transfer.expertClerkUserId,
    type: NOTIFICATION_TYPE_SECURITY_ALERT,
    data: {
      userName: 'Expert',
      title: 'Payment Dispute Opened',
      message:
        'A payment dispute has been opened for one of your sessions. We will contact you with more information.',
      actionUrl: '/account/payments',
    },
  });
}

/**
 * Helper to check if two time ranges overlap
 */
function hasTimeOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Releases a calendar creation claim to allow retries.
 *
 * Called when calendar creation fails partway through, allowing
 * subsequent webhook retries to attempt creation again.
 *
 * @param meetingId - The meeting ID to release the claim for
 */
async function releaseClaim(meetingId: string): Promise<void> {
  try {
    await db
      .update(MeetingTable)
      .set({
        calendarCreationClaimed: false,
        updatedAt: new Date(),
      })
      .where(eq(MeetingTable.id, meetingId));
    console.log(`🔓 Released calendar creation claim for meeting ${meetingId}`);
  } catch (releaseError) {
    console.error(`❌ Failed to release claim for meeting ${meetingId}:`, releaseError);
    // Log but don't throw - claim will timeout naturally if release fails
  }
}

/**
 * Creates a deferred calendar event for meetings that were created with pending payment
 * (e.g., Multibanco payments) and finalizes them when payment succeeds.
 *
 * This function is called ONLY after payment confirmation to ensure calendar events
 * are never created for unpaid bookings.
 *
 * @param meeting - The meeting record from the database
 * @param meeting.id - Unique meeting identifier
 * @param meeting.eventId - Reference to the event type
 * @param meeting.clerkUserId - Expert's Clerk user ID (for calendar access)
 * @param meeting.guestName - Patient/guest name
 * @param meeting.guestEmail - Patient/guest email (receives calendar invite)
 * @param meeting.startTime - Appointment start time
 * @param meeting.guestNotes - Optional notes from the guest
 * @param meeting.timezone - Timezone for the appointment
 * @param paymentIntent - The Stripe PaymentIntent that triggered this call
 *
 * @returns {Promise<void>} Resolves when calendar event is created and meeting is updated
 *
 * @example
 * ```typescript
 * await createDeferredCalendarEvent(
 *   {
 *     id: 'meeting-123',
 *     eventId: 'event-456',
 *     clerkUserId: 'user_abc',
 *     guestName: 'John Doe',
 *     guestEmail: 'john@example.com',
 *     startTime: new Date('2026-01-25T10:00:00Z'),
 *     guestNotes: 'First consultation',
 *     timezone: 'Europe/Lisbon',
 *   },
 *   paymentIntent,
 * );
 * ```
 *
 * @remarks
 * - Does NOT throw on failure - calendar errors are logged but don't fail the webhook
 * - Cleans up any slot reservations after successful calendar creation
 * - Updates the meeting record with the Google Meet URL
 * - Triggers the expert "New Booking" notification via
 *   {@link triggerExpertAppointmentConfirmation} once the meeting URL is set.
 *   For deferred-payment methods this is the FIRST point at which the expert
 *   is told about the booking — see plan: fix_fake_email_content_bug, Phase 3.
 */
async function createDeferredCalendarEvent(
  meeting: {
    id: string;
    eventId: string;
    clerkUserId: string;
    guestName: string;
    guestEmail: string;
    guestPhone?: string | null;
    startTime: Date;
    guestNotes: string | null;
    timezone: string;
  },
  paymentIntent: Stripe.PaymentIntent,
) {
  try {
    console.log(`📅 Creating deferred calendar event for meeting ${meeting.id}...`);

    // 🔒 IDEMPOTENCY CLAIM: Atomically claim the meeting to prevent duplicate calendar events
    // This protects against concurrent webhook retries creating multiple Google Calendar events
    const claimResult = await db
      .update(MeetingTable)
      .set({
        calendarCreationClaimed: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(MeetingTable.id, meeting.id),
          isNull(MeetingTable.meetingUrl), // Only claim if no URL exists yet
          eq(MeetingTable.calendarCreationClaimed, false), // Only claim if not already claimed
        ),
      )
      .returning({ id: MeetingTable.id });

    if (claimResult.length === 0) {
      console.log(
        `⏭️ Skipping calendar creation for meeting ${meeting.id}: already claimed or has URL`,
      );
      return; // Another process is handling this or it's already done
    }

    console.log(`🔒 Claimed calendar creation for meeting ${meeting.id}`);

    // Get the event details for calendar creation. We also load the related
    // user (the expert) so we can notify them after the calendar event is
    // created — that's the correct moment to email the expert about a deferred
    // (Multibanco) booking, NOT at checkout.session.completed.
    const event = await db.query.EventTable.findFirst({
      where: eq(EventTable.id, meeting.eventId),
      with: { user: true },
    });

    if (!event) {
      console.error(`❌ Event ${meeting.eventId} not found for deferred calendar creation`);
      // Release the claim on failure so retries can proceed
      await releaseClaim(meeting.id);
      return;
    }

    // Dynamic import to avoid circular dependency with calendar service
    const { createCalendarEvent } = await import('@/server/googleCalendar');

    console.log('🚀 Calling createCalendarEvent for deferred booking:', {
      meetingId: meeting.id,
      clerkUserId: meeting.clerkUserId,
      guestEmail: meeting.guestEmail,
      timezone: meeting.timezone,
    });

    let calendarEvent;
    try {
      calendarEvent = await createCalendarEvent({
        clerkUserId: meeting.clerkUserId,
        guestName: meeting.guestName,
        guestEmail: meeting.guestEmail,
        guestPhone: meeting.guestPhone,
        startTime: meeting.startTime,
        guestNotes: meeting.guestNotes || undefined,
        durationInMinutes: event.durationInMinutes,
        eventName: event.name,
        timezone: meeting.timezone,
        locale: extractLocaleFromPaymentIntent(paymentIntent),
      });
    } catch (createError) {
      console.error(`❌ Calendar creation failed for meeting ${meeting.id}:`, createError);
      // Release the claim on failure so retries can proceed
      await releaseClaim(meeting.id);
      throw createError; // Re-throw to be caught by outer try-catch
    }

    const meetingUrl = calendarEvent.conferenceData?.entryPoints?.[0]?.uri ?? null;

    // Update meeting with the new URL and mark claim as completed
    if (meetingUrl) {
      await db
        .update(MeetingTable)
        .set({
          meetingUrl: meetingUrl,
          calendarCreationClaimed: true, // Keep claimed to prevent re-processing
          updatedAt: new Date(),
        })
        .where(eq(MeetingTable.id, meeting.id));

      console.log(`✅ Calendar event created and meeting URL updated for meeting ${meeting.id}`);
    } else {
      console.warn(
        `⚠️ Calendar event created but no meeting URL extracted for meeting ${meeting.id}`,
      );
      // Still mark as completed since we successfully created the event
      await db
        .update(MeetingTable)
        .set({
          calendarCreationClaimed: true,
          updatedAt: new Date(),
        })
        .where(eq(MeetingTable.id, meeting.id));
    }

    // Now that the meeting is fully real (calendar event created, meetingUrl
    // populated for paid bookings), notify the expert. For deferred-payment
    // methods this is the FIRST time the expert hears about the booking — by
    // design. See the JSDoc on `triggerExpertAppointmentConfirmation` and the
    // expert-spam incident write-up in
    // docs/02-core-systems/notifications/08-email-render-contract.md.
    //
    // The notification has its own try/catch so a Novu outage cannot
    // re-trigger the outer "Failed to create deferred calendar event" error
    // path — at this point the calendar event has succeeded and the meeting
    // is real; only the courtesy email is at risk.
    try {
      const { triggerExpertAppointmentConfirmation } = await import('@/server/actions/meetings');
      await triggerExpertAppointmentConfirmation({
        meetingId: meeting.id,
        clerkUserId: meeting.clerkUserId,
        guestName: meeting.guestName,
        guestPhone: meeting.guestPhone,
        guestNotes: meeting.guestNotes,
        guestTimezone: meeting.timezone,
        startTime: meeting.startTime,
        meetingUrl,
        locale: extractLocaleFromPaymentIntent(paymentIntent),
        event: {
          name: event.name,
          durationInMinutes: event.durationInMinutes,
          user: event.user,
        },
      });
    } catch (notificationError) {
      console.error(`⚠️ Failed to notify expert for meeting ${meeting.id}:`, notificationError);
      // Don't rethrow — calendar event already succeeded.
    }

    // Clean up slot reservation if it exists.
    // Critical: orphaned rows cause the cron job to send false cancellation emails.
    try {
      await db
        .delete(SlotReservationTable)
        .where(eq(SlotReservationTable.stripePaymentIntentId, paymentIntent.id));
      console.log(`🧹 Cleaned up slot reservation for payment intent ${paymentIntent.id}`);
    } catch (cleanupError) {
      console.warn('⚠️ First attempt to clean up slot reservation failed, retrying:', {
        paymentIntentId: paymentIntent.id,
        meetingId: meeting.id,
        error: cleanupError instanceof Error ? cleanupError.message : cleanupError,
      });
      try {
        await db
          .delete(SlotReservationTable)
          .where(eq(SlotReservationTable.stripePaymentIntentId, paymentIntent.id));
      } catch (retryError) {
        console.error(
          '❌ Slot reservation cleanup failed after retry (cron guard will prevent false emails):',
          {
            paymentIntentId: paymentIntent.id,
            meetingId: meeting.id,
            error: retryError instanceof Error ? retryError.message : retryError,
          },
        );
      }
    }
  } catch (calendarError) {
    console.error(`❌ Failed to create deferred calendar event for meeting ${meeting.id}:`, {
      error: calendarError instanceof Error ? calendarError.message : calendarError,
      stack: calendarError instanceof Error ? calendarError.stack : undefined,
      meetingId: meeting.id,
      paymentIntentId: paymentIntent.id,
    });
    // Don't fail the entire webhook for calendar errors - payment succeeded
  }
}

/**
 * Enhanced collision detection that considers blocked dates, booking conflicts, and minimum notice periods
 *
 * Priority order (for detection logic):
 * 1. Blocked dates (expert blocked after booking) → 100% refund
 * 2. Time range overlaps (slot already booked) → 100% refund
 * 3. Minimum notice violations (too close to start time) → 100% refund
 *
 * ALL conflicts result in 100% refund under v3.0 customer-first policy
 *
 * Timezone Handling (Critical):
 * - Each blocked date has its own timezone field (BlockedDatesTable.timezone)
 * - We format the appointment time in EACH blocked date's specific timezone
 * - This correctly handles cases where:
 *   • Expert changes their schedule timezone after blocking dates
 *   • Blocked dates were created with different timezones (e.g., expert traveling)
 * - Example: Blocked date '2025-02-15' in 'America/New_York' will match an appointment
 *   at 2025-02-16 04:00 UTC (which is 2025-02-15 23:00 EST)
 *
 * @param expertId - Expert's Clerk user ID
 * @param startTime - Appointment start time (UTC)
 * @param eventId - Event ID to get duration information
 * @returns Object with conflict info and reason
 */
async function checkAppointmentConflict(
  expertId: string,
  startTime: Date,
  eventId: string,
): Promise<{
  hasConflict: boolean;
  reason?: string;
  minimumNoticeHours?: number;
  blockedDateReason?: string;
}> {
  try {
    console.log(`🔍 Enhanced collision check for expert ${expertId} at ${startTime.toISOString()}`);

    // Get the event details to calculate the appointment end time
    const event = await db.query.EventTable.findFirst({
      where: eq(EventTable.id, eventId),
      columns: { durationInMinutes: true },
    });

    if (!event) {
      console.error(`❌ Event not found: ${eventId}`);
      return { hasConflict: true, reason: 'event_not_found' };
    }

    // Calculate the end time of the new appointment
    const endTime = new Date(startTime.getTime() + event.durationInMinutes * 60 * 1000);

    console.log(
      `📅 New appointment: ${startTime.toISOString()} - ${endTime.toISOString()} (${event.durationInMinutes} min)`,
    );

    // 🆕 PRIORITY 1: Check for BLOCKED DATES (Expert's responsibility - 100% refund)
    // Get all blocked dates for the expert (with their individual timezones)
    // Note: Each blocked date has its own timezone field that must be used for accurate detection
    const blockedDates = await db.query.BlockedDatesTable.findMany({
      where: eq(BlockedDatesTable.clerkUserId, expertId),
    });

    console.log(`🗓️  Checking ${blockedDates.length} blocked dates for expert ${expertId}`);

    // Check if appointment falls on any blocked date in that date's specific timezone
    for (const blockedDate of blockedDates) {
      // Format both the appointment start and end times in the blocked date's timezone
      const appointmentDateInBlockedTz = format(startTime, 'yyyy-MM-dd', {
        timeZone: blockedDate.timezone,
      });

      const appointmentEndDateInBlockedTz = format(endTime, 'yyyy-MM-dd', {
        timeZone: blockedDate.timezone,
      });

      // Check if the appointment conflicts with the blocked date:
      // 1. Start date matches blocked date, OR
      // 2. End date matches blocked date, OR
      // 3. Appointment spans the blocked date (start and end dates differ, and either matches)
      const startDateMatches = appointmentDateInBlockedTz === blockedDate.date;
      const endDateMatches = appointmentEndDateInBlockedTz === blockedDate.date;
      const spansBlockedDate =
        appointmentDateInBlockedTz !== appointmentEndDateInBlockedTz &&
        (startDateMatches || endDateMatches);

      if (startDateMatches || endDateMatches || spansBlockedDate) {
        console.log(
          `🚫 BLOCKED DATE CONFLICT DETECTED!`,
          `\n  - Appointment time (UTC): ${startTime.toISOString()} - ${endTime.toISOString()}`,
          `\n  - Appointment start date in blocked timezone: ${appointmentDateInBlockedTz}`,
          `\n  - Appointment end date in blocked timezone: ${appointmentEndDateInBlockedTz}`,
          `\n  - Blocked date: ${blockedDate.date}`,
          `\n  - Blocked date timezone: ${blockedDate.timezone}`,
          `\n  - Expert: ${expertId}`,
          `\n  - Reason: ${blockedDate.reason || 'Not specified'}`,
          `\n  - Blocked ID: ${blockedDate.id}`,
          `\n  - ⚠️  This warrants 100% refund - expert blocked after booking`,
        );
        return {
          hasConflict: true,
          reason: 'expert_blocked_date',
          blockedDateReason: blockedDate.reason || undefined,
        };
      }
    }

    console.log(
      `✅ No blocked date conflicts found (checked ${blockedDates.length} blocked dates)`,
    );

    // PRIORITY 2: Check for existing confirmed meetings with TIME RANGE OVERLAP
    const conflictingMeetings = await db.query.MeetingTable.findMany({
      where: and(
        eq(MeetingTable.clerkUserId, expertId),
        eq(MeetingTable.stripePaymentStatus, 'succeeded'),
      ),
      with: {
        event: {
          columns: { durationInMinutes: true },
        },
      },
    });

    for (const existingMeeting of conflictingMeetings) {
      const existingEndTime = new Date(
        existingMeeting.startTime.getTime() + existingMeeting.event.durationInMinutes * 60 * 1000,
      );

      // Use helper for overlap check
      if (hasTimeOverlap(startTime, endTime, existingMeeting.startTime, existingEndTime)) {
        console.log(
          `⚠️ TIME RANGE OVERLAP detected!
          📅 Existing: ${existingMeeting.startTime.toISOString()} - ${existingEndTime.toISOString()} (${existingMeeting.event.durationInMinutes} min)
          📅 New:      ${startTime.toISOString()} - ${endTime.toISOString()} (${event.durationInMinutes} min)
          🔴 Meeting ID: ${existingMeeting.id}`,
        );
        return { hasConflict: true, reason: 'time_range_overlap' };
      }
    }

    console.log('✅ No time range conflicts found');

    // PRIORITY 3: Check minimum notice period requirements from expert's settings
    const expertSchedulingSettings = await db.query.schedulingSettings.findFirst({
      where: eq(schedulingSettings.userId, expertId),
    });

    // Get the minimum notice in minutes from expert's settings, default to 1440 (24 hours)
    const minimumNoticeMinutes = expertSchedulingSettings?.minimumNotice || 1440;
    const currentTime = new Date();
    const millisecondsUntilAppointment = startTime.getTime() - currentTime.getTime();
    const minutesUntilAppointment = millisecondsUntilAppointment / (1000 * 60);

    console.log(
      `📋 Expert ${expertId} minimum notice: ${minimumNoticeMinutes} minutes, appointment in ${minutesUntilAppointment.toFixed(1)} minutes`,
    );

    if (minutesUntilAppointment < minimumNoticeMinutes) {
      const minimumNoticeHours = Math.ceil(minimumNoticeMinutes / 60);
      const availableHours = Math.floor(minutesUntilAppointment / 60);

      console.log(
        `⚠️ Minimum notice violation: appointment at ${startTime.toISOString()} requires ${minimumNoticeHours}h notice, but only ${availableHours}h available`,
      );

      return {
        hasConflict: true,
        reason: 'minimum_notice_violation',
        minimumNoticeHours,
      };
    }

    console.log(`✅ No conflicts found for ${startTime.toISOString()}`);
    return { hasConflict: false };
  } catch (error) {
    // Enhanced error monitoring with structured context for operational visibility
    console.error(
      `❌ CRITICAL: Conflict check failed for expert ${expertId} at ${startTime.toISOString()}. ` +
        `Event ID: ${eventId}. ` +
        `Defaulting to no conflict to avoid blocking legitimate payment.`,
      {
        error,
        context: {
          expertId,
          appointmentTime: startTime.toISOString(),
          eventId,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      },
    );

    // TODO: Emit metric/alert for monitoring (e.g., to BetterStack, PostHog, or Sentry)
    // This helps operations teams detect systematic failures that might allow conflicting appointments
    // Example: await trackMetric('conflict_check_error', { expertId, eventId });

    // In case of error, assume no conflict to avoid blocking legitimate payments
    // Business decision: Prefer false negatives over false positives to maintain user experience
    return { hasConflict: false };
  }
}

/**
 * Process full refund for appointment conflicts
 *
 * CUSTOMER-FIRST POLICY (v3.0):
 * - 100% refund for ALL conflicts (blocked dates, time overlaps, minimum notice)
 * - No processing fees charged to customers
 * - Eleva Care absorbs payment processing costs
 *
 * @param paymentIntent - Stripe Payment Intent object
 * @param reason - Human-readable conflict reason
 * @param conflictType - Type of conflict detected (for logging and analytics)
 * @returns Stripe Refund object or null if failed
 */
async function processPartialRefund(
  paymentIntent: Stripe.PaymentIntent,
  reason: string,
  conflictType:
    | 'expert_blocked_date'
    | 'time_range_overlap'
    | 'minimum_notice_violation'
    | 'unknown_conflict',
): Promise<Stripe.Refund | null> {
  try {
    const originalAmount = paymentIntent.amount;

    // 🆕 CUSTOMER-FIRST POLICY (v3.0): Always 100% refund for any conflict
    // No processing fees charged - Eleva Care absorbs the cost
    const refundAmount = originalAmount; // Always 100% refund
    const processingFee = 0; // No fee charged
    const refundPercentage = '100';

    console.log(
      `💰 Processing 🎁 FULL (100%) refund:`,
      `\n  - Conflict Type: ${conflictType}`,
      `\n  - Original: €${(originalAmount / 100).toFixed(2)}`,
      `\n  - Refund: €${(refundAmount / 100).toFixed(2)} (${refundPercentage}%)`,
      `\n  - Fee Retained: €${(processingFee / 100).toFixed(2)}`,
      `\n  - Reason: ${reason}`,
    );

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntent.id,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        reason: reason,
        conflict_type: conflictType,
        original_amount: originalAmount.toString(),
        processing_fee: processingFee.toString(),
        refund_percentage: refundPercentage,
        policy_version: '3.0', // Customer-first: Always 100% refund
      },
    });

    console.log(
      `✅ 🎁 Full refund (100%) processed:`,
      `\n  - Refund ID: ${refund.id}`,
      `\n  - Amount: €${(refund.amount / 100).toFixed(2)}`,
      `\n  - Status: ${refund.status}`,
    );

    return refund;
  } catch (error) {
    console.error('❌ Error processing refund:', error);
    return null;
  }
}

/**
 * Send conflict notification using existing email system with multilingual support
 */
/**
 * Sends a branded refund notification email to the customer when an appointment
 * conflict is detected (e.g., late Multibanco payment where slot was already booked).
 *
 * Uses the RefundNotificationTemplate for consistent Eleva branding and i18n support.
 *
 * @param guestEmail - Customer's email address
 * @param guestName - Customer's display name
 * @param expertName - Expert's display name
 * @param startTime - Original appointment start time
 * @param refundAmount - Amount refunded in cents
 * @param originalAmount - Original payment amount in cents
 * @param locale - Customer's locale for i18n (en, pt, es)
 * @param conflictReason - Type of conflict (time_range_overlap, expert_blocked_date, etc.)
 * @param serviceName - Optional service/event name
 * @param transactionId - Optional Stripe payment intent ID for reference
 */
async function notifyAppointmentConflict(
  guestEmail: string,
  guestName: string,
  expertName: string,
  startTime: Date,
  refundAmount: number,
  originalAmount: number,
  locale: string,
  conflictReason: string,
  minimumNoticeHours?: number,
  serviceName?: string,
  transactionId?: string,
) {
  try {
    console.log(
      `📧 Sending branded refund notification to ${guestEmail} in locale ${locale} for reason: ${conflictReason}`,
    );

    // Format amounts for display (convert from cents to currency)
    const refundAmountFormatted = (refundAmount / 100).toFixed(2);
    const originalAmountFormatted = (originalAmount / 100).toFixed(2);

    // Format date and time for display
    const appointmentDate = format(startTime, 'EEEE, MMMM d, yyyy');
    const appointmentTime = format(startTime, 'h:mm a');

    // Render the branded refund notification template
    const html = await elevaEmailService.renderRefundNotification({
      customerName: guestName,
      expertName,
      serviceName: serviceName || 'Appointment',
      appointmentDate,
      appointmentTime,
      originalAmount: originalAmountFormatted,
      refundAmount: refundAmountFormatted,
      currency: 'EUR',
      refundReason: conflictReason,
      transactionId,
      locale,
    });

    // Determine subject based on locale
    const subjects: Record<string, string> = {
      en: `Appointment Conflict - Full Refund Processed`,
      pt: `Conflito de Agendamento - Reembolso Total Processado`,
      es: `Conflicto de Cita - Reembolso Total Procesado`,
    };
    const localePrefix = locale.toLowerCase().split('-')[0];
    const subject = subjects[localePrefix] || subjects.en;

    await sendEmail({
      to: guestEmail,
      subject,
      html,
    });

    console.log(
      `✅ Branded refund notification sent to ${guestEmail} (reason: ${conflictReason}${minimumNoticeHours ? `, minimum notice: ${minimumNoticeHours}h` : ''})`,
    );

    // Trigger Novu workflow for activity tracking (in-app notification)
    // Note: Guest may not have a Novu subscriber ID, so we use email as subscriber
    try {
      await triggerWorkflow({
        workflowId: 'marketplace-universal',
        to: {
          subscriberId: guestEmail, // Use email as subscriber ID for guests
          email: guestEmail,
          firstName: guestName.split(' ')[0] || guestName,
        },
        payload: {
          eventType: 'refund-processed' as const,
          amount: refundAmountFormatted,
          expertName,
          appointmentDate,
          message: `Your payment of €${refundAmountFormatted} has been refunded due to a scheduling conflict.`,
          dashboardUrl: '/',
        },
        transactionId: transactionId ? `refund-${transactionId}` : undefined,
      });
      console.log(`✅ Novu refund activity tracked for ${guestEmail}`);
    } catch (novuError) {
      // Don't fail the notification if Novu tracking fails
      console.error('⚠️ Failed to track refund in Novu (non-critical):', novuError);
    }
  } catch (error) {
    console.error('Error sending refund notification:', error);
  }
}

/**
 * Handles successful payment events from Stripe.
 *
 * Processes `payment_intent.succeeded` webhooks and performs:
 * 1. Late Multibanco payment conflict detection with automatic refunds
 * 2. Meeting status update to 'succeeded'
 * 3. Deferred calendar event creation (for pending-to-succeeded transitions)
 * 4. Transfer creation for expert payouts
 * 5. Confirmation emails to guests
 *
 * @param {Stripe.PaymentIntent} paymentIntent - The Stripe PaymentIntent object
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * // Called from main Stripe webhook handler
 * case 'payment_intent.succeeded':
 *   await handlePaymentSucceeded(paymentIntent);
 *   break;
 * ```
 *
 * @remarks
 * - Uses atomic claims to prevent duplicate calendar events during retries
 * - Implements fallback meeting lookup by metadata ID if paymentIntentId not found
 * - Automatically refunds Multibanco payments that conflict with existing bookings
 * - Only sets stripePaymentIntentId in fallback if column is currently null
 *
 * @see {@link createDeferredCalendarEvent} - Calendar creation with idempotency
 * @see {@link notifyAppointmentConflict} - Conflict notification emails
 */
export async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);

  try {
    // Parse meeting metadata to check if this might be a late Multibanco payment
    const meetingData = parseMetadata(paymentIntent.metadata?.meeting, {
      id: '',
      expert: '',
      guest: '',
      guestName: '',
      guestPhone: '',
      start: '',
      dur: 0,
      notes: '',
    });
    const paymentData = parseMetadata(paymentIntent.metadata?.payment, {
      amount: '0',
      fee: '0',
      expert: '0',
    });
    const resolvedAmounts = resolveMarketplaceAmounts({
      actualGrossAmount: paymentIntent.amount_received || paymentIntent.amount,
      configuredGrossAmount: Number.parseInt(paymentData.amount, 10),
      actualPlatformFeeAmount: paymentIntent.application_fee_amount,
      configuredPlatformFeeAmount: Number.parseInt(paymentData.fee, 10),
      configuredExpertAmount: Number.parseInt(paymentData.expert, 10),
    });

    // Retrieve the latest charge once and share it across:
    //  • Multibanco detection (using the actual payment_method_details.type
    //    instead of the broader payment_method_types[] which lists every
    //    method the PI was eligible for under Dashboard-driven dynamic
    //    payment methods)
    //  • Destination-payment description update later in this handler
    let latestCharge: Stripe.Charge | null = null;
    if (paymentIntent.latest_charge) {
      try {
        const latestChargeId =
          typeof paymentIntent.latest_charge === 'string'
            ? paymentIntent.latest_charge
            : paymentIntent.latest_charge.id;
        latestCharge = await stripe.charges.retrieve(latestChargeId, {
          expand: ['transfer'],
        });
      } catch (chargeError) {
        console.warn(
          `⚠️ Failed to retrieve latest charge for PI ${paymentIntent.id}; falling back to payment_method_types for detection`,
          chargeError,
        );
      }
    }

    // Definitive Multibanco detection from the charge that was actually
    // captured. Falls back to payment_method_types when the charge is
    // unavailable (e.g. PI not yet linked to a charge).
    const isMultibancoPayment =
      latestCharge?.payment_method_details?.type === 'multibanco' ||
      (!latestCharge && paymentIntent.payment_method_types?.includes('multibanco'));

    // 🆕 CRITICAL FIX: For Multibanco payments, recalculate transfer schedule
    // based on ACTUAL payment time, not the initial booking time
    let recalculatedTransferTime: Date | null = null;

    if (isMultibancoPayment && meetingData.expert && meetingData.start) {
      // 🛡️ VALIDATION: Ensure meetingData.dur is a finite number before date calculations
      // This prevents NaN from breaking date math and transfer scheduling
      if (!Number.isFinite(meetingData.dur) || meetingData.dur <= 0) {
        console.warn(
          '⚠️ MULTIBANCO TRANSFER RECALCULATION ABORTED: Invalid duration in payment metadata',
          {
            paymentIntentId: paymentIntent.id,
            meetingId: meetingData.id || 'unknown',
            expertId: meetingData.expert,
            appointmentStart: meetingData.start,
            invalidDuration: meetingData.dur,
            durationType: typeof meetingData.dur,
            reason: !Number.isFinite(meetingData.dur)
              ? 'Duration is not a finite number (undefined, null, NaN, or Infinity)'
              : 'Duration is zero or negative',
            impact:
              'Skipping transfer time recalculation AND conflict checks - will use original scheduled time from metadata',
            action:
              'Verify payment intent metadata structure and ensure "dur" field contains valid positive number',
          },
        );
        // Abort recalculation - leave recalculatedTransferTime as null
        // The code will fall back to using originalScheduledTime from transferData.scheduled
        // Skip conflict checks as well since we can't reliably calculate appointment end time
      } else {
        const appointmentStart = new Date(meetingData.start);
        const appointmentEnd = new Date(appointmentStart.getTime() + meetingData.dur * 60 * 1000);
        const paymentTime = new Date(); // When payment actually succeeded

        // Calculate the earliest transfer date based on BOTH requirements:
        // 1. At least 24h after appointment ends (customer complaint window)
        // 2. At least 7 days after payment succeeds (regulatory compliance)
        const minimumTransferDate = new Date(appointmentEnd.getTime() + 24 * 60 * 60 * 1000);
        const paymentAgeBasedTransferDate = new Date(
          paymentTime.getTime() + 7 * 24 * 60 * 60 * 1000,
        );

        // Use the LATER of the two dates
        recalculatedTransferTime = new Date(
          Math.max(minimumTransferDate.getTime(), paymentAgeBasedTransferDate.getTime()),
        );
        recalculatedTransferTime.setHours(4, 0, 0, 0);

        console.log('🔄 Recalculated Multibanco transfer schedule:', {
          paymentTime: paymentTime.toISOString(),
          appointmentStart: appointmentStart.toISOString(),
          appointmentEnd: appointmentEnd.toISOString(),
          minimumTransferDate: minimumTransferDate.toISOString(),
          paymentAgeBasedTransferDate: paymentAgeBasedTransferDate.toISOString(),
          recalculatedTransferTime: recalculatedTransferTime.toISOString(),
          hoursAfterAppointmentEnd: Math.floor(
            (recalculatedTransferTime.getTime() - appointmentEnd.getTime()) / (60 * 60 * 1000),
          ),
          daysFromPayment: Math.floor(
            (recalculatedTransferTime.getTime() - paymentTime.getTime()) / (24 * 60 * 60 * 1000),
          ),
        });

        // 🔒 IDEMPOTENCY CHECK: Skip conflict detection if this payment was already processed.
        // However, do NOT return early if prior processing was incomplete (missing calendar
        // or transfer not promoted to READY). This lets retried webhooks repair partial failures.
        const existingSuccessfulMeeting = await db.query.MeetingTable.findFirst({
          where: and(
            eq(MeetingTable.stripePaymentIntentId, paymentIntent.id),
            eq(MeetingTable.stripePaymentStatus, 'succeeded'),
          ),
        });

        if (existingSuccessfulMeeting) {
          const existingTransfer = await db.query.PaymentTransferTable.findFirst({
            where: eq(PaymentTransferTable.paymentIntentId, paymentIntent.id),
          });

          const isFullyProcessed =
            !!existingSuccessfulMeeting.meetingUrl &&
            !!existingTransfer &&
            existingTransfer.status !== PAYMENT_TRANSFER_STATUS_PENDING;

          if (isFullyProcessed) {
            console.log(
              `⏭️ Skipping fully processed payment ${paymentIntent.id} for meeting ${existingSuccessfulMeeting.id}`,
            );
            return;
          }

          // Payment succeeded before but side effects are incomplete -- skip conflict
          // checks (already validated) and fall through to repair calendar/transfer/notifications
          console.log(
            `🔄 Payment ${paymentIntent.id} succeeded but side effects incomplete, repairing:`,
            {
              meetingId: existingSuccessfulMeeting.id,
              hasMeetingUrl: !!existingSuccessfulMeeting.meetingUrl,
              transferStatus: existingTransfer?.status ?? 'missing',
            },
          );
        }

        // Check for conflicts (blocked dates, overlaps, minimum notice)
        // Only perform conflict check if we have valid duration data
        const conflictResult = await checkAppointmentConflict(
          meetingData.expert,
          appointmentStart,
          meetingData.id,
        );

        if (conflictResult.hasConflict) {
          console.log(`🚨 Late Multibanco payment conflict detected for PI ${paymentIntent.id}`);

          // Map conflict reason to allowed conflictType values
          let conflictType:
            | 'expert_blocked_date'
            | 'time_range_overlap'
            | 'minimum_notice_violation'
            | 'unknown_conflict';

          if (conflictResult.reason === 'expert_blocked_date') {
            conflictType = 'expert_blocked_date';
          } else if (conflictResult.reason === 'time_range_overlap') {
            conflictType = 'time_range_overlap';
          } else if (conflictResult.reason === 'minimum_notice_violation') {
            conflictType = 'minimum_notice_violation';
          } else {
            conflictType = 'unknown_conflict';
          }

          const refund = await processPartialRefund(
            paymentIntent,
            conflictResult.reason === 'expert_blocked_date'
              ? 'Expert blocked this date after your booking was made'
              : 'Appointment time slot no longer available due to late payment',
            conflictType,
          );

          if (refund) {
            // Get expert's name for notification
            const expertUser = await db.query.UserTable.findFirst({
              where: eq(UserTable.clerkUserId, meetingData.expert),
              columns: { firstName: true, lastName: true },
            });

            const expertName = expertUser
              ? `${expertUser.firstName || ''} ${expertUser.lastName || ''}`.trim() || 'Expert'
              : 'Expert';

            // Notify customer about the conflict with branded email
            await notifyAppointmentConflict(
              meetingData.guest,
              meetingData.guestName || 'Guest',
              expertName,
              appointmentStart,
              refund.amount,
              paymentIntent.amount,
              extractLocaleFromPaymentIntent(paymentIntent),
              conflictResult.reason || 'unknown_conflict',
              conflictResult.minimumNoticeHours,
              undefined, // serviceName - will be fetched if needed
              paymentIntent.id, // transactionId for reference
            );

            console.log(
              `✅ Conflict handled: 100% refund processed for PI ${paymentIntent.id} (v3.0 Customer-First policy)`,
            );

            // Mark the meeting as refunded and return early
            await db
              .update(MeetingTable)
              .set({
                stripePaymentStatus: 'refunded',
                updatedAt: new Date(),
              })
              .where(eq(MeetingTable.stripePaymentIntentId, paymentIntent.id));

            return; // Exit early - don't create calendar event or proceed with normal flow
          }
        } else {
          console.log(`✅ Multibanco payment ${paymentIntent.id} processed without conflicts`);
        }
      } // End of valid duration check
    } // End of Multibanco payment check

    // If no conflict or not a Multibanco payment, proceed with normal flow
    // Update Meeting status
    const updatedMeeting = await db
      .update(MeetingTable)
      .set({
        stripePaymentStatus: 'succeeded',
        stripeAmount: resolvedAmounts.grossAmount,
        stripeApplicationFeeAmount: resolvedAmounts.platformFeeAmount,
        updatedAt: new Date(),
      })
      .where(eq(MeetingTable.stripePaymentIntentId, paymentIntent.id))
      .returning();

    // Track the meeting from either path for email/transfer processing
    let meeting: (typeof updatedMeeting)[0] | null = null;

    if (updatedMeeting.length === 0) {
      console.warn(
        `No meeting found with paymentIntentId ${paymentIntent.id} to update status to succeeded.`,
      );

      // 🔧 Fallback: Try to find meeting by eventId + startTime + guestEmail from metadata
      // The metadata.meeting.id is the eventId (service type), NOT the meeting's primary key
      // Only sets stripePaymentIntentId if it's currently null to avoid overwriting existing IDs
      if (meetingData.id && meetingData.start && meetingData.guest) {
        console.log(`🔄 Attempting fallback lookup by eventId + startTime + guestEmail:`, {
          eventId: meetingData.id,
          startTime: meetingData.start,
          guestEmail: meetingData.guest,
        });

        // Parse the start time from metadata
        const startTimeFromMetadata = new Date(meetingData.start);

        // First, try to update meetings where stripePaymentIntentId IS NULL
        // This safely sets the paymentIntentId without overwriting any existing value
        const fallbackUpdate = await db
          .update(MeetingTable)
          .set({
            stripePaymentIntentId: paymentIntent.id, // Only set if WHERE clause passes
            stripePaymentStatus: 'succeeded',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(MeetingTable.eventId, meetingData.id),
              eq(MeetingTable.startTime, startTimeFromMetadata),
              eq(MeetingTable.guestEmail, meetingData.guest),
              isNull(MeetingTable.stripePaymentIntentId), // Guard: only update if null
            ),
          )
          .returning();

        if (fallbackUpdate.length > 0) {
          console.log(
            `✅ Fallback successful: Meeting ${fallbackUpdate[0].id} (eventId: ${meetingData.id}) updated with paymentIntentId ${paymentIntent.id}`,
          );
          meeting = fallbackUpdate[0];
          // Proceed with calendar creation for the found meeting
          if (!meeting.meetingUrl) {
            await createDeferredCalendarEvent(meeting, paymentIntent);
          }
        } else {
          // Meeting might already have a different paymentIntentId - just update status
          console.log(
            `🔄 Meeting with eventId ${meetingData.id} may already have paymentIntentId, updating status only...`,
          );
          const statusOnlyUpdate = await db
            .update(MeetingTable)
            .set({
              stripePaymentStatus: 'succeeded',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(MeetingTable.eventId, meetingData.id),
                eq(MeetingTable.startTime, startTimeFromMetadata),
                eq(MeetingTable.guestEmail, meetingData.guest),
              ),
            )
            .returning();

          if (statusOnlyUpdate.length > 0) {
            console.log(`✅ Status-only update successful for meeting ${statusOnlyUpdate[0].id}`);
            meeting = statusOnlyUpdate[0];
            if (!meeting.meetingUrl) {
              await createDeferredCalendarEvent(meeting, paymentIntent);
            }
          } else {
            console.warn(
              `❌ Fallback failed: No meeting found with eventId ${meetingData.id}, startTime ${meetingData.start}, guestEmail ${meetingData.guest}`,
            );
          }
        }
      }
    } else {
      meeting = updatedMeeting[0];
      console.log(
        `Meeting ${meeting.id} status updated to succeeded for paymentIntentId ${paymentIntent.id}`,
      );

      // If meeting doesn't have a meeting URL yet (was created with pending payment), create calendar event now
      if (!meeting.meetingUrl) {
        await createDeferredCalendarEvent(meeting, paymentIntent);
      } else {
        console.log(`✅ Meeting ${meeting.id} already has a meeting URL: ${meeting.meetingUrl}`);
      }
    }

    // Continue with transfer and email processing regardless of which path was used
    if (meeting) {
      // Find the payment transfer record
      const transfer = await db.query.PaymentTransferTable.findFirst({
        where: eq(PaymentTransferTable.paymentIntentId, paymentIntent.id),
      });

      // Handle transfer status update
      if (!transfer) {
        // If no transfer record exists, create one from the payment intent metadata
        const transferData = parseMetadata(paymentIntent.metadata?.transfer, {
          status: PAYMENT_TRANSFER_STATUS_PENDING,
          account: '',
          country: '',
          delay: { aging: 0, remaining: 0, required: 0 },
          scheduled: '',
        });

        // Validate critical fields before creating transfer record
        if (transferData && paymentData && meeting) {
          // Validate transfer data
          if (!transferData.account) {
            console.error(
              `Missing expert connect account ID in transfer metadata for PI ${paymentIntent.id}`,
            );
            return;
          }

          if (!transferData.scheduled) {
            console.error(
              `Missing scheduled transfer time in transfer metadata for PI ${paymentIntent.id}`,
            );
            return;
          }

          // Validate payment amounts
          const amount = resolvedAmounts.expertAmount;
          const fee = resolvedAmounts.platformFeeAmount;

          if (Number.isNaN(amount) || amount <= 0) {
            console.error(
              `Invalid expert payment amount in metadata for PI ${paymentIntent.id}: ${paymentData.expert}`,
            );
            return;
          }

          if (Number.isNaN(fee) || fee < 0) {
            console.error(
              `Invalid platform fee in metadata for PI ${paymentIntent.id}: ${paymentData.fee}`,
            );
            return;
          }

          // Validate scheduled transfer time
          // 🆕 CRITICAL FIX: For Multibanco, use recalculated time if available
          const originalScheduledTime = new Date(transferData.scheduled);
          const scheduledTime = recalculatedTransferTime || originalScheduledTime;

          if (Number.isNaN(scheduledTime.getTime())) {
            console.error(
              `Invalid scheduled transfer time in metadata for PI ${paymentIntent.id}: ${transferData.scheduled}`,
            );
            return;
          }

          if (recalculatedTransferTime) {
            console.log(`✅ Using recalculated transfer time for Multibanco payment:`, {
              original: originalScheduledTime.toISOString(),
              recalculated: recalculatedTransferTime.toISOString(),
              diffHours: Math.floor(
                (recalculatedTransferTime.getTime() - originalScheduledTime.getTime()) /
                  (60 * 60 * 1000),
              ),
            });
          }

          // All validations passed, create transfer record.
          // Resolve the canonical Checkout Session id so this row collates with
          // any row that handleCheckoutSession may insert. Order of preference:
          //  1. session_id stamped on PI metadata at checkout-creation time
          //  2. live lookup via Stripe (handles the case where the post-create
          //     metadata patch failed)
          //  3. synthetic `pi_…` fallback (last resort; preserves uniqueness)
          let resolvedCheckoutSessionId: string;
          if (paymentIntent.metadata?.session_id) {
            resolvedCheckoutSessionId = paymentIntent.metadata.session_id;
          } else {
            try {
              const sessions = await stripe.checkout.sessions.list({
                payment_intent: paymentIntent.id,
                limit: 1,
              });
              resolvedCheckoutSessionId = sessions.data[0]?.id ?? `pi_${paymentIntent.id}`;
              if (sessions.data[0]?.id) {
                console.log(
                  `🔗 Resolved checkout session ${sessions.data[0].id} for PI ${paymentIntent.id} via Stripe lookup`,
                );
              } else {
                console.warn(
                  `⚠️ No checkout session found for PI ${paymentIntent.id}; falling back to synthetic id`,
                );
              }
            } catch (lookupError) {
              console.error(
                `Failed to resolve checkout session for PI ${paymentIntent.id}, using synthetic id:`,
                lookupError,
              );
              resolvedCheckoutSessionId = `pi_${paymentIntent.id}`;
            }
          }

          const inserted = await db
            .insert(PaymentTransferTable)
            .values({
              paymentIntentId: paymentIntent.id,
              checkoutSessionId: resolvedCheckoutSessionId,
              eventId: meeting.eventId,
              expertConnectAccountId: transferData.account,
              expertClerkUserId: meeting.clerkUserId,
              amount: amount,
              platformFee: fee,
              currency: 'eur',
              sessionStartTime: meeting.startTime,
              scheduledTransferTime: scheduledTime,
              status: PAYMENT_TRANSFER_STATUS_READY,
              guestName: meetingData.guestName || null,
              guestEmail: meetingData.guest || null,
              guestPhone: meetingData.guestPhone || null,
              created: new Date(),
              updated: new Date(),
            })
            .onConflictDoNothing({ target: PaymentTransferTable.paymentIntentId })
            .returning({ id: PaymentTransferTable.id });

          if (inserted.length > 0) {
            console.log(`Created new transfer record for payment ${paymentIntent.id}`);
          } else {
            console.log(
              `Transfer record already exists for payment ${paymentIntent.id} (conflict ignored)`,
            );
          }
        } else {
          console.error(
            `Missing required metadata for creating transfer record for PI ${paymentIntent.id}. Transfer Data: ${!!transferData}, Payment Data: ${!!paymentData}, Meeting: ${!!meeting}`,
          );
        }
      } else if (transfer.status === PAYMENT_TRANSFER_STATUS_PENDING) {
        // Update transfer status to READY with retry logic
        await withRetry(
          async () => {
            await db
              .update(PaymentTransferTable)
              .set({
                status: PAYMENT_TRANSFER_STATUS_READY,
                updated: new Date(),
              })
              .where(eq(PaymentTransferTable.id, transfer.id));
          },
          3,
          1000,
        );
        console.log(`Transfer record ${transfer.id} status updated to READY.`);

        // Update the destination_payment charge description so the expert can
        // identify the customer in their Stripe Express Dashboard. Reuses the
        // `latestCharge` we already retrieved (with `transfer` expanded) at the
        // top of this handler, avoiding the legacy `charges.list` + extra
        // `transfers.retrieve` round-trips.
        try {
          const stripeTransfer =
            latestCharge?.transfer && typeof latestCharge.transfer !== 'string'
              ? latestCharge.transfer
              : null;

          if (stripeTransfer?.destination_payment) {
            const destinationPaymentId =
              typeof stripeTransfer.destination_payment === 'string'
                ? stripeTransfer.destination_payment
                : stripeTransfer.destination_payment.id;

            const guestName = meetingData.guestName || meetingData.guest || 'Customer';
            const appointmentDate = new Date(meetingData.start).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            });

            await stripe.charges.update(
              destinationPaymentId,
              { description: `Session with ${guestName} - ${appointmentDate}` },
              { stripeAccount: transfer.expertConnectAccountId },
            );
            console.log(
              `✅ Updated destination payment description for expert ${transfer.expertConnectAccountId}`,
            );
          } else if (latestCharge && !stripeTransfer) {
            // Charge exists but transfer wasn't expanded or doesn't exist yet;
            // skip silently — this can happen on legacy events.
            console.log(
              `ℹ️ No expanded transfer on latest charge for PI ${paymentIntent.id}; skipping description update`,
            );
          }
        } catch (descError) {
          console.warn('⚠️ Could not update destination payment description:', {
            paymentIntentId: paymentIntent.id,
            error: descError instanceof Error ? descError.message : descError,
          });
        }

        // Trigger Novu marketplace workflow for expert payment notification
        // Note: Removed notifyExpertOfPaymentSuccess() as it incorrectly sent welcome emails
        try {
          const user = await db.query.UserTable.findFirst({
            where: eq(UserTable.clerkUserId, transfer.expertClerkUserId),
            columns: { clerkUserId: true, firstName: true, lastName: true, email: true },
          });

          if (user) {
            const sessionDate = format(meeting.startTime, 'EEEE, MMMM d, yyyy');
            const amount = (transfer.amount / 100).toFixed(2); // Convert cents to euros

            const payload = {
              eventType: 'payment-received' as const,
              amount,
              clientName: meeting.guestName || 'Client',
              sessionDate,
              transactionId: paymentIntent.id,
              dashboardUrl: '/account/billing',
              expertName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Expert',
              message: `Payment of €${amount} received for session on ${sessionDate}`,
            };

            await triggerWorkflow({
              workflowId: 'marketplace-universal',
              to: {
                subscriberId: user.clerkUserId,
                email: user.email || 'no-email@eleva.care',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                data: {
                  paymentIntentId: paymentIntent.id,
                  role: 'expert',
                },
              },
              payload,
              actor: {
                subscriberId: 'system',
                data: {
                  source: 'stripe-webhook',
                  paymentIntentId: paymentIntent.id,
                  timestamp: new Date().toISOString(),
                },
              },
            });
            console.log('✅ Marketplace payment notification sent via Novu');
          }
        } catch (novuError) {
          console.error('❌ Failed to trigger marketplace payment notification:', novuError);
          // Don't fail the entire webhook for Novu errors
        }
      } else {
        console.log(
          `Transfer record ${transfer.id} already in status ${transfer.status}, not updating to READY.`,
        );
      }

      // Send email notification to the guest
      if (meeting) {
        const meetingDetails = await db.query.MeetingTable.findFirst({
          where: eq(MeetingTable.stripePaymentIntentId, paymentIntent.id),
          with: {
            event: {
              columns: {
                name: true,
                durationInMinutes: true,
              },
            },
          },
        });

        // Fetch user details separately since there's no user relation on MeetingTable
        const userDetails = meetingDetails
          ? await db.query.UserTable.findFirst({
              where: eq(UserTable.clerkUserId, meetingDetails.clerkUserId),
              columns: {
                firstName: true,
                lastName: true,
              },
            })
          : null;

        if (meetingDetails?.event && userDetails) {
          const guestEmail = meetingDetails.guestEmail;
          const guestName = meetingDetails.guestName ?? 'Guest';
          const expertName =
            `${userDetails.firstName ?? ''} ${userDetails.lastName ?? ''}`.trim() || 'Our Expert';
          const eventName = meetingDetails.event.name;
          const meetingStartTime = meetingDetails.startTime; // Date object
          const meetingTimezone = meetingDetails.timezone || 'UTC'; // Default to UTC if not set
          const durationMinutes = meetingDetails.event.durationInMinutes;

          // Format date and time for the email
          const zonedStartTime = toZonedTime(meetingStartTime, meetingTimezone);
          const appointmentDate = format(zonedStartTime, 'EEEE, MMMM d, yyyy', {
            timeZone: meetingTimezone,
          });
          const startTimeFormatted = format(zonedStartTime, 'h:mm a', {
            timeZone: meetingTimezone,
          });

          const endTime = new Date(meetingStartTime.getTime() + durationMinutes * 60000);
          const zonedEndTime = toZonedTime(endTime, meetingTimezone);
          const endTimeFormatted = format(zonedEndTime, 'h:mm a', { timeZone: meetingTimezone });

          const appointmentTime = `${startTimeFormatted} - ${endTimeFormatted} (${meetingTimezone})`;
          const appointmentDuration = `${durationMinutes} minutes`;

          try {
            console.log(`Attempting to trigger payment receipt via Novu workflow to ${guestEmail}`);
            const locale = extractLocaleFromPaymentIntent(paymentIntent);
            const amount = (paymentIntent.amount / 100).toFixed(2);
            const currency = paymentIntent.currency?.toUpperCase() || 'EUR';

            // Friendly payment-method label so the receipt email shows e.g.
            // "MB WAY" instead of leaving the row hidden.
            const paymentMethod = friendlyPaymentMethod(paymentIntent.payment_method_types);

            // Best-effort lookup of the Stripe receipt URL on the charge
            // (PI webhook doesn't expand latest_charge). Failures here are
            // non-fatal — the email's "Download Receipt" button is hidden
            // when receiptUrl is missing.
            let receiptUrl: string | undefined;
            const latestChargeId =
              typeof paymentIntent.latest_charge === 'string'
                ? paymentIntent.latest_charge
                : undefined;
            if (latestChargeId) {
              try {
                const charge = await stripe.charges.retrieve(latestChargeId);
                receiptUrl = charge.receipt_url ?? undefined;
              } catch (chargeError) {
                console.warn(
                  `Could not retrieve charge ${latestChargeId} for receipt URL:`,
                  chargeError,
                );
              }
            }

            // The Google Meet link lives on MeetingTable.meetingUrl; surface
            // it as the "Join Appointment" CTA in the receipt email.
            const appointmentUrl = meetingDetails.meetingUrl ?? undefined;

            // Trigger payment confirmation via Novu workflow for activity tracking
            const paymentResult = await triggerWorkflow({
              workflowId: 'payment-universal',
              to: {
                subscriberId: guestEmail, // Use email as subscriber ID for guests
                email: guestEmail,
                firstName: guestName.split(' ')[0],
                lastName: guestName.split(' ').slice(1).join(' ') || undefined,
              },
              payload: {
                eventType: 'success',
                amount: `${amount}`,
                currency,
                customerName: guestName,
                transactionId: paymentIntent.id,
                paymentMethod,
                appointmentUrl,
                receiptUrl,
                // Include basic appointment reference (full details come from calendar email)
                appointmentDetails: {
                  service: eventName,
                  expert: expertName,
                  date: appointmentDate,
                  time: appointmentTime,
                  duration: appointmentDuration,
                },
                locale,
                userSegment: 'patient',
              },
              transactionId: `payment-receipt-${paymentIntent.id}`,
            });

            if (paymentResult) {
              console.log(
                `Payment receipt notification triggered via Novu for ${guestEmail}, PI: ${paymentIntent.id}`,
              );
            } else {
              console.error(
                `Failed to trigger payment receipt notification via Novu for ${guestEmail}, PI: ${paymentIntent.id}`,
              );
            }
          } catch (emailError) {
            console.error(
              `Failed to trigger payment receipt notification for ${guestEmail} for PI ${paymentIntent.id}:`,
              emailError,
            );
            // Do not fail the entire webhook for notification error
          }
        } else {
          console.warn(
            `Could not retrieve all necessary details for PI ${paymentIntent.id} to send guest confirmation email. Meeting Details: ${!!meetingDetails}, Event: ${!!meetingDetails?.event}, User: ${!!userDetails}`,
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error in handlePaymentSucceeded for paymentIntent ${paymentIntent.id}:`, error);
    throw error;
  }
}

export async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);
  const lastPaymentError = paymentIntent.last_payment_error?.message || 'Unknown reason';

  try {
    // Update Meeting status
    const updatedMeetings = await db
      .update(MeetingTable)
      .set({
        stripePaymentStatus: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(MeetingTable.stripePaymentIntentId, paymentIntent.id))
      .returning({
        id: MeetingTable.id,
        clerkUserId: MeetingTable.clerkUserId, // expert's clerkId
        guestEmail: MeetingTable.guestEmail,
        guestName: MeetingTable.guestName,
        startTime: MeetingTable.startTime,
        timezone: MeetingTable.timezone,
        meetingUrl: MeetingTable.meetingUrl,
        guestNotes: MeetingTable.guestNotes,
        eventId: MeetingTable.eventId,
      });

    const meetingDetails = updatedMeetings.length > 0 ? updatedMeetings[0] : null;

    if (!meetingDetails) {
      console.warn(
        `No meeting found with paymentIntentId ${paymentIntent.id} to update status to failed. Proceeding with transfer update if applicable.`,
      );
    } else {
      console.log(
        `Meeting ${meetingDetails.id} status updated to failed for paymentIntentId ${paymentIntent.id}`,
      );

      // Log Audit Event for meeting payment failure
      try {
        // const headersList = headers(); // Cannot use headers() in this context directly, not a NextApiRequest
        await logAuditEvent(
          meetingDetails.clerkUserId, // Expert's clerkId as the user associated with the event being impacted
          'MEETING_PAYMENT_FAILED',
          'meeting',
          meetingDetails.id,
          null, // No oldValues for this specific type of event, or could include previous meeting status
          {
            meetingId: meetingDetails.id,
            paymentIntentId: paymentIntent.id,
            guestEmail: meetingDetails.guestEmail,
            expertId: meetingDetails.clerkUserId,
            failureReason: lastPaymentError,
          },
          'SYSTEM_WEBHOOK', // IP Address
          'Stripe Webhook', // User Agent
        );
      } catch (auditError) {
        console.error(
          `Error logging MEETING_PAYMENT_FAILED audit event for meeting ${meetingDetails.id}:`,
          auditError,
        );
      }
    }

    // Find the payment transfer record
    const transfer = await db.query.PaymentTransferTable.findFirst({
      where: eq(PaymentTransferTable.paymentIntentId, paymentIntent.id),
    });

    if (!transfer) {
      console.error(
        'No transfer record found for failed payment:',
        paymentIntent.id,
        'This might be normal if the meeting was free or if transfer record creation failed earlier.',
      );
      // If meetingDetails exist, still try to notify guest
    } else if (
      transfer.status === PAYMENT_TRANSFER_STATUS_PENDING ||
      transfer.status === PAYMENT_TRANSFER_STATUS_READY
    ) {
      await withRetry(
        async () => {
          await db
            .update(PaymentTransferTable)
            .set({
              status: PAYMENT_TRANSFER_STATUS_FAILED,
              stripeErrorMessage: lastPaymentError, // Store the failure reason
              updated: new Date(),
            })
            .where(eq(PaymentTransferTable.id, transfer.id));
        },
        3,
        1000,
      );
      console.log(`Transfer record ${transfer.id} status updated to FAILED.`);

      // Notify the expert about the failed payment
      await notifyExpertOfPaymentFailure(
        transfer,
        paymentIntent.id,
        lastPaymentError,
        meetingDetails || undefined,
      );
    } else if (transfer) {
      console.log(
        `Transfer record ${transfer.id} already in status ${transfer.status}, not updating to FAILED.`,
      );
    }

    // Send email notification to the guest about cancellation
    if (meetingDetails) {
      const eventInfo = await db.query.EventTable.findFirst({
        where: eq(EventTable.id, meetingDetails.eventId),
        columns: { name: true, durationInMinutes: true },
      });

      const expertInfo = await db.query.UserTable.findFirst({
        where: eq(UserTable.clerkUserId, meetingDetails.clerkUserId),
        columns: { firstName: true, lastName: true },
      });

      if (eventInfo && expertInfo) {
        const guestEmail = meetingDetails.guestEmail;
        const guestName = meetingDetails.guestName ?? 'Guest';
        const expertName =
          `${expertInfo.firstName ?? ''} ${expertInfo.lastName ?? ''}`.trim() || 'Our Expert';
        const eventName = eventInfo.name;
        const meetingStartTime = meetingDetails.startTime;
        const meetingTimezone = meetingDetails.timezone || 'UTC';
        const durationMinutes = eventInfo.durationInMinutes;

        const zonedStartTime = toZonedTime(meetingStartTime, meetingTimezone);
        const appointmentDate = format(zonedStartTime, 'EEEE, MMMM d, yyyy', {
          timeZone: meetingTimezone,
        });
        const startTimeFormatted = format(zonedStartTime, 'h:mm a', { timeZone: meetingTimezone });
        const endTime = new Date(meetingStartTime.getTime() + durationMinutes * 60000);
        const zonedEndTime = toZonedTime(endTime, meetingTimezone);
        const endTimeFormatted = format(zonedEndTime, 'h:mm a', { timeZone: meetingTimezone });
        const appointmentTime = `${startTimeFormatted} - ${endTimeFormatted} (${meetingTimezone})`;
        const appointmentDuration = `${durationMinutes} minutes`;

        try {
          console.log(
            `Attempting to trigger payment failed notification via Novu to ${guestEmail}`,
          );
          const locale = extractLocaleFromPaymentIntent(paymentIntent);
          const amount = (paymentIntent.amount / 100).toFixed(2);
          const currency = paymentIntent.currency?.toUpperCase() || 'EUR';

          // Trigger payment failed notification via Novu workflow
          const failedResult = await triggerWorkflow({
            workflowId: 'payment-universal',
            to: {
              subscriberId: guestEmail, // Use email as subscriber ID for guests
              email: guestEmail,
              firstName: guestName.split(' ')[0],
              lastName: guestName.split(' ').slice(1).join(' ') || undefined,
            },
            payload: {
              eventType: 'failed',
              amount: `${amount}`,
              currency,
              customerName: guestName,
              transactionId: paymentIntent.id,
              message: `Your payment failed. Reason: ${lastPaymentError}. Please update your payment information and try booking again.`,
              appointmentDetails: {
                service: eventName,
                expert: expertName,
                date: appointmentDate,
                time: appointmentTime,
                duration: appointmentDuration,
              },
              locale,
              userSegment: 'patient',
            },
            transactionId: `payment-failed-${paymentIntent.id}`,
          });

          if (failedResult) {
            console.log(
              `Payment failed notification triggered via Novu for ${guestEmail}, PI: ${paymentIntent.id}`,
            );
          } else {
            console.error(
              `Failed to trigger payment failed notification via Novu for ${guestEmail}, PI: ${paymentIntent.id}`,
            );
          }
        } catch (emailError) {
          console.error(
            `Failed to trigger payment failed notification for ${guestEmail} for PI ${paymentIntent.id}:`,
            emailError,
          );
        }
      } else {
        console.warn(
          `Could not retrieve full event/expert details for meeting ${meetingDetails.id} to send guest cancellation email. Event: ${!!eventInfo}, Expert: ${!!expertInfo}`,
        );
      }
    }
  } catch (error) {
    console.error(`Error in handlePaymentFailed for paymentIntent ${paymentIntent.id}:`, error);
  }
}

/**
 * Handle a refunded pack purchase.
 *
 * Marks the local PackPurchaseTable row as cancelled and deactivates the
 * associated Stripe promotion code so the customer can no longer redeem
 * remaining sessions after being refunded. The coupon itself is left in
 * place — Stripe doesn't allow deleting coupons that have ever been used.
 *
 * Idempotent: re-runs see the row is already in `cancelled` state and exit
 * cleanly. Promotion-code deactivation is also idempotent on Stripe's side.
 */
async function handleRefundedPackPurchase(paymentIntentId: string): Promise<boolean> {
  const pack = await db.query.PackPurchaseTable.findFirst({
    where: eq(PackPurchaseTable.stripePaymentIntentId, paymentIntentId),
  });

  if (!pack) return false;

  if (pack.status === 'cancelled') {
    console.log(`📦 Pack purchase ${pack.id} already cancelled — skipping.`);
    return true;
  }

  // 1) Mark the local pack as cancelled (the existing enum doesn't have
  //    a 'refunded' value; 'cancelled' carries the same semantic — no
  //    further redemptions allowed — and avoids a migration here).
  await db
    .update(PackPurchaseTable)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(PackPurchaseTable.id, pack.id));

  console.log(
    `📦 Pack purchase ${pack.id} marked cancelled (PI: ${paymentIntentId}, redemptions used: ${pack.redemptionsUsed}/${pack.maxRedemptions}).`,
  );

  // 2) Deactivate the Stripe promotion code so the buyer cannot redeem
  //    remaining sessions. We deactivate (not delete) for audit history.
  if (pack.stripePromotionCodeId) {
    try {
      await stripe.promotionCodes.update(pack.stripePromotionCodeId, { active: false });
      console.log(
        `🎟️ Deactivated promotion code ${pack.stripePromotionCodeId} for refunded pack ${pack.id}.`,
      );
    } catch (promoError) {
      console.error(
        `Failed to deactivate promotion code ${pack.stripePromotionCodeId} for refunded pack ${pack.id}:`,
        promoError,
      );
      // Don't throw — we want the rest of the refund flow to complete.
    }
  } else {
    console.warn(
      `Pack purchase ${pack.id} has no stripePromotionCodeId — cannot deactivate promo code.`,
    );
  }

  return true;
}

export async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log('Payment refunded:', charge.id);

  // Find the payment transfer record using the payment intent ID
  const paymentIntentId = charge.payment_intent;
  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    console.error('No payment_intent ID found on charge object:', charge.id);
    return;
  }

  try {
    // 1) Try the pack-purchase path first. If this PI corresponds to a pack,
    //    the meeting/transfer paths below will be no-ops (no row to update).
    const handledAsPack = await handleRefundedPackPurchase(paymentIntentId);

    // 2) Update Meeting status (idempotent — only updates rows still at
    //    'succeeded' so reruns don't churn updatedAt). For pack refunds
    //    this WHERE clause matches zero rows, which is the correct no-op.
    const updatedMeeting = await db
      .update(MeetingTable)
      .set({
        stripePaymentStatus: 'refunded',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(MeetingTable.stripePaymentIntentId, paymentIntentId),
          eq(MeetingTable.stripePaymentStatus, 'succeeded'),
        ),
      )
      .returning();

    if (updatedMeeting.length === 0 && !handledAsPack) {
      console.warn(
        `No meeting or pack purchase found with paymentIntentId ${paymentIntentId} to mark as refunded.`,
      );
    } else if (updatedMeeting.length > 0) {
      console.log(
        `Meeting ${updatedMeeting[0].id} status updated to refunded for paymentIntentId ${paymentIntentId}`,
      );
    }

    // Find and update the payment transfer record (idempotent guard)
    const transfer = await db.query.PaymentTransferTable.findFirst({
      where: eq(PaymentTransferTable.paymentIntentId, paymentIntentId),
    });

    if (!transfer) {
      if (!handledAsPack) {
        console.error(
          'No transfer record found for refunded payment:',
          paymentIntentId,
          'This might be normal if the meeting was free or if transfer record creation failed earlier.',
        );
      }
      return; // Pack handled (no transfer expected) or genuinely missing.
    }

    if (transfer.status !== PAYMENT_TRANSFER_STATUS_REFUNDED) {
      await db
        .update(PaymentTransferTable)
        .set({
          status: PAYMENT_TRANSFER_STATUS_REFUNDED,
          updated: new Date(),
        })
        .where(eq(PaymentTransferTable.id, transfer.id));
      console.log(`Transfer record ${transfer.id} status updated to REFUNDED.`);

      // Notify the expert about the refund (only on first transition)
      await notifyExpertOfPaymentRefund(transfer);
    } else {
      console.log(`Transfer record ${transfer.id} already REFUNDED — skipping notification.`);
    }
  } catch (error) {
    console.error(
      `Error in handleChargeRefunded for charge ${charge.id} (PI: ${paymentIntentId}):`,
      error,
    );
  }
}

/**
 * Handle a Stripe refund.updated event.
 *
 * Refunds aren't always synchronous: bank-account refunds can fail or be
 * canceled days after creation. When that happens, our DB optimistically
 * marked the meeting as `refunded` (via charge.refunded), but the money
 * never actually moved back to the customer. We need to reverse those local
 * state changes so the meeting is honoured again and the expert gets paid.
 *
 * For `succeeded` we no-op (charge.refunded already handled the success path).
 */
export async function handleRefundUpdated(refund: Stripe.Refund) {
  const refundId = refund.id;
  const refundStatus = refund.status;
  const paymentIntentId =
    typeof refund.payment_intent === 'string'
      ? refund.payment_intent
      : (refund.payment_intent as Stripe.PaymentIntent | null)?.id;

  console.log('Refund updated:', { refundId, status: refundStatus, paymentIntentId });

  if (!paymentIntentId) {
    console.warn(`Refund ${refundId} has no payment_intent — cannot reverse DB state.`);
    return;
  }

  // We only need to act when a refund is reversed (failed / canceled).
  // succeeded / pending / requires_action don't change our optimistic DB.
  if (refundStatus !== 'failed' && refundStatus !== 'canceled') {
    return;
  }

  console.warn(
    `🛑 Refund ${refundId} for PI ${paymentIntentId} ended in status "${refundStatus}". Reverting local refunded state.`,
  );

  try {
    // 1) Restore the meeting from 'refunded' back to 'succeeded' (idempotent
    //    via the eq guard on stripePaymentStatus).
    const restoredMeetings = await db
      .update(MeetingTable)
      .set({ stripePaymentStatus: 'succeeded', updatedAt: new Date() })
      .where(
        and(
          eq(MeetingTable.stripePaymentIntentId, paymentIntentId),
          eq(MeetingTable.stripePaymentStatus, 'refunded'),
        ),
      )
      .returning({ id: MeetingTable.id });
    if (restoredMeetings.length > 0) {
      console.log(
        `↩️ Restored meeting ${restoredMeetings[0].id} to 'succeeded' after failed refund ${refundId}.`,
      );
    }

    // 2) Restore the PaymentTransfer row to PENDING so the payout cron can
    //    re-pick it up. Only flip rows currently REFUNDED.
    const restoredTransfers = await db
      .update(PaymentTransferTable)
      .set({ status: PAYMENT_TRANSFER_STATUS_PENDING, updated: new Date() })
      .where(
        and(
          eq(PaymentTransferTable.paymentIntentId, paymentIntentId),
          eq(PaymentTransferTable.status, PAYMENT_TRANSFER_STATUS_REFUNDED),
        ),
      )
      .returning({ id: PaymentTransferTable.id });
    if (restoredTransfers.length > 0) {
      console.log(
        `↩️ Restored payment transfer ${restoredTransfers[0].id} to PENDING after failed refund ${refundId}.`,
      );
    }

    // 3) Restore pack purchase: undo the cancelled status and re-activate
    //    the Stripe promotion code so the buyer can redeem again.
    const cancelledPack = await db.query.PackPurchaseTable.findFirst({
      where: and(
        eq(PackPurchaseTable.stripePaymentIntentId, paymentIntentId),
        eq(PackPurchaseTable.status, 'cancelled'),
      ),
    });
    if (cancelledPack) {
      // Restore based on remaining redemptions
      const newStatus =
        cancelledPack.redemptionsUsed >= cancelledPack.maxRedemptions ? 'fully_redeemed' : 'active';

      await db
        .update(PackPurchaseTable)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(PackPurchaseTable.id, cancelledPack.id));
      console.log(
        `↩️ Restored pack purchase ${cancelledPack.id} to '${newStatus}' after failed refund ${refundId}.`,
      );

      if (cancelledPack.stripePromotionCodeId && newStatus === 'active') {
        try {
          await stripe.promotionCodes.update(cancelledPack.stripePromotionCodeId, {
            active: true,
          });
          console.log(
            `🎟️ Re-activated promotion code ${cancelledPack.stripePromotionCodeId} after failed refund.`,
          );
        } catch (promoError) {
          console.error(
            `Failed to re-activate promotion code ${cancelledPack.stripePromotionCodeId} after failed refund:`,
            promoError,
          );
        }
      }
    }
  } catch (error) {
    console.error(
      `Error in handleRefundUpdated for refund ${refundId} (PI: ${paymentIntentId}, status: ${refundStatus}):`,
      error,
    );
  }
}

export async function handleDisputeCreated(dispute: Stripe.Dispute) {
  console.log('Dispute created:', dispute.id);
  const paymentIntentId = dispute.payment_intent;

  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    console.error('No payment_intent ID found on dispute object:', dispute.id);
    return;
  }

  try {
    // Note: Meeting status is typically not directly changed to 'disputed'.
    // The existing payment status ('succeeded', 'refunded') often remains.
    // A dispute is a separate process on top of the payment.
    // So, we primarily update the transfer record.

    // Find and update the payment transfer record
    const transfer = await db.query.PaymentTransferTable.findFirst({
      where: eq(PaymentTransferTable.paymentIntentId, paymentIntentId),
    });

    if (!transfer) {
      console.error('No transfer record found for disputed payment:', paymentIntentId);
      return;
    }

    // Update transfer status
    await db
      .update(PaymentTransferTable)
      .set({
        status: PAYMENT_TRANSFER_STATUS_DISPUTED, // Ensure this matches PaymentTransferTable schema/enum
        updated: new Date(),
      })
      .where(eq(PaymentTransferTable.id, transfer.id));
    console.log(`Transfer record ${transfer.id} status updated to DISPUTED.`);

    // Create notification for the expert
    await notifyExpertOfPaymentDispute(transfer);
  } catch (error) {
    console.error(
      `Error in handleDisputeCreated for dispute ${dispute.id} (PI: ${paymentIntentId}):`,
      error,
    );
  }
}

export async function handlePaymentIntentRequiresAction(paymentIntent: Stripe.PaymentIntent) {
  console.log(
    `Payment intent ${paymentIntent.id} requires action. Status: ${paymentIntent.status}`,
  );

  if (
    paymentIntent.next_action?.type === 'multibanco_display_details' &&
    ((typeof paymentIntent.payment_method === 'object' &&
      paymentIntent.payment_method?.type === 'multibanco') ||
      typeof paymentIntent.payment_method === 'string')
  ) {
    const multibancoDetails = paymentIntent.next_action.multibanco_display_details;
    const voucherExpiresAtTimestamp = multibancoDetails?.expires_at;

    if (voucherExpiresAtTimestamp && paymentIntent.metadata) {
      // Calculate expiration date from timestamp
      const voucherExpiresAt = new Date(voucherExpiresAtTimestamp * 1000);

      console.log(
        `Multibanco voucher created for ${paymentIntent.id}, expires at: ${voucherExpiresAt.toISOString()}`,
      );

      // Create slot reservation for Multibanco payments
      try {
        // Parse meeting metadata - can be nested JSON (new format) or flat fields (legacy)
        let eventId: string | undefined;
        let clerkUserId: string | undefined;
        let selectedDate: string | undefined;
        let selectedTime: string | undefined;
        let customerEmail: string | undefined;
        let customerName: string | undefined;
        let customerNotes: string | undefined;
        let expertName: string | undefined;
        let timezone: string = 'Europe/Lisbon';
        let guestName: string | undefined;

        // Check if metadata uses new nested JSON format (meeting, payment, transfer)
        if (paymentIntent.metadata.meeting) {
          try {
            const meetingData = JSON.parse(paymentIntent.metadata.meeting) as {
              id?: string;
              expert?: string;
              guest?: string;
              guestName?: string;
              guestPhone?: string;
              start?: string;
              dur?: number;
              notes?: string;
              timezone?: string;
              locale?: string;
            };

            eventId = meetingData.id;
            clerkUserId = meetingData.expert;
            customerEmail = meetingData.guest;
            guestName = meetingData.guestName;
            customerNotes = meetingData.notes;
            timezone = meetingData.timezone || 'Europe/Lisbon';

            // Parse start time from ISO string
            if (meetingData.start) {
              const startDate = new Date(meetingData.start);
              selectedDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
              selectedTime = startDate.toISOString().split('T')[1]?.split('.')[0]; // HH:mm:ss
            }

            console.log('📦 Parsed meeting metadata (nested JSON format):', {
              eventId,
              clerkUserId,
              customerEmail,
              guestName,
              selectedDate,
              selectedTime,
              timezone,
            });
          } catch (parseError) {
            console.error('Failed to parse meeting metadata JSON:', parseError);
          }
        } else {
          // Legacy flat metadata format
          eventId = paymentIntent.metadata.eventId;
          clerkUserId = paymentIntent.metadata.clerkUserId;
          selectedDate = paymentIntent.metadata.selectedDate;
          selectedTime = paymentIntent.metadata.selectedTime;
          customerEmail = paymentIntent.metadata.customerEmail;
          customerName = paymentIntent.metadata.customerName;
          expertName = paymentIntent.metadata.expertName;
          customerNotes = paymentIntent.metadata.customerNotes;
        }

        if (!eventId || !clerkUserId || !selectedDate || !selectedTime) {
          console.error('Missing required metadata for slot reservation:', {
            eventId,
            clerkUserId,
            selectedDate,
            selectedTime,
            hasMetadata: !!paymentIntent.metadata,
            metadataKeys: Object.keys(paymentIntent.metadata || {}),
          });
          return;
        }

        const startDateTime = new Date(`${selectedDate}T${selectedTime}`);

        // Get event details to calculate end time
        const event = await db.select().from(EventTable).where(eq(EventTable.id, eventId)).limit(1);

        if (event.length === 0) {
          console.error(`Event ${eventId} not found`);
          return;
        }

        const endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + event[0].durationInMinutes);

        // Create slot reservation
        await db.insert(SlotReservationTable).values({
          eventId,
          clerkUserId,
          guestEmail: customerEmail || '',
          startTime: startDateTime,
          endTime: endDateTime,
          expiresAt: voucherExpiresAt,
          stripePaymentIntentId: paymentIntent.id,
        });

        console.log(`Slot reservation created for payment intent ${paymentIntent.id}`);

        // Send Multibanco booking confirmation email
        if (customerEmail && multibancoDetails) {
          try {
            // Resolve expert name from database
            let resolvedExpertName = expertName || 'Expert';
            if (!expertName && clerkUserId) {
              const expertRecord = await db
                .select({
                  firstName: UserTable.firstName,
                  lastName: UserTable.lastName,
                })
                .from(UserTable)
                .where(eq(UserTable.clerkUserId, clerkUserId))
                .limit(1);

              if (expertRecord.length > 0 && expertRecord[0]) {
                const { firstName, lastName } = expertRecord[0];
                resolvedExpertName = [firstName, lastName].filter(Boolean).join(' ') || 'Expert';
              }
            }

            // Use parsed customer name or guest name
            const resolvedCustomerName = customerName || guestName || 'Customer';

            // Format Multibanco details
            const multibancoEntity = multibancoDetails.entity || '';
            const multibancoReference = multibancoDetails.reference || '';
            const multibancoAmount = (paymentIntent.amount / 100).toFixed(2);
            const hostedVoucherUrl = multibancoDetails.hosted_voucher_url || '';

            // Format dates with meeting timezone
            const appointmentDate = format(startDateTime, 'PPPP', { timeZone: timezone });
            const appointmentTime = format(startDateTime, 'p', { timeZone: timezone });
            const voucherExpiresFormatted = format(voucherExpiresAt, 'PPP p', {
              timeZone: timezone,
            });

            // Extract locale for internationalization
            const locale = extractLocaleFromPaymentIntent(paymentIntent);

            console.log('📧 Sending Multibanco booking email with data:', {
              customerEmail,
              resolvedCustomerName,
              resolvedExpertName,
              serviceName: event[0].name,
              multibancoEntity,
              multibancoReference,
              multibancoAmount,
              appointmentDate,
              appointmentTime,
              timezone,
            });

            // Trigger Novu workflow for Multibanco booking pending notification
            // This sends both email and in-app notification via the unified Novu system
            const workflowResult = await triggerWorkflow({
              workflowId: 'multibanco-booking-pending',
              to: {
                subscriberId: `guest_${customerEmail}`,
                email: customerEmail,
                firstName: resolvedCustomerName.split(' ')[0] || resolvedCustomerName,
                lastName: resolvedCustomerName.split(' ').slice(1).join(' ') || '',
              },
              payload: {
                customerName: resolvedCustomerName,
                expertName: resolvedExpertName,
                serviceName: event[0].name,
                appointmentDate,
                appointmentTime,
                timezone,
                duration: event[0].durationInMinutes,
                multibancoEntity,
                multibancoReference,
                multibancoAmount,
                voucherExpiresAt: voucherExpiresFormatted,
                hostedVoucherUrl,
                customerNotes: customerNotes || '',
                locale,
              },
              // Use payment intent ID as idempotency key to prevent duplicate notifications on retries
              transactionId: `multibanco-pending-${paymentIntent.id}`,
            });

            if (workflowResult) {
              console.log(`✅ Multibanco booking notification sent via Novu to ${customerEmail}`);
            } else {
              console.error(`❌ Failed to send Multibanco booking notification via Novu`);
            }
          } catch (emailError) {
            console.error('Error sending Multibanco booking confirmation email:', emailError);
          }
        }

        // Log audit event (simplified call)
        console.log('Audit event logged: slot reservation created', {
          paymentIntentId: paymentIntent.id,
          eventId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          expiresAt: voucherExpiresAt.toISOString(),
        });
      } catch (error) {
        console.error('Error creating slot reservation:', error);
      }
    }
  }
}
