import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { PaymentTransferTable } from '@/drizzle/schema';
import { and, eq, isNull, lte, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

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
 * Processes pending expert transfers
 * This endpoint should be called by a scheduled job every 10-15 minutes
 */
export async function GET(request: Request) {
  // Check for authorization
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
    console.error('Unauthorized access attempt to process-expert-transfers');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find all pending transfers that are due (scheduled time ≤ now or manually approved)
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

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Error processing expert transfers:', error);
    return NextResponse.json(
      { error: 'Failed to process expert transfers', details: (error as Error).message },
      { status: 500 },
    );
  }
}
