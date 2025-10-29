import { ENV_CONFIG } from '@/config/env';
import { db } from '@/drizzle/db';
import { EventTable, SlotReservationTable, UserTable } from '@/drizzle/schema';
import MultibancoPaymentReminderTemplate from '@/emails/payments/multibanco-payment-reminder';
import { sendHeartbeatFailure, sendHeartbeatSuccess } from '@/lib/betterstack-heartbeat';
import { sendEmail } from '@/lib/email';
import { isVerifiedQStashRequest } from '@/lib/qstash-utils';
import { render } from '@react-email/components';
import { format } from 'date-fns';
import { and, eq, gt, isNotNull, isNull, lt } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add route segment config
export const preferredRegion = 'auto';
export const maxDuration = 60;

/**
 * CRON Job: Send Multibanco Payment Reminders
 *
 * This endpoint sends staged reminders to customers with pending Multibanco payments:
 * - Day 3: Gentle reminder with plenty of time remaining
 * - Day 6: Urgent reminder - final notice before expiration
 *
 * The job tracks which reminders have been sent using dedicated timestamp fields
 * to prevent duplicate emails and ensure proper reminder sequencing.
 *
 * Scheduling recommendation: Run every 6 hours to ensure timely delivery
 */
export async function GET(request: NextRequest) {
  console.log(
    'Received request to send-payment-reminders with headers:',
    Object.fromEntries(request.headers.entries()),
  );

  // Enhanced authentication with multiple fallbacks
  // First try QStash verification
  const verifiedQStash = await isVerifiedQStashRequest(request.headers);

  // Check for API key as a fallback
  const apiKey = request.headers.get('x-api-key');
  const isValidApiKey = apiKey && apiKey === process.env.CRON_API_KEY;

  // Check for Upstash signatures directly
  const hasUpstashSignature =
    request.headers.has('upstash-signature') || request.headers.has('x-upstash-signature');

  // Check for Upstash user agent
  const userAgent = request.headers.get('user-agent') || '';
  const isUpstashUserAgent =
    userAgent.toLowerCase().includes('upstash') || userAgent.toLowerCase().includes('qstash');

  // Check for legacy cron secret
  const cronSecret = request.headers.get('x-cron-secret');
  const isValidCronSecret = cronSecret && cronSecret === process.env.CRON_SECRET;

  // If in production, we can use a fallback mode for emergencies
  const isProduction = process.env.NODE_ENV === 'production';
  const allowFallback = process.env.ENABLE_CRON_FALLBACK === 'true';

  // Allow the request if any authentication method succeeds
  if (
    verifiedQStash ||
    isValidApiKey ||
    isValidCronSecret ||
    (hasUpstashSignature && isUpstashUserAgent) ||
    (isProduction && allowFallback && isUpstashUserAgent)
  ) {
    console.log('🔓 Authentication successful for send-payment-reminders');
  } else {
    console.error('❌ Unauthorized access attempt to send-payment-reminders');
    console.error('Authentication details:', {
      verifiedQStash,
      isValidApiKey,
      isValidCronSecret,
      hasUpstashSignature,
      isUpstashUserAgent,
      isProduction,
      allowFallback,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[CRON] Starting Multibanco payment reminders job...');

  try {
    const currentTime = new Date();

    // Define reminder stages based on days before expiration
    const reminderStages = [
      {
        type: 'gentle' as const,
        daysBeforeExpiry: 4, // Send on day 3 (4 days before 7-day expiry)
        description: 'Gentle reminder (Day 3)',
        trackingField: 'gentleReminderSentAt' as const,
      },
      {
        type: 'urgent' as const,
        daysBeforeExpiry: 1, // Send on day 6 (1 day before 7-day expiry)
        description: 'Urgent final reminder (Day 6)',
        trackingField: 'urgentReminderSentAt' as const,
      },
    ];

    let totalRemindersSent = 0;
    const reminderResults = [];

    for (const stage of reminderStages) {
      console.log(`[CRON] Processing ${stage.description}...`);

      // Calculate the time window for this reminder stage
      const reminderWindowStart = new Date(
        currentTime.getTime() + (stage.daysBeforeExpiry - 0.5) * 24 * 60 * 60 * 1000,
      );
      const reminderWindowEnd = new Date(
        currentTime.getTime() + (stage.daysBeforeExpiry + 0.5) * 24 * 60 * 60 * 1000,
      );

      // Find slot reservations that need reminders
      const reservationsNeedingReminders = await db
        .select({
          reservation: SlotReservationTable,
          event: {
            id: EventTable.id,
            name: EventTable.name,
            durationInMinutes: EventTable.durationInMinutes,
          },
          expert: {
            firstName: UserTable.firstName,
            lastName: UserTable.lastName,
          },
        })
        .from(SlotReservationTable)
        .leftJoin(EventTable, eq(SlotReservationTable.eventId, EventTable.id))
        .leftJoin(UserTable, eq(SlotReservationTable.clerkUserId, UserTable.clerkUserId))
        .where(
          and(
            // Reservation expires within the reminder window
            gt(SlotReservationTable.expiresAt, reminderWindowStart),
            lt(SlotReservationTable.expiresAt, reminderWindowEnd),
            // Reservation is still active (not expired)
            gt(SlotReservationTable.expiresAt, currentTime),
            // Has a Stripe payment intent (Multibanco payment)
            isNotNull(SlotReservationTable.stripePaymentIntentId),
            // Hasn't received this type of reminder yet
            stage.type === 'gentle'
              ? isNull(SlotReservationTable.gentleReminderSentAt)
              : isNull(SlotReservationTable.urgentReminderSentAt),
          ),
        );

      console.log(
        `[CRON] Found ${reservationsNeedingReminders.length} reservations for ${stage.description}`,
      );

      let stageRemindersSent = 0;

      for (const item of reservationsNeedingReminders) {
        const { reservation, event, expert } = item;

        if (!event || !expert) {
          console.warn(
            `[CRON] Skipping reservation ${reservation.id} - missing event or expert data`,
          );
          continue;
        }

        try {
          // Calculate days remaining
          const daysRemaining = Math.ceil(
            (reservation.expiresAt.getTime() - currentTime.getTime()) / (24 * 60 * 60 * 1000),
          );

          // Additional safety checks to prevent premature reminders
          const hoursSinceCreation =
            (currentTime.getTime() - reservation.createdAt.getTime()) / (1000 * 60 * 60);

          // Don't send gentle reminders too early (wait at least 48 hours after creation)
          if (stage.type === 'gentle' && hoursSinceCreation < 48) {
            console.log(
              `[CRON] Skipping gentle reminder for reservation ${reservation.id} - too recent (${hoursSinceCreation.toFixed(1)}h old)`,
            );
            continue;
          }

          // Don't send urgent reminders too early (wait at least 120 hours after creation)
          if (stage.type === 'urgent' && hoursSinceCreation < 120) {
            console.log(
              `[CRON] Skipping urgent reminder for reservation ${reservation.id} - not urgent yet (${hoursSinceCreation.toFixed(1)}h old)`,
            );
            continue;
          }

          // Get Multibanco payment details (this would need to be stored or retrieved from Stripe)
          // For now, we'll create placeholder values - in production, this should come from Stripe metadata
          const multibancoDetails = {
            entity: '12345', // This should come from Stripe webhook data
            reference: '123456789', // This should come from Stripe webhook data
            amount: '0.00', // This should come from the payment intent
            hostedVoucherUrl: `https://stripe.com/voucher/${reservation.stripePaymentIntentId}`,
          };

          // Format appointment details
          const expertName =
            `${expert.firstName || ''} ${expert.lastName || ''}`.trim() || 'Expert';
          const appointmentDate = format(reservation.startTime, 'EEEE, MMMM d, yyyy');
          const appointmentTime = format(reservation.startTime, 'h:mm a');
          const voucherExpiresFormatted = format(reservation.expiresAt, 'PPP p');

          // Render reminder email
          const emailHtml = await render(
            MultibancoPaymentReminderTemplate({
              customerName: 'Valued Customer', // Could be stored in reservation or retrieved from metadata
              expertName,
              serviceName: event.name,
              appointmentDate,
              appointmentTime,
              timezone: 'Europe/Lisbon', // Default for Multibanco
              duration: event.durationInMinutes,
              multibancoEntity: multibancoDetails.entity,
              multibancoReference: multibancoDetails.reference,
              multibancoAmount: multibancoDetails.amount,
              voucherExpiresAt: voucherExpiresFormatted,
              hostedVoucherUrl: multibancoDetails.hostedVoucherUrl,
              reminderType: stage.type,
              daysRemaining,
              locale: 'en',
            }),
          );

          // Send reminder email
          const emailResult = await sendEmail({
            to: reservation.guestEmail,
            subject:
              stage.type === 'urgent'
                ? '🚨 URGENT: Complete Your Multibanco Payment - Final Reminder'
                : '💙 Friendly Reminder: Complete Your Multibanco Payment',
            html: emailHtml,
          });

          if (emailResult.success) {
            console.log(
              `[CRON] ✅ ${stage.description} sent to ${reservation.guestEmail} for reservation ${reservation.id}`,
            );

            // Mark reminder as sent to prevent duplicates
            await db
              .update(SlotReservationTable)
              .set({
                [stage.trackingField]: currentTime,
                updatedAt: currentTime,
              })
              .where(eq(SlotReservationTable.id, reservation.id));

            stageRemindersSent++;
          } else {
            console.error(
              `[CRON] ❌ Failed to send ${stage.description} to ${reservation.guestEmail}: ${emailResult.error}`,
            );
          }
        } catch (reminderError) {
          console.error(
            `[CRON] Error sending reminder for reservation ${reservation.id}:`,
            reminderError,
          );
        }
      }

      reminderResults.push({
        stage: stage.description,
        found: reservationsNeedingReminders.length,
        sent: stageRemindersSent,
      });

      totalRemindersSent += stageRemindersSent;
    }

    console.log(`[CRON] Payment reminders job completed:`, {
      totalRemindersSent,
      stages: reminderResults,
      timestamp: currentTime.toISOString(),
    });

    // Send success heartbeat to BetterStack
    await sendHeartbeatSuccess({
      url: ENV_CONFIG.BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT,
      jobName: 'Multibanco Payment Reminders',
    });

    return NextResponse.json({
      success: true,
      totalRemindersSent,
      stages: reminderResults,
      timestamp: currentTime.toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Error during payment reminders job:', error);

    // Send failure heartbeat to BetterStack
    await sendHeartbeatFailure(
      {
        url: ENV_CONFIG.BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT,
        jobName: 'Multibanco Payment Reminders',
      },
      error,
    );

    return NextResponse.json(
      { error: 'Failed to process payment reminders', details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * Support for POST requests from QStash
 * This allows the endpoint to be called via QStash's HTTP POST mechanism
 */
export async function POST(request: NextRequest) {
  // Call the GET handler to process the payment reminders
  return GET(request);
}
