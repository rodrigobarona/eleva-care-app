import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { PaymentTransfersTable } from '@/drizzle/schema';
import { isVerifiedQStashRequest } from '@/lib/integrations/qstash/utils';
import { checkExistingTransfer } from '@/lib/integrations/stripe/transfer-utils';
import { and, eq, isNull, lte, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Process Tasks - Main daily task processor for expert transfers and system maintenance
// Performs the following tasks:
// - Processes pending expert transfers
// - Verifies payment statuses
// - Updates transfer records
// - Handles retry logic for failed transfers
// - Maintains system audit logs

// Add route segment config
export const preferredRegion = 'auto';
export const maxDuration = 60;

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

// Maximum number of retries for failed transfers
const MAX_RETRY_COUNT = 3;

// Define types for transfer results
type SuccessResult = {
  success: true;
  transferId: string;
  paymentTransferId: number;
};

type ErrorResult = {
  success: false;
  paymentTransferId: number;
  error: string;
  retryCount: number;
  status: string;
};

type TransferResult = SuccessResult | ErrorResult;

/**
 * Processes pending expert transfers and keeps the app alive
 * This endpoint is called by QStash daily at 4 AM
 */
export async function GET(request: Request) {
  // Log minimal request info without exposing sensitive headers
  console.log('Received request to process-tasks', {
    ua: request.headers.get('user-agent') || 'unknown',
    time: new Date().toISOString(),
  });

  // Enhanced authentication with multiple fallbacks
  // First try QStash verification
  const verifiedQStash = await isVerifiedQStashRequest(request.headers);

  // Check for API key as a fallback
  const apiKey = request.headers.get('x-api-key');
  const isValidApiKey = apiKey && apiKey === process.env.CRON_API_KEY;

  // Check for Upstash user agent (used for fallback token validation)
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
  // Fallback requires a secret token, not just user-agent (which is spoofable)
  const hasFallbackToken =
    allowFallback &&
    isUpstashUserAgent &&
    apiKey === process.env.CRON_FALLBACK_TOKEN &&
    process.env.CRON_FALLBACK_TOKEN;

  if (verifiedQStash || isValidApiKey || isValidCronSecret || (isProduction && hasFallbackToken)) {
    console.log('🔓 Authentication successful for process-tasks');
  } else {
    console.error('❌ Unauthorized access attempt to process-tasks');
    console.error('Authentication details:', {
      verifiedQStash,
      isValidApiKey,
      isValidCronSecret,
      isProduction,
      allowFallback,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Process expert transfers
    const now = new Date();
    console.log('Looking for transfers to process at:', now.toISOString());

    const pendingTransfers = await db.query.PaymentTransfersTable.findMany({
      where: and(
        or(
          // Regular time-based transfers
          and(
            eq(PaymentTransfersTable.status, 'PENDING'),
            lte(PaymentTransfersTable.scheduledTransferTime, now),
            eq(PaymentTransfersTable.requiresApproval, false),
          ),
          // Manually approved transfers
          eq(PaymentTransfersTable.status, 'APPROVED'),
        ),
        isNull(PaymentTransfersTable.transferId),
      ),
    });

    console.log(`Found ${pendingTransfers.length} transfers to process`);

    // Process each pending transfer
    const results = await Promise.allSettled(
      pendingTransfers.map(async (transfer) => {
        console.log(`Processing transfer for payment intent: ${transfer.paymentIntentId}`);

        try {
          // Retrieve the PaymentIntent to get the charge ID
          const paymentIntent = await stripe.paymentIntents.retrieve(transfer.paymentIntentId);

          if (!paymentIntent.latest_charge) {
            throw new Error(
              `PaymentIntent ${transfer.paymentIntentId} has no charge. Status: ${paymentIntent.status}`,
            );
          }

          // Get the charge ID (latest_charge can be a string ID or a Charge object)
          const chargeId =
            typeof paymentIntent.latest_charge === 'string'
              ? paymentIntent.latest_charge
              : paymentIntent.latest_charge.id;

          console.log(`Using charge ID ${chargeId} for transfer`);

          // ✅ CRITICAL FIX: Check if a Stripe transfer already exists for this charge
          // This prevents duplicate transfers when webhooks have already processed the payment
          const { existingTransferId, shouldCreateTransfer } = await checkExistingTransfer(
            stripe,
            chargeId,
            { id: transfer.id, paymentIntentId: transfer.paymentIntentId },
          );

          if (!shouldCreateTransfer) {
            return {
              success: true,
              transferId: existingTransferId!,
              paymentTransferId: transfer.id,
            } as SuccessResult;
          }

          // Create a transfer to the expert's Connect account
          const stripeTransfer = await stripe.transfers.create(
            {
              amount: transfer.amount,
              currency: transfer.currency,
              destination: transfer.expertConnectAccountId,
              source_transaction: chargeId, // ✅ Use charge ID, not payment intent ID
              metadata: {
                paymentTransferId: transfer.id.toString(),
                eventId: transfer.eventId,
                expertClerkUserId: transfer.expertClerkUserId,
                sessionStartTime: transfer.sessionStartTime.toISOString(),
                scheduledTransferTime: transfer.scheduledTransferTime.toISOString(),
              },
              description: `Expert payout for session ${transfer.eventId}`,
            },
            { idempotencyKey: `transfer:${transfer.id}` },
          );

          // Update the transfer record with the transfer ID and set status to COMPLETED
          await db
            .update(PaymentTransfersTable)
            .set({
              status: 'COMPLETED',
              transferId: stripeTransfer.id,
              updated: new Date(),
            })
            .where(eq(PaymentTransfersTable.id, transfer.id));

          console.log(
            `Successfully transferred ${transfer.amount / 100} ${transfer.currency} to expert ${transfer.expertClerkUserId}`,
          );
          return {
            success: true,
            transferId: stripeTransfer.id,
            paymentTransferId: transfer.id,
          } as SuccessResult;
        } catch (error) {
          console.error('Error creating Stripe transfer:', error);

          const stripeError = error as Stripe.errors.StripeError;
          const newRetryCount = (transfer.retryCount || 0) + 1;
          const newStatus = newRetryCount >= MAX_RETRY_COUNT ? 'FAILED' : 'PENDING';

          // Update the transfer record with the error and increment retry count
          await db
            .update(PaymentTransfersTable)
            .set({
              status: newStatus,
              stripeErrorCode: stripeError.code || 'unknown_error',
              stripeErrorMessage: stripeError.message || 'Unknown error occurred',
              retryCount: newRetryCount,
              updated: new Date(),
            })
            .where(eq(PaymentTransfersTable.id, transfer.id));

          return {
            success: false,
            paymentTransferId: transfer.id,
            error: stripeError.message || 'Unknown error',
            retryCount: newRetryCount,
            status: newStatus,
          } as ErrorResult;
        }
      }),
    );

    // Summarize results
    const summary = {
      total: results.length,
      successful: results.filter(
        (r) => r.status === 'fulfilled' && (r.value as TransferResult).success,
      ).length,
      failed: results.filter(
        (r) => r.status !== 'fulfilled' || !(r.value as TransferResult).success,
      ).length,
      details: results.map((r) => {
        if (r.status === 'fulfilled') {
          return r.value as TransferResult;
        }
        return {
          success: false,
          error: String(r.reason),
          paymentTransferId: 0,
        } as ErrorResult;
      }),
    };

    // 2. Keep alive response
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tasks: {
        keepAlive: true,
        transfers: summary,
      },
    });
  } catch (error) {
    console.error('Error processing tasks:', error);
    return NextResponse.json(
      { error: 'Failed to process tasks', details: (error as Error).message },
      { status: 500 },
    );
  }
}

/**
 * Support for POST requests from QStash
 * This allows the endpoint to be called via QStash's HTTP POST mechanism
 */
export async function POST(request: Request) {
  // Call the GET handler to process tasks
  return GET(request);
}
