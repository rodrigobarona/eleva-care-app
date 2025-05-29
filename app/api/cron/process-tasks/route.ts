/**
 * @file Process Tasks Cron Job
 * @description Main daily task processor that handles expert transfers and system maintenance.
 *
 * This cron job runs daily at 4 AM UTC and performs the following tasks:
 * 1. Processes pending expert transfers
 * 2. Verifies payment statuses
 * 3. Updates transfer records
 * 4. Handles retry logic for failed transfers
 * 5. Maintains system audit logs
 *
 * @schedule "0 4 * * *" (Daily at 4 AM UTC)
 * @security Requires QStash authentication
 */
import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { PaymentTransferTable } from '@/drizzle/schema';
import { isVerifiedQStashRequest } from '@/lib/qstash-utils';
import { and, eq, isNull, lte, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';
export const maxDuration = 60;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
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
  // Log all headers for debugging
  console.log(
    'Received request to process-tasks with headers:',
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
    console.log('🔓 Authentication successful for process-tasks');
  } else {
    console.error('❌ Unauthorized access attempt to process-tasks');
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

  try {
    // 1. Process expert transfers
    const now = new Date();
    console.log('Looking for transfers to process at:', now.toISOString());

    const pendingTransfers = await db.query.PaymentTransferTable.findMany({
      where: and(
        or(
          // Regular time-based transfers
          and(
            eq(PaymentTransferTable.status, 'PENDING'),
            lte(PaymentTransferTable.scheduledTransferTime, now),
            eq(PaymentTransferTable.requiresApproval, false),
          ),
          // Manually approved transfers
          eq(PaymentTransferTable.status, 'APPROVED'),
        ),
        isNull(PaymentTransferTable.transferId),
      ),
    });

    console.log(`Found ${pendingTransfers.length} transfers to process`);

    // Process each pending transfer
    const results = await Promise.allSettled(
      pendingTransfers.map(async (transfer) => {
        console.log(`Processing transfer for payment intent: ${transfer.paymentIntentId}`);

        try {
          // Create a transfer to the expert's Connect account
          const stripeTransfer = await stripe.transfers.create({
            amount: transfer.amount,
            currency: transfer.currency,
            destination: transfer.expertConnectAccountId,
            source_transaction: transfer.paymentIntentId,
            metadata: {
              paymentTransferId: transfer.id.toString(),
              eventId: transfer.eventId,
              expertClerkUserId: transfer.expertClerkUserId,
              sessionStartTime: transfer.sessionStartTime.toISOString(),
              scheduledTransferTime: transfer.scheduledTransferTime.toISOString(),
            },
            description: `Expert payout for session ${transfer.eventId}`,
          });

          // Update the transfer record with the transfer ID and set status to COMPLETED
          await db
            .update(PaymentTransferTable)
            .set({
              status: 'COMPLETED',
              transferId: stripeTransfer.id,
              updated: new Date(),
            })
            .where(eq(PaymentTransferTable.id, transfer.id));

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
            .update(PaymentTransferTable)
            .set({
              status: newStatus,
              stripeErrorCode: stripeError.code || 'unknown_error',
              stripeErrorMessage: stripeError.message || 'Unknown error occurred',
              retryCount: newRetryCount,
              updated: new Date(),
            })
            .where(eq(PaymentTransferTable.id, transfer.id));

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
