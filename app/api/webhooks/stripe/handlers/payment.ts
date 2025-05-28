import { db } from '@/drizzle/db';
import { EventTable, MeetingTable, PaymentTransferTable, UserTable } from '@/drizzle/schema';
import { generateAppointmentEmail, sendEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/logAuditEvent';
import { createUserNotification } from '@/lib/notifications';
import { withRetry } from '@/lib/stripe';
import { format, utcToZonedTime } from 'date-fns-tz';
import { eq } from 'drizzle-orm';
import type { Stripe } from 'stripe';

export async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);

  try {
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
      console.log(
        `Meeting ${updatedMeeting[0].id} status updated to succeeded for paymentIntentId ${paymentIntent.id}`,
      );
    }

    // Find the payment transfer record
    const transfer = await db.query.PaymentTransferTable.findFirst({
      where: eq(PaymentTransferTable.paymentIntentId, paymentIntent.id),
    });

    if (!transfer) {
      console.error(
        'No transfer record found for payment:',
        paymentIntent.id,
        'This might be normal if the meeting was free or if transfer record creation failed earlier.',
      );
      // If no transfer record, and meeting was updated, the main goal of confirming meeting payment is achieved.
      // If there should always be a transfer record for a succeeded payment, this is a separate issue.
      // We should still attempt to send guest notification if meeting was found and updated.
    } else if (transfer?.status === 'PENDING') {
      // Ensure transfer exists before checking status
      // Update transfer status if needed with retry logic only if a transfer record exists
      await withRetry(
        async () => {
          await db
            .update(PaymentTransferTable)
            .set({
              status: 'READY',
              updated: new Date(),
            })
            .where(eq(PaymentTransferTable.id, transfer.id));
        },
        3,
        1000,
      );
      console.log(`Transfer record ${transfer.id} status updated to READY.`);

      // Notify the expert about the successful payment
      await createUserNotification({
        userId: transfer.expertClerkUserId,
        type: 'ACCOUNT_UPDATE',
        title: 'Payment Received',
        message: 'A payment for your session has been successfully processed.',
        actionUrl: '/account/payments',
      });
    } else if (transfer) {
      console.log(
        `Transfer record ${transfer.id} already in status ${transfer.status}, not updating to READY.`,
      );
    }

    // Send email notification to the guest
    if (updatedMeeting.length > 0) {
      const meetingDetails = await db.query.MeetingTable.findFirst({
        where: eq(MeetingTable.stripePaymentIntentId, paymentIntent.id),
        with: {
          event: {
            columns: {
              name: true,
              durationInMinutes: true,
            },
          },
          user: {
            // Assuming relation name is 'user' for expert on MeetingTable
            columns: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (meetingDetails?.event && meetingDetails?.user) {
        const guestEmail = meetingDetails.guestEmail;
        const guestName = meetingDetails.guestName ?? 'Guest';
        const expertName =
          `${meetingDetails.user.firstName ?? ''} ${meetingDetails.user.lastName ?? ''}`.trim() ||
          'Our Expert';
        const eventName = meetingDetails.event.name;
        const meetingStartTime = meetingDetails.startTime; // Date object
        const meetingTimezone = meetingDetails.timezone || 'UTC'; // Default to UTC if not set
        const durationMinutes = meetingDetails.event.durationInMinutes;

        // Format date and time for the email
        const zonedStartTime = utcToZonedTime(meetingStartTime, meetingTimezone);
        const appointmentDate = format(zonedStartTime, 'EEEE, MMMM d, yyyy', {
          timeZone: meetingTimezone,
        });
        const startTimeFormatted = format(zonedStartTime, 'h:mm a', { timeZone: meetingTimezone });

        const endTime = new Date(meetingStartTime.getTime() + durationMinutes * 60000);
        const zonedEndTime = utcToZonedTime(endTime, meetingTimezone);
        const endTimeFormatted = format(zonedEndTime, 'h:mm a', { timeZone: meetingTimezone });

        const appointmentTime = `${startTimeFormatted} - ${endTimeFormatted} (${meetingTimezone})`;
        const appointmentDuration = `${durationMinutes} minutes`;

        try {
          console.log(`Attempting to send payment confirmation email to ${guestEmail}`);
          const { html, text } = await generateAppointmentEmail({
            expertName,
            clientName: guestName,
            appointmentDate,
            appointmentTime,
            timezone: meetingTimezone,
            appointmentDuration,
            eventTitle: eventName,
            meetLink: meetingDetails.meetingUrl ?? undefined,
            notes: meetingDetails.guestNotes ?? undefined,
            locale: meetingDetails.locale ?? 'en',
          });

          await sendEmail({
            to: guestEmail,
            subject: 'Payment Confirmed: Your Eleva Care Meeting is Booked!',
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
          `Could not retrieve all necessary details for PI ${paymentIntent.id} to send guest confirmation email. Meeting Details: ${!!meetingDetails}, Event: ${!!meetingDetails?.event}, User: ${!!meetingDetails?.user}`,
        );
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
        locale: MeetingTable.locale,
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

    let expertNotificationMessage = `A payment for one of your sessions (PI: ${paymentIntent.id}) has failed. Reason: ${lastPaymentError}. The client may need to update their payment method or rebook.`;

    if (meetingDetails) {
      expertNotificationMessage = `Payment for your session with ${meetingDetails.guestName || 'guest'} for event ID ${meetingDetails.eventId} scheduled at ${meetingDetails.startTime.toISOString()} has failed. Reason: ${lastPaymentError}. The meeting has been canceled and the guest notified. They may attempt to rebook.`;
    }

    if (!transfer) {
      console.error(
        'No transfer record found for failed payment:',
        paymentIntent.id,
        'This might be normal if the meeting was free or if transfer record creation failed earlier.',
      );
      // If meetingDetails exist, still try to notify guest
    } else if (transfer.status === 'PENDING' || transfer.status === 'READY') {
      await withRetry(
        async () => {
          await db
            .update(PaymentTransferTable)
            .set({
              status: 'FAILED',
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
      await createUserNotification({
        userId: transfer.expertClerkUserId, // Use expertClerkUserId from transfer record
        type: 'ACCOUNT_UPDATE',
        title: 'Important: Session Payment Failed & Canceled',
        message: expertNotificationMessage,
        actionUrl: '/account/payments', // Or link to appointments page
      });
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

        const zonedStartTime = utcToZonedTime(meetingStartTime, meetingTimezone);
        const appointmentDate = format(zonedStartTime, 'EEEE, MMMM d, yyyy', {
          timeZone: meetingTimezone,
        });
        const startTimeFormatted = format(zonedStartTime, 'h:mm a', { timeZone: meetingTimezone });
        const endTime = new Date(meetingStartTime.getTime() + durationMinutes * 60000);
        const zonedEndTime = utcToZonedTime(endTime, meetingTimezone);
        const endTimeFormatted = format(zonedEndTime, 'h:mm a', { timeZone: meetingTimezone });
        const appointmentTime = `${startTimeFormatted} - ${endTimeFormatted} (${meetingTimezone})`;
        const appointmentDuration = `${durationMinutes} minutes`;

        try {
          console.log(`Attempting to send payment failed/cancellation email to ${guestEmail}`);
          const { html, text } = await generateAppointmentEmail({
            expertName,
            clientName: guestName,
            appointmentDate,
            appointmentTime,
            timezone: meetingTimezone,
            appointmentDuration,
            eventTitle: eventName,
            meetLink: meetingDetails.meetingUrl ?? undefined, // May not be relevant if cancelled
            notes: `We regret to inform you that the payment for this scheduled meeting failed. Reason: ${lastPaymentError}. As a result, this meeting has been canceled. Please update your payment information and try booking again, or contact support if you believe this is an error.`,
            locale: meetingDetails.locale ?? 'en',
          });

          await sendEmail({
            to: guestEmail,
            subject: 'Action Required: Payment Failed for Your Eleva Care Meeting',
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
        status: 'REFUNDED', // Ensure this matches PaymentTransferTable schema/enum if any
        updated: new Date(),
      })
      .where(eq(PaymentTransferTable.id, transfer.id));
    console.log(`Transfer record ${transfer.id} status updated to REFUNDED.`);

    // Notify the expert about the refund
    await createUserNotification({
      userId: transfer.expertClerkUserId,
      type: 'ACCOUNT_UPDATE',
      title: 'Payment Refunded',
      message: 'A payment has been refunded for one of your sessions.',
      actionUrl: '/account/payments',
    });
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
        status: 'DISPUTED', // Ensure this matches PaymentTransferTable schema/enum
        updated: new Date(),
      })
      .where(eq(PaymentTransferTable.id, transfer.id));
    console.log(`Transfer record ${transfer.id} status updated to DISPUTED.`);

    // Create notification for the expert
    await createUserNotification({
      userId: transfer.expertClerkUserId,
      type: 'SECURITY_ALERT',
      title: 'Payment Dispute Opened',
      message:
        'A payment dispute has been opened for one of your sessions. We will contact you with more information.',
      actionUrl: '/account/payments',
    });
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
    paymentIntent.payment_method?.type === 'multibanco'
  ) {
    const multibancoDetails = paymentIntent.next_action.multibanco_display_details;
    const voucherExpiresAtTimestamp = multibancoDetails?.expires_at; // This is a Unix timestamp (seconds)

    if (voucherExpiresAtTimestamp) {
      const voucherExpiresAtDate = new Date(voucherExpiresAtTimestamp * 1000); // Convert to JS Date (milliseconds)
      console.log(
        `Multibanco payment intent ${paymentIntent.id} requires action. Voucher expires at: ${voucherExpiresAtDate.toISOString()}`,
      );

      try {
        // Retrieve the corresponding meeting
        const meeting = await db.query.MeetingTable.findFirst({
          where: eq(MeetingTable.stripePaymentIntentId, paymentIntent.id),
        });

        if (meeting) {
          const meetingStartTime = meeting.startTime; // This should be a JS Date object from the DB

          if (voucherExpiresAtDate > meetingStartTime) {
            const logMessage = `Potential Issue: Multibanco voucher for PI ${paymentIntent.id} (Meeting ID: ${meeting.id}) expires at ${voucherExpiresAtDate.toISOString()}, which is AFTER the meeting start time ${meetingStartTime.toISOString()}.`;
            console.warn(logMessage);

            // Log as a specific audit event for tracking and analysis
            try {
              const expertClerkUserId =
                paymentIntent.metadata?.expertClerkUserId || 'SYSTEM_UNKNOWN_EXPERT';
              await logAuditEvent(
                expertClerkUserId,
                'MULTIBANCO_EXPIRY_RISK',
                'payment_intent',
                paymentIntent.id,
                null,
                {
                  meetingId: meeting.id,
                  paymentIntentId: paymentIntent.id,
                  multibancoVoucherExpiresAt: voucherExpiresAtDate.toISOString(),
                  meetingStartTime: meetingStartTime.toISOString(),
                  message: logMessage,
                  riskLevel: 'HIGH',
                  requiresManualReview: true,
                },
                'SYSTEM_WEBHOOK', // IP Address
                'Stripe Webhook', // User Agent
              );
            } catch (auditError) {
              console.error(
                `Error logging MULTIBANCO_EXPIRY_RISK audit event for PI ${paymentIntent.id}:`,
                auditError,
              );
            }
          } else {
            console.log(
              `Multibanco voucher for PI ${paymentIntent.id} (Meeting ID: ${meeting.id}) expires at ${voucherExpiresAtDate.toISOString()}, which is BEFORE the meeting start time ${meetingStartTime.toISOString()}. This is OK.`,
            );
          }
        } else {
          console.warn(
            `Meeting not found for paymentIntentId ${paymentIntent.id} during Multibanco expiry check.`,
          );
        }
      } catch (error) {
        console.error(`Error during Multibanco expiry check for PI ${paymentIntent.id}:`, error);
      }
    } else {
      console.log(
        `Multibanco payment intent ${paymentIntent.id} requires action, but no expiry details found in next_action.`,
      );
    }
  } else if (paymentIntent.next_action) {
    console.log(
      `Payment intent ${paymentIntent.id} requires action of type: ${paymentIntent.next_action.type}`,
    );
  }
  // No further specific action taken by this handler for other 'requires_action' types yet.
  // Stripe will typically guide the user through the required action on their end.
}
