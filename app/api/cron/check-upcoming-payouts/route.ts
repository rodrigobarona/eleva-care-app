import { ENV_CONFIG } from '@/config/env';
import { PAYOUT_DELAY_DAYS } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { PaymentTransferTable } from '@/drizzle/schema';
import { sendHeartbeatFailure, sendHeartbeatSuccess } from '@/lib/betterstack-heartbeat';
import { createUpcomingPayoutNotification } from '@/lib/payment-notifications';
import { isVerifiedQStashRequest } from '@/lib/qstash-utils';
import { getUserByClerkId } from '@/lib/users';
import { addDays, differenceInDays } from 'date-fns';
import { and, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Check Upcoming Payouts - Notifies experts about upcoming eligible payouts
// Performs the following tasks:
// - Identifies pending transfers without notifications
// - Calculates remaining days until payout based on country rules
// - Sends notifications for payouts eligible in 1-2 days
// - Updates notification timestamps
// - Maintains notification audit trail

// Add route segment config
export const preferredRegion = 'auto';
export const maxDuration = 60;

// This CRON job runs daily and checks for payments that will be eligible for payout soon
// It sends notifications to experts about upcoming payouts
export async function GET(request: Request) {
  // Log all headers for debugging
  console.log(
    'Received request to check-upcoming-payouts with headers:',
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
    console.log('🔓 Authentication successful for check-upcoming-payouts');
  } else {
    console.error('❌ Unauthorized access attempt to check-upcoming-payouts');
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

  console.log('Starting check for upcoming payouts...');

  try {
    // Get all pending transfers that have not been notified yet
    const pendingTransfers = await db
      .select()
      .from(PaymentTransferTable)
      .where(
        and(
          eq(PaymentTransferTable.status, 'PENDING'),
          isNull(PaymentTransferTable.notifiedAt),
          isNull(PaymentTransferTable.transferId),
        ),
      );

    console.log(
      `Found ${pendingTransfers.length} pending transfers to check for upcoming payout notifications`,
    );

    const results = {
      notifications_sent: 0,
      errors: 0,
    };

    // Process each pending transfer
    for (const transfer of pendingTransfers) {
      try {
        // Get the expert's country to determine payout delay
        const expert = await getUserByClerkId(transfer.expertClerkUserId);
        if (!expert || !expert.country) {
          console.log(
            `Expert ${transfer.expertClerkUserId} not found or has no country set, skipping notification`,
          );
          continue;
        }

        // Get country-specific payout delay with proper case handling
        const countryCode = expert.country.toUpperCase() as keyof typeof PAYOUT_DELAY_DAYS;
        const countryDelay = PAYOUT_DELAY_DAYS[countryCode] || PAYOUT_DELAY_DAYS.DEFAULT;
        const paymentDate = transfer.created || new Date();
        const daysAged = differenceInDays(new Date(), paymentDate);
        const remainingDays = Math.max(0, countryDelay - daysAged);

        // If payment will be eligible for payout in 1-2 days, send notification
        if (remainingDays <= 2 && remainingDays > 0) {
          const payoutDate = addDays(new Date(), remainingDays);

          // Send notification
          await createUpcomingPayoutNotification({
            userId: transfer.expertClerkUserId,
            amount: transfer.amount,
            currency: transfer.currency,
            payoutDate,
            eventId: transfer.eventId,
            expert: expert, // Pass the expert user data for email/name
          });

          // Update the transfer record with notification timestamp
          await db
            .update(PaymentTransferTable)
            .set({
              notifiedAt: new Date(),
              updated: new Date(),
            })
            .where(eq(PaymentTransferTable.id, transfer.id));

          console.log(
            `Sent upcoming payout notification to expert ${transfer.expertClerkUserId} for payment transfer ${transfer.id}`,
          );
          results.notifications_sent++;
        }
      } catch (error) {
        console.error(
          `Error processing upcoming payout notification for transfer ${transfer.id}:`,
          error,
        );
        results.errors++;
      }
    }

    console.log('Completed upcoming payouts check. Results:', results);

    // Send success heartbeat to BetterStack
    await sendHeartbeatSuccess({
      url: ENV_CONFIG.BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT,
      jobName: 'Check Upcoming Payouts',
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in check-upcoming-payouts CRON job:', error);

    // Send failure heartbeat to BetterStack
    await sendHeartbeatFailure(
      {
        url: ENV_CONFIG.BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT,
        jobName: 'Check Upcoming Payouts',
      },
      error,
    );

    return NextResponse.json({ error: 'Failed to process upcoming payouts' }, { status: 500 });
  }
}

/**
 * Support for POST requests from QStash
 * This allows the endpoint to be called via QStash's HTTP POST mechanism
 */
export async function POST(request: Request) {
  // Call the GET handler to process upcoming payouts
  return GET(request);
}
