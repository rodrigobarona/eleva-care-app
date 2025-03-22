import { PAYOUT_DELAY_DAYS } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { PaymentTransferTable } from '@/drizzle/schema';
import { createUpcomingPayoutNotification } from '@/lib/payment-notifications';
import { getUserByClerkId } from '@/lib/users';
import { addDays, differenceInDays } from 'date-fns';
import { and, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';
export const maxDuration = 60;

// This CRON job runs daily and checks for payments that will be eligible for payout soon
// It sends notifications to experts about upcoming payouts
export async function GET(request: Request) {
  // Allow access from QStash or with legacy API key
  const isQStashRequest = request.headers.get('x-qstash-request') === 'true';
  const apiKey = request.headers.get('x-api-key');
  const isValidApiKey = apiKey && apiKey === process.env.CRON_API_KEY;

  if (!isQStashRequest && !isValidApiKey) {
    console.error('Unauthorized access attempt to check-upcoming-payouts');
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
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in check-upcoming-payouts CRON job:', error);
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
