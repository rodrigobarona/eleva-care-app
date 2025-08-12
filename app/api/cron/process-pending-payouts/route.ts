import { PAYOUT_DELAY_DAYS, STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { PaymentTransferTable, UserTable } from '@/drizzle/schema';
import {
  PAYMENT_TRANSFER_STATUS_COMPLETED,
  PAYMENT_TRANSFER_STATUS_PAID_OUT,
} from '@/lib/constants/payment-transfers';
import { createPayoutCompletedNotification } from '@/lib/payment-notifications';
import { isVerifiedQStashRequest } from '@/lib/qstash-utils';
import { and, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Process Pending Payouts - Creates actual Stripe payouts after transfer delay period
// This cron job handles the second phase of expert payments:
// 1. Finds completed transfers where payout delay has passed
// 2. Creates Stripe payouts from Connect account to expert bank account
// 3. Updates records and sends notifications

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';
export const maxDuration = 60;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

// Maximum number of retries for failed payouts (currently not implemented but reserved for future use)
// const MAX_RETRY_COUNT = 3;

// Define types for payout results
type SuccessResult = {
  success: true;
  payoutId: string;
  paymentTransferId: number;
  amount: number;
  currency: string;
};

type ErrorResult = {
  success: false;
  paymentTransferId: number;
  error: string;
  retryCount: number;
  accountId: string;
};

// Type union for payout results (using individual types directly for better type inference)
// type PayoutResult = SuccessResult | ErrorResult;

/**
 * Processes pending payouts for Connect accounts
 * This endpoint is called by QStash daily at 6 AM
 */
export async function GET(request: Request) {
  console.log(
    'Received request to process-pending-payouts with headers:',
    Object.fromEntries(request.headers.entries()),
  );

  // Enhanced authentication with multiple fallbacks
  const verifiedQStash = await isVerifiedQStashRequest(request.headers);
  const apiKey = request.headers.get('x-api-key');
  const isValidApiKey = apiKey && apiKey === process.env.CRON_API_KEY;
  const hasUpstashSignature =
    request.headers.has('upstash-signature') || request.headers.has('x-upstash-signature');
  const userAgent = request.headers.get('user-agent') || '';
  const isUpstashUserAgent =
    userAgent.toLowerCase().includes('upstash') || userAgent.toLowerCase().includes('qstash');
  const isProduction = process.env.NODE_ENV === 'production';
  const allowFallback = process.env.ENABLE_CRON_FALLBACK === 'true';

  if (
    verifiedQStash ||
    isValidApiKey ||
    (hasUpstashSignature && isUpstashUserAgent) ||
    (isProduction && allowFallback && isUpstashUserAgent)
  ) {
    console.log('🔓 Authentication successful for process-pending-payouts');
  } else {
    console.error('❌ Unauthorized access attempt to process-pending-payouts');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    console.log('Looking for completed transfers ready for payout at:', now.toISOString());

    // Find completed transfers that don't have payouts yet
    const completedTransfers = await db.query.PaymentTransferTable.findMany({
      where: and(
        eq(PaymentTransferTable.status, PAYMENT_TRANSFER_STATUS_COMPLETED),
        isNull(PaymentTransferTable.payoutId), // No payout created yet
      ),
    });

    console.log(`Found ${completedTransfers.length} completed transfers to evaluate for payout`);

    // Filter transfers based on payout delay requirements
    const eligibleForPayout = [];
    for (const transfer of completedTransfers) {
      try {
        // Get expert user to determine their country and payout delay
        const expertUser = await db.query.UserTable.findFirst({
          where: eq(UserTable.clerkUserId, transfer.expertClerkUserId),
        });

        if (!expertUser) {
          console.error(
            `Could not find expert user ${transfer.expertClerkUserId} for transfer ${transfer.id}`,
          );
          continue;
        }

        if (!expertUser.stripeConnectAccountId) {
          console.error(
            `Expert user ${transfer.expertClerkUserId} has no Connect account for transfer ${transfer.id}`,
          );
          continue;
        }

        // Get country-specific payout delay
        const countryCode = (
          expertUser.country || 'DEFAULT'
        ).toUpperCase() as keyof typeof PAYOUT_DELAY_DAYS;
        const requiredDelayDays = PAYOUT_DELAY_DAYS[countryCode] || PAYOUT_DELAY_DAYS.DEFAULT;

        // Calculate days since transfer was completed
        const transferDate = transfer.updated || transfer.created;
        const daysSinceTransfer = Math.floor(
          (now.getTime() - transferDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        console.log(
          `Transfer ${transfer.id}: ${daysSinceTransfer} days since completion, required delay: ${requiredDelayDays} days`,
        );

        // Check if enough time has passed for payout
        if (daysSinceTransfer >= requiredDelayDays) {
          eligibleForPayout.push({
            ...transfer,
            expertUser,
            requiredDelayDays,
            daysSinceTransfer,
          });
        } else {
          console.log(
            `Transfer ${transfer.id} not ready for payout (${daysSinceTransfer}/${requiredDelayDays} days)`,
          );
        }
      } catch (error) {
        console.error(`Error evaluating payout eligibility for transfer ${transfer.id}:`, error);
      }
    }

    console.log(`Found ${eligibleForPayout.length} transfers eligible for payout creation`);

    // Process each eligible transfer
    const results = await Promise.allSettled(
      eligibleForPayout.map(async (transferData) => {
        const { expertUser, ...transfer } = transferData;
        console.log(`Creating payout for transfer: ${transfer.id}`);

        try {
          // Get the Connect account balance to determine payout amount
          const balance = await stripe.balance.retrieve(
            {},
            {
              stripeAccount: expertUser.stripeConnectAccountId!,
            },
          );

          // Find available balance in the transfer currency
          const availableBalance = balance.available.find(
            (bal) => bal.currency === transfer.currency.toLowerCase(),
          );

          if (!availableBalance || availableBalance.amount <= 0) {
            console.log(
              `No available balance for ${transfer.currency} in account ${expertUser.stripeConnectAccountId}`,
            );
            return {
              success: false,
              paymentTransferId: transfer.id,
              error: 'No available balance',
              retryCount: 0,
              accountId: expertUser.stripeConnectAccountId,
            } as ErrorResult;
          }

          // Create payout for the available amount (or transfer amount, whichever is smaller)
          const payoutAmount = Math.min(availableBalance.amount, transfer.amount);

          const payout = await stripe.payouts.create(
            {
              amount: payoutAmount,
              currency: transfer.currency,
              metadata: {
                paymentTransferId: transfer.id.toString(),
                eventId: transfer.eventId,
                expertClerkUserId: transfer.expertClerkUserId,
                originalTransferAmount: transfer.amount.toString(),
              },
              description: `Expert payout for session ${transfer.eventId}`,
            },
            {
              stripeAccount: expertUser.stripeConnectAccountId!,
            },
          );

          // Update the transfer record with payout information
          await db
            .update(PaymentTransferTable)
            .set({
              payoutId: payout.id,
              status: PAYMENT_TRANSFER_STATUS_PAID_OUT,
              updated: new Date(),
            })
            .where(eq(PaymentTransferTable.id, transfer.id));

          console.log(
            `Successfully created payout ${payout.id} for ${payoutAmount / 100} ${transfer.currency} to expert ${transfer.expertClerkUserId}`,
          );

          // Log payout details for audit trail (Stripe best practice)
          console.log('Payout created:', {
            payoutId: payout.id,
            amount: payoutAmount,
            currency: transfer.currency,
            destination: expertUser.stripeConnectAccountId,
            expertId: transfer.expertClerkUserId,
            transferId: transfer.id,
            sessionId: transfer.eventId,
            created: new Date().toISOString(),
          });

          // Send notification to the expert
          try {
            await createPayoutCompletedNotification({
              userId: transfer.expertClerkUserId,
              amount: payoutAmount,
              currency: transfer.currency,
              eventId: transfer.eventId,
            });
            console.log(`Payout notification sent to expert ${transfer.expertClerkUserId}`);
          } catch (notificationError) {
            console.error('Error sending payout notification:', notificationError);
            // Continue processing even if notification fails
          }

          return {
            success: true,
            payoutId: payout.id,
            paymentTransferId: transfer.id,
            amount: payoutAmount,
            currency: transfer.currency,
          } as SuccessResult;
        } catch (error) {
          console.error('Error creating Stripe payout:', error);

          const stripeError = error as Stripe.errors.StripeError;

          // Categorize Stripe errors for better handling (Stripe best practice)
          let errorCategory = 'unknown';
          let shouldRetry = false;

          if (stripeError instanceof Stripe.errors.StripeCardError) {
            errorCategory = 'payment_method_issue';
            shouldRetry = false;
          } else if (stripeError instanceof Stripe.errors.StripeRateLimitError) {
            errorCategory = 'rate_limit';
            shouldRetry = true;
          } else if (stripeError instanceof Stripe.errors.StripeInvalidRequestError) {
            errorCategory = 'invalid_request';
            shouldRetry = false;
          } else if (
            stripeError instanceof Stripe.errors.StripeAPIError ||
            stripeError instanceof Stripe.errors.StripeConnectionError
          ) {
            errorCategory = 'api_connection';
            shouldRetry = true;
          }

          // Log detailed error information for debugging
          console.error('Payout creation failed:', {
            transferId: transfer.id,
            expertId: transfer.expertClerkUserId,
            amount: transfer.amount,
            currency: transfer.currency,
            errorName: stripeError.constructor.name,
            errorCode: stripeError.code,
            errorMessage: stripeError.message,
            errorCategory,
            shouldRetry,
            timestamp: new Date().toISOString(),
          });

          // For now, don't retry payout failures - they need manual intervention
          // Future enhancement: implement retry logic for certain error types

          return {
            success: false,
            paymentTransferId: transfer.id,
            error: stripeError.message || 'Unknown error',
            retryCount: 0,
            accountId: expertUser.stripeConnectAccountId,
          } as ErrorResult;
        }
      }),
    );

    // Summarize results
    const summary = {
      total: results.length,
      successful: results.filter((r) => r.status === 'fulfilled' && r.value.success).length,
      failed: results.filter(
        (r) => r.status !== 'fulfilled' || (r.status === 'fulfilled' && !r.value.success),
      ).length,
      totalAmountPaidOut: results
        .filter(
          (r): r is PromiseFulfilledResult<SuccessResult> =>
            r.status === 'fulfilled' && r.value.success,
        )
        .reduce((sum, r) => sum + r.value.amount, 0),
      details: results.map((r) => {
        if (r.status === 'fulfilled') {
          return r.value;
        }
        return {
          success: false as const,
          error: String(r.reason),
          paymentTransferId: 0,
          retryCount: 0,
          accountId: 'unknown',
        } as ErrorResult;
      }),
    };

    console.log('Payout processing summary:', summary);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Error processing pending payouts:', error);
    return NextResponse.json(
      { error: 'Failed to process pending payouts', details: (error as Error).message },
      { status: 500 },
    );
  }
}

/**
 * Support for POST requests from QStash
 */
export async function POST(request: Request) {
  return GET(request);
}
