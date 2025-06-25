import { triggerWorkflow } from '@/app/utils/novu';
import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import {
  EventTable,
  MeetingTable,
  PaymentTransferTable,
  schedulingSettings,
  SlotReservationTable,
  UserTable,
} from '@/drizzle/schema';
import MultibancoBookingPendingTemplate from '@/emails/payments/multibanco-booking-pending';
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
import { generateAppointmentEmail, sendEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/logAuditEvent';
import { createUserNotification } from '@/lib/notifications';
import { withRetry } from '@/lib/stripe';
import { render } from '@react-email/components';
import { format, toZonedTime } from 'date-fns-tz';
import { and, eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

/**
 * Extract locale from payment intent metadata and fallback sources
 */
function extractLocaleFromPaymentIntent(paymentIntent: Stripe.PaymentIntent): string {
  try {
    // First, try to get locale from meeting metadata
    if (paymentIntent.metadata?.meeting) {
      const meetingData = JSON.parse(paymentIntent.metadata.meeting);
      if (meetingData.locale && typeof meetingData.locale === 'string') {
        console.log(`📍 Using locale from payment intent meeting metadata: ${meetingData.locale}`);
        return meetingData.locale;
      }
    }

    // Fallback: Check if there's a locale in the payment intent metadata directly
    if (paymentIntent.metadata?.locale) {
      console.log(
        `📍 Using locale from payment intent direct metadata: ${paymentIntent.metadata.locale}`,
      );
      return paymentIntent.metadata.locale;
    }

    // Final fallback
    console.log('📍 No locale found in payment intent metadata, using default: en');
    return 'en';
  } catch (error) {
    console.error('Error extracting locale from payment intent metadata:', error);
    return 'en';
  }
}

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
 * Notify expert about successful payment
 */
async function notifyExpertOfPaymentSuccess(transfer: { expertClerkUserId: string }) {
  await createUserNotification({
    userId: transfer.expertClerkUserId,
    type: NOTIFICATION_TYPE_ACCOUNT_UPDATE,
    data: {
      userName: 'Expert',
      title: 'Payment Received',
      message: 'A payment for your session has been successfully processed.',
      actionUrl: '/account/payments',
    },
  });
}

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
 * Enhanced collision detection that considers both booking conflicts and actual minimum notice periods
 * @param expertId - Expert's Clerk user ID
 * @param startTime - Appointment start time
 * @param eventId - Event ID to get duration information
 * @returns Object with conflict info and reason
 */
async function checkAppointmentConflict(
  expertId: string,
  startTime: Date,
  eventId: string,
): Promise<{ hasConflict: boolean; reason?: string; minimumNoticeHours?: number }> {
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

    // 1. Check for existing confirmed meetings with TIME RANGE OVERLAP
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

    // 2. Check actual minimum notice period requirements from expert's settings
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
    console.error('Error in enhanced collision check:', error);
    // In case of error, assume no conflict to avoid blocking legitimate payments
    return { hasConflict: false };
  }
}

/**
 * Process partial refund for appointment conflicts (90% refund, 10% processing fee)
 */
async function processPartialRefund(
  paymentIntent: Stripe.PaymentIntent,
  reason: string,
): Promise<Stripe.Refund | null> {
  try {
    const originalAmount = paymentIntent.amount;
    const refundAmount = Math.floor(originalAmount * 0.9); // 90% refund
    const processingFee = originalAmount - refundAmount; // 10% processing fee

    console.log(
      `💰 Processing partial refund: Original: ${originalAmount}, Refund: ${refundAmount}, Fee: ${processingFee}`,
    );

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntent.id,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        reason: reason,
        original_amount: originalAmount.toString(),
        processing_fee: processingFee.toString(),
        refund_percentage: '90',
        conflict_type: reason,
      },
    });

    console.log(`✅ Partial refund processed: ${refund.id} for amount ${refundAmount}`);
    return refund;
  } catch (error) {
    console.error('Error processing partial refund:', error);
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

    // If it's a Multibanco payment and we have session timing info, check for conflicts
    let hasConflict = false;
    if (isMultibancoPayment && meetingData.expert && meetingData.start) {
      const appointmentStart = new Date(meetingData.start);
      const conflictResult = await checkAppointmentConflict(
        meetingData.expert,
        appointmentStart,
        meetingData.id,
      );
      hasConflict = conflictResult.hasConflict;

      if (hasConflict) {
        console.log(`🚨 Late Multibanco payment conflict detected for PI ${paymentIntent.id}`);

        // Process 90% refund
        const refund = await processPartialRefund(
          paymentIntent,
          'Appointment time slot no longer available due to late payment',
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

          console.log(`✅ Conflict handled: 90% refund processed for PI ${paymentIntent.id}`);

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
    }

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

    if (updatedMeeting.length === 0) {
      console.warn(
        `No meeting found with paymentIntentId ${paymentIntent.id} to update status to succeeded.`,
      );
      // It's possible the meeting is created via a different flow or checkout session ID only
      // If checkout_session_id is available in paymentIntent metadata, we could try that as a fallback.
      // For now, we proceed to update the transfer record if it exists.
    } else {
      const meeting = updatedMeeting[0];
      console.log(
        `Meeting ${meeting.id} status updated to succeeded for paymentIntentId ${paymentIntent.id}`,
      );

      // If meeting doesn't have a meeting URL yet (was created with pending payment), create calendar event now
      if (!meeting.meetingUrl) {
        try {
          console.log(`Creating deferred calendar event for meeting ${meeting.id}`);

          // Get the event details for calendar creation
          const event = await db.query.EventTable.findFirst({
            where: eq(EventTable.id, meeting.eventId),
          });

          if (event) {
            // Dynamic import to avoid circular dependency with calendar service
            // The calendar service depends on meeting types which depend on payment types
            const { createCalendarEvent } = await import('@/server/googleCalendar');

            const calendarEvent = await createCalendarEvent({
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

            const meetingUrl = calendarEvent.conferenceData?.entryPoints?.[0]?.uri ?? null;

            // Update meeting with the new URL
            if (meetingUrl) {
              await db
                .update(MeetingTable)
                .set({
                  meetingUrl: meetingUrl,
                  updatedAt: new Date(),
                })
                .where(eq(MeetingTable.id, meeting.id));

              console.log(
                `Calendar event created and meeting URL updated for meeting ${meeting.id}`,
              );
            }

            // Clean up slot reservation if it exists
            try {
              await db
                .delete(SlotReservationTable)
                .where(eq(SlotReservationTable.stripePaymentIntentId, paymentIntent.id));
            } catch (cleanupError) {
              console.error('Failed to clean up slot reservation:', cleanupError);
              // Continue execution - this is not critical
            }
          }
        } catch (calendarError) {
          console.error(
            `Failed to create deferred calendar event for meeting ${meeting.id}:`,
            calendarError,
          );
          // Don't fail the entire webhook for calendar errors - payment succeeded
        }
      }

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
          const scheduledTime = new Date(transferData.scheduled);
          if (Number.isNaN(scheduledTime.getTime())) {
            console.error(
              `Invalid scheduled transfer time in metadata for PI ${paymentIntent.id}: ${transferData.scheduled}`,
            );
            return;
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
            scheduledTransferTime: scheduledTime,
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

        // Notify the expert about the successful payment
        await notifyExpertOfPaymentSuccess(transfer);

        // Also trigger Novu marketplace workflow for enhanced notifications
        try {
          const user = await db.query.UserTable.findFirst({
            where: eq(UserTable.clerkUserId, transfer.expertClerkUserId),
            columns: { clerkUserId: true, firstName: true, lastName: true, email: true },
          });

          if (user) {
            const sessionDate = format(meeting.startTime, 'EEEE, MMMM d, yyyy');
            const amount = (transfer.amount / 100).toFixed(2); // Convert cents to euros

            const payload = {
              amount,
              clientName: meeting.guestName || 'Client',
              sessionDate,
              transactionId: paymentIntent.id,
              dashboardUrl: '/account/billing',
            };

            await triggerWorkflow({
              workflowId: 'marketplace-payment-received',
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
            console.log(`Attempting to send payment confirmation email to ${guestEmail}`);
            const { html, text, subject } = await generateAppointmentEmail({
              expertName,
              clientName: guestName,
              appointmentDate,
              appointmentTime,
              timezone: meetingTimezone,
              appointmentDuration,
              eventTitle: eventName,
              meetLink: meetingDetails.meetingUrl ?? undefined,
              notes: meetingDetails.guestNotes ?? undefined,
              locale: extractLocaleFromPaymentIntent(paymentIntent),
            });

            await sendEmail({
              to: guestEmail,
              subject,
              html,
              text,
            });
            console.log(
              `Payment confirmation email successfully sent to ${guestEmail} for PI ${paymentIntent.id}`,
            );
          } catch (emailError) {
            console.error(
              `Failed to send payment confirmation email to ${guestEmail} for PI ${paymentIntent.id}:`,
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
        const { eventId, clerkUserId, selectedDate, selectedTime, customerEmail } =
          paymentIntent.metadata;

        if (!eventId || !clerkUserId || !selectedDate || !selectedTime) {
          console.error('Missing required metadata for slot reservation');
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
            // Get expert details
            const expert = await db
              .select({ clerkUserId: UserTable.clerkUserId })
              .from(UserTable)
              .where(eq(UserTable.clerkUserId, clerkUserId))
              .limit(1);

            if (expert.length === 0) {
              console.error(`Expert ${clerkUserId} not found`);
              return;
            }

            // Parse additional metadata
            const customerName = paymentIntent.metadata.customerName || 'Customer';
            const expertName = paymentIntent.metadata.expertName || 'Expert';
            const customerNotes = paymentIntent.metadata.customerNotes;

            // Format Multibanco details
            const multibancoEntity = multibancoDetails.entity || '';
            const multibancoReference = multibancoDetails.reference || '';
            const multibancoAmount = (paymentIntent.amount / 100).toFixed(2);
            const hostedVoucherUrl = multibancoDetails.hosted_voucher_url || '';

            // Format dates
            const appointmentDate = format(startDateTime, 'PPPP');
            const appointmentTime = format(startDateTime, 'p');
            const voucherExpiresFormatted = format(voucherExpiresAt, 'PPP p');

            // Render email template
            const emailHtml = await render(
              MultibancoBookingPendingTemplate({
                customerName,
                expertName,
                serviceName: event[0].name,
                appointmentDate,
                appointmentTime,
                timezone: 'Europe/Lisbon', // Default for Multibanco
                duration: event[0].durationInMinutes,
                multibancoEntity,
                multibancoReference,
                multibancoAmount,
                voucherExpiresAt: voucherExpiresFormatted,
                hostedVoucherUrl,
                customerNotes,
              }),
            );

            // Send email using Resend
            const emailResult = await sendEmail({
              to: customerEmail,
              subject: `Booking Confirmed - Payment Required via Multibanco`,
              html: emailHtml,
            });

            if (emailResult.success) {
              console.log(`✅ Multibanco booking confirmation email sent to ${customerEmail}`);
            } else {
              console.error(`❌ Failed to send Multibanco booking email: ${emailResult.error}`);
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
