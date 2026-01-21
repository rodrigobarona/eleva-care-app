import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import {
  BlockedDatesTable,
  EventTable,
  MeetingTable,
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
import { generateAppointmentEmail, sendEmail } from '@/lib/integrations/novu/email';
import { elevaEmailService } from '@/lib/integrations/novu/email-service';
import { withRetry } from '@/lib/integrations/stripe';
import { createUserNotification } from '@/lib/notifications/core';
import { extractLocaleFromPaymentIntent } from '@/lib/utils/locale';
import { logAuditEvent } from '@/lib/utils/server/audit';
import { format, toZonedTime } from 'date-fns-tz';
import { and, eq, isNull } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

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
 */
async function createDeferredCalendarEvent(
  meeting: {
    id: string;
    eventId: string;
    clerkUserId: string;
    guestName: string;
    guestEmail: string;
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

    // Get the event details for calendar creation
    const event = await db.query.EventTable.findFirst({
      where: eq(EventTable.id, meeting.eventId),
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

    // Clean up slot reservation if it exists
    try {
      await db
        .delete(SlotReservationTable)
        .where(eq(SlotReservationTable.stripePaymentIntentId, paymentIntent.id));
      console.log(`🧹 Cleaned up slot reservation for payment intent ${paymentIntent.id}`);
    } catch (cleanupError) {
      console.error('❌ Failed to clean up slot reservation:', cleanupError);
      // Continue execution - this is not critical
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
) {
  try {
    console.log(
      `📧 Sending conflict notification to ${guestEmail} in locale ${locale} for reason: ${conflictReason}`,
    );

    // Load collision messages from internationalization files
    const t = await getTranslations({ locale, namespace: 'Payments.collision' });

    // Format amounts for display
    const refundAmountFormatted = (refundAmount / 100).toFixed(2);
    const originalAmountFormatted = (originalAmount / 100).toFixed(2);
    const processingFeeFormatted = ((originalAmount - refundAmount) / 100).toFixed(2);
    const appointmentDateTime = format(startTime, 'PPP pp');

    // Get base conflict message and append specific reason if applicable
    let conflictMessage = t('conflictMessage', {
      expertName,
      appointmentDateTime,
    });

    // Add specific conflict reason context
    if (conflictReason === 'minimum_notice_violation' && minimumNoticeHours) {
      const minimumNoticeMessage = t('minimumNoticeViolation', {
        minimumNoticeHours: minimumNoticeHours.toString(),
      });
      conflictMessage += ` ${minimumNoticeMessage}`;
    }

    // Build email content using translated messages
    const emailTitle = t('title');
    const emailSubject = t('subject');
    const greeting = t('greeting', { clientName: guestName });
    const latePaymentExplanation = t('latePaymentExplanation', {
      refundAmount: refundAmountFormatted,
    });
    const apologyAndInvitation = t('apologyAndInvitation');
    const signature = t('signature');

    // Build refund details section
    const refundDetailsHTML = `
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Refund Details</h3>
        <p>${t('refundDetails.originalAmount', { amount: originalAmountFormatted })}</p>
        <p>${t('refundDetails.refundAmount', { amount: refundAmountFormatted })}</p>
        <p>${t('refundDetails.processingFee', { amount: processingFeeFormatted })}</p>
      </div>
    `;

    const htmlContent = `
      <h2>${emailTitle}</h2>
      <p>${greeting}</p>
      <p>${conflictMessage}</p>
      <p>${latePaymentExplanation}</p>
      ${refundDetailsHTML}
      <p>${apologyAndInvitation}</p>
      <p>${signature.replace(/\\n/g, '<br>')}</p>
    `;

    await sendEmail({
      to: guestEmail,
      subject: emailSubject,
      html: htmlContent,
    });

    console.log(
      `✅ Conflict notification sent to ${guestEmail} (reason: ${conflictReason}${minimumNoticeHours ? `, minimum notice: ${minimumNoticeHours}h` : ''})`,
    );
  } catch (error) {
    console.error('Error sending conflict notification:', error);
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
      start: '',
      dur: 0,
      notes: '',
    });

    // Check if this is a Multibanco payment and if it's potentially late
    const isMultibancoPayment = paymentIntent.payment_method_types?.includes('multibanco');

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

            // Notify all parties about the conflict
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

        const paymentData = parseMetadata(paymentIntent.metadata?.payment, {
          amount: '0',
          fee: '0',
          expert: '0',
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
          const amount = Number.parseInt(paymentData.expert, 10);
          const fee = Number.parseInt(paymentData.fee, 10);

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

          // All validations passed, create transfer record
          await db.insert(PaymentTransferTable).values({
            paymentIntentId: paymentIntent.id,
            checkoutSessionId: 'UNKNOWN', // Session ID not available in payment intent metadata per best practices
            eventId: meeting.eventId,
            expertConnectAccountId: transferData.account,
            expertClerkUserId: meeting.clerkUserId,
            amount: amount,
            platformFee: fee,
            currency: 'eur',
            sessionStartTime: meeting.startTime,
            scheduledTransferTime: scheduledTime, // 🆕 Uses recalculated time if available
            status: PAYMENT_TRANSFER_STATUS_READY,
            created: new Date(),
            updated: new Date(),
          });
          console.log(`Created new transfer record for payment ${paymentIntent.id}`);
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
            console.log(`Attempting to send payment receipt email to ${guestEmail}`);
            const locale = extractLocaleFromPaymentIntent(paymentIntent);
            const amount = (paymentIntent.amount / 100).toFixed(2);
            const currency = paymentIntent.currency?.toUpperCase() || 'EUR';

            // Determine payment method from payment intent
            const paymentMethodTypes = paymentIntent.payment_method_types || [];
            const paymentMethod = paymentMethodTypes.includes('multibanco')
              ? 'Multibanco'
              : paymentMethodTypes.includes('card')
                ? 'Card'
                : 'Online Payment';

            // Render payment confirmation email (simple receipt, not full appointment details)
            const html = await elevaEmailService.renderPaymentConfirmation({
              customerName: guestName,
              amount: `${amount}`,
              currency,
              transactionId: paymentIntent.id,
              locale,
              // Include basic appointment reference (full details come from calendar email)
              appointmentDetails: {
                service: eventName,
                expert: expertName,
                date: appointmentDate,
                time: appointmentTime,
                duration: appointmentDuration,
              },
            });

            const subject = locale.startsWith('pt')
              ? `✅ Pagamento confirmado - ${currency} ${amount}`
              : locale.startsWith('es')
                ? `✅ Pago confirmado - ${currency} ${amount}`
                : `✅ Payment Confirmed - ${currency} ${amount}`;

            await sendEmail({
              to: guestEmail,
              subject,
              html,
              text: `Your payment of ${currency} ${amount} via ${paymentMethod} has been confirmed. Transaction ID: ${paymentIntent.id}. Appointment details will follow in a separate email.`,
            });
            console.log(
              `Payment receipt email successfully sent to ${guestEmail} for PI ${paymentIntent.id}`,
            );
          } catch (emailError) {
            console.error(
              `Failed to send payment receipt email to ${guestEmail} for PI ${paymentIntent.id}:`,
              emailError,
            );
            // Do not fail the entire webhook for email error
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
    // Consider re-throwing if this error should halt further webhook processing or be retried by Stripe
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
          console.log(`Attempting to send payment failed/cancellation email to ${guestEmail}`);
          const { html, text, subject } = await generateAppointmentEmail({
            expertName,
            clientName: guestName,
            appointmentDate,
            appointmentTime,
            timezone: meetingTimezone,
            appointmentDuration,
            eventTitle: eventName,
            meetLink: meetingDetails.meetingUrl ?? undefined, // May not be relevant if cancelled
            notes: `We regret to inform you that the payment for this scheduled meeting failed. Reason: ${lastPaymentError}. As a result, this meeting has been canceled. Please update your payment information and try booking again, or contact support if you believe this is an error.`,
            locale: extractLocaleFromPaymentIntent(paymentIntent),
          });

          await sendEmail({
            to: guestEmail,
            subject,
            html,
            text,
          });
          console.log(
            `Payment failed/cancellation email successfully sent to ${guestEmail} for PI ${paymentIntent.id}`,
          );
        } catch (emailError) {
          console.error(
            `Failed to send payment failed/cancellation email to ${guestEmail} for PI ${paymentIntent.id}:`,
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

export async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log('Payment refunded:', charge.id);

  // Find the payment transfer record using the payment intent ID
  const paymentIntentId = charge.payment_intent;
  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    console.error('No payment_intent ID found on charge object:', charge.id);
    return;
  }

  try {
    // Update Meeting status
    const updatedMeeting = await db
      .update(MeetingTable)
      .set({
        stripePaymentStatus: 'refunded', // Ensure this matches the enum in MeetingTable schema
        updatedAt: new Date(),
      })
      .where(eq(MeetingTable.stripePaymentIntentId, paymentIntentId))
      .returning();

    if (updatedMeeting.length === 0) {
      console.warn(
        `No meeting found with paymentIntentId ${paymentIntentId} to update status to refunded.`,
      );
    } else {
      console.log(
        `Meeting ${updatedMeeting[0].id} status updated to refunded for paymentIntentId ${paymentIntentId}`,
      );
    }

    // Find and update the payment transfer record
    const transfer = await db.query.PaymentTransferTable.findFirst({
      where: eq(PaymentTransferTable.paymentIntentId, paymentIntentId),
    });

    if (!transfer) {
      console.error(
        'No transfer record found for refunded payment:',
        paymentIntentId,
        'This might be normal if the meeting was free or if transfer record creation failed earlier.',
      );
      return; // No transfer to update, but meeting status (if found) is updated.
    }

    // Update transfer status
    // No need for withRetry here usually as charge.refunded is a final state from Stripe's perspective.
    await db
      .update(PaymentTransferTable)
      .set({
        status: PAYMENT_TRANSFER_STATUS_REFUNDED, // Ensure this matches PaymentTransferTable schema/enum if any
        updated: new Date(),
      })
      .where(eq(PaymentTransferTable.id, transfer.id));
    console.log(`Transfer record ${transfer.id} status updated to REFUNDED.`);

    // Notify the expert about the refund
    await notifyExpertOfPaymentRefund(transfer);
  } catch (error) {
    console.error(
      `Error in handleChargeRefunded for charge ${charge.id} (PI: ${paymentIntentId}):`,
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
