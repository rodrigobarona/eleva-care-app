import { ENV_CONFIG } from '@/config/env';
import { PAYOUT_DELAY_DAYS, STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { EventTable, PaymentTransferTable, UserTable } from '@/drizzle/schema';
import { sendHeartbeatFailure, sendHeartbeatSuccess } from '@/lib/betterstack-heartbeat';
import {
  PAYMENT_TRANSFER_STATUS_APPROVED,
  PAYMENT_TRANSFER_STATUS_COMPLETED,
  PAYMENT_TRANSFER_STATUS_FAILED,
  PAYMENT_TRANSFER_STATUS_PENDING,
} from '@/lib/constants/payment-transfers';
import {
  createPayoutCompletedNotification,
  createPayoutFailedNotification,
} from '@/lib/payment-notifications';
import { isVerifiedQStashRequest } from '@/lib/qstash-utils';
import { checkExistingTransfer } from '@/lib/stripe/transfer-utils';
import { and, eq, isNull, lte, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Process Expert Transfers - Automated fund transfers to expert accounts
// Handles payment aging, country delays, and Stripe Connect integration
// This cron job processes pending transfers based on:
// - Payment aging requirements per country
// - Stripe Connect account verification
// - Transfer status tracking and notifications
// - Detailed audit logging for compliance

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
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
 * Processes pending expert transfers
 * This endpoint is called by QStash every 2 hours
 */
export async function GET(request: Request) {
  // Log minimal request info without exposing sensitive headers
  console.log('Received request to process-expert-transfers', {
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

  if (verifiedQStash || isValidApiKey || (isProduction && hasFallbackToken)) {
    console.log('🔓 Authentication successful for process-expert-transfers');
  } else {
    console.error('❌ Unauthorized access attempt to process-expert-transfers');
    console.error('Authentication details:', {
      verifiedQStash,
      isValidApiKey,
      isProduction,
      allowFallback,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find all pending transfers that are due (scheduled time ≤ now or manually approved)
    // AND have met the payment aging requirements
    const now = new Date();
    console.log('Looking for transfers to process at:', now.toISOString());

    // Get user information to determine country-specific payout delay
    const pendingTransfers = await db.query.PaymentTransferTable.findMany({
      where: and(
        or(
          // Regular time-based transfers
          and(
            eq(PaymentTransferTable.status, PAYMENT_TRANSFER_STATUS_PENDING),
            lte(PaymentTransferTable.scheduledTransferTime, now),
            eq(PaymentTransferTable.requiresApproval, false),
          ),
          // Manually approved transfers
          eq(PaymentTransferTable.status, PAYMENT_TRANSFER_STATUS_APPROVED),
        ),
        isNull(PaymentTransferTable.transferId),
      ),
    });

    console.log(
      `Found ${pendingTransfers.length} potential transfers to evaluate for payment aging`,
    );

    // Filter transfers based on payment aging requirements
    const eligibleTransfers = [];
    for (const transfer of pendingTransfers) {
      // For approved transfers, we skip the payment aging check
      if (transfer.status === PAYMENT_TRANSFER_STATUS_APPROVED) {
        eligibleTransfers.push(transfer);
        continue;
      }

      try {
        // Get expert user to determine their country
        const expertUser = await db.query.UserTable.findFirst({
          where: eq(UserTable.clerkUserId, transfer.expertClerkUserId),
        });

        if (!expertUser) {
          console.error(
            `Could not find expert user ${transfer.expertClerkUserId} for transfer ${transfer.id}`,
          );
          continue;
        }

        // Get event details to calculate appointment end time
        const event = await db.query.EventTable.findFirst({
          where: eq(EventTable.id, transfer.eventId),
          columns: { durationInMinutes: true },
        });

        if (!event) {
          console.error(`Could not find event ${transfer.eventId} for transfer ${transfer.id}`);
          continue;
        }

        // Calculate appointment end time
        const appointmentEndTime = new Date(
          transfer.sessionStartTime.getTime() + event.durationInMinutes * 60 * 1000,
        );

        // Get country-specific payout delay with proper type safety
        const countryCode = (
          expertUser.country || 'DEFAULT'
        ).toUpperCase() as keyof typeof PAYOUT_DELAY_DAYS;
        const requiredAgingDays = PAYOUT_DELAY_DAYS[countryCode] || PAYOUT_DELAY_DAYS.DEFAULT;

        // REQUIREMENT 1: Calculate days since payment was created (7+ days for regulatory compliance)
        const paymentDate = transfer.created;
        const daysSincePayment = Math.floor(
          (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        // REQUIREMENT 2: Calculate hours since appointment ended (24+ hours for complaint window)
        const hoursSinceAppointmentEnd = Math.floor(
          (now.getTime() - appointmentEndTime.getTime()) / (1000 * 60 * 60),
        );

        console.log(
          `Transfer ${transfer.id}: Payment age is ${daysSincePayment} days (required: ${requiredAgingDays}), appointment ended ${hoursSinceAppointmentEnd}h ago (required: 24h)`,
        );

        // Both conditions must be met:
        // 1. Payment must be aged enough for regulatory compliance
        // 2. At least 24 hours must have passed since appointment ended (complaint window)
        const paymentAgedEnough = daysSincePayment >= requiredAgingDays;
        const appointmentComplaintWindowPassed = hoursSinceAppointmentEnd >= 24;

        if (paymentAgedEnough && appointmentComplaintWindowPassed) {
          eligibleTransfers.push(transfer);
          console.log(
            `✅ Transfer ${transfer.id} eligible: payment aged ${daysSincePayment}d, appointment ended ${hoursSinceAppointmentEnd}h ago`,
          );
        } else {
          const reasons = [];
          if (!paymentAgedEnough) {
            reasons.push(`payment aging (${daysSincePayment}/${requiredAgingDays} days)`);
          }
          if (!appointmentComplaintWindowPassed) {
            reasons.push(`appointment completion wait (${hoursSinceAppointmentEnd}/24 hours)`);
          }
          console.log(`❌ Transfer ${transfer.id} not ready: ${reasons.join(', ')}`);
        }
      } catch (error) {
        console.error(`Error evaluating transfer eligibility for transfer ${transfer.id}:`, error);
      }
    }

    console.log(
      `Found ${eligibleTransfers.length} transfers eligible for processing after payment aging check`,
    );

    // Process each eligible transfer
    const results = await Promise.allSettled(
      eligibleTransfers.map(async (transfer) => {
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

          // Update the transfer record with success
          await db
            .update(PaymentTransferTable)
            .set({
              transferId: stripeTransfer.id,
              status: PAYMENT_TRANSFER_STATUS_COMPLETED,
              updated: new Date(),
            })
            .where(eq(PaymentTransferTable.id, transfer.id));

          console.log(
            `Successfully transferred ${transfer.amount / 100} ${transfer.currency} to expert ${transfer.expertClerkUserId}`,
          );

          // Send notification to the expert
          try {
            await createPayoutCompletedNotification({
              userId: transfer.expertClerkUserId,
              amount: transfer.amount,
              currency: transfer.currency,
              eventId: transfer.eventId,
            });
            console.log(
              `Payment completion notification sent to expert ${transfer.expertClerkUserId}`,
            );
          } catch (notificationError) {
            console.error('Error sending payment notification:', notificationError);
            // Continue processing even if notification fails
          }

          return {
            success: true,
            transferId: stripeTransfer.id,
            paymentTransferId: transfer.id,
          } as SuccessResult;
        } catch (error) {
          console.error('Error creating Stripe transfer:', error);

          const stripeError = error as Stripe.errors.StripeError;
          // Increment retry count, with maximum retry limit
          const newRetryCount = (transfer.retryCount || 0) + 1;
          const newStatus =
            newRetryCount >= MAX_RETRY_COUNT
              ? PAYMENT_TRANSFER_STATUS_FAILED
              : PAYMENT_TRANSFER_STATUS_PENDING;

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

          // If we've reached the max retry count, send a notification to the expert
          if (newStatus === PAYMENT_TRANSFER_STATUS_FAILED) {
            try {
              await createPayoutFailedNotification({
                userId: transfer.expertClerkUserId,
                amount: transfer.amount,
                currency: transfer.currency,
                errorMessage: stripeError.message || 'Unknown payment processing error',
              });
              console.log(
                `Payment failure notification sent to expert ${transfer.expertClerkUserId}`,
              );
            } catch (notificationError) {
              console.error('Error sending payment failure notification:', notificationError);
              // Continue processing even if notification fails
            }
          }

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

    // Send success heartbeat to BetterStack
    await sendHeartbeatSuccess({
      url: ENV_CONFIG.BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT,
      jobName: 'Expert Payout Processing',
    });

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Error processing expert transfers:', error);

    // Send failure heartbeat to BetterStack
    await sendHeartbeatFailure(
      {
        url: ENV_CONFIG.BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT,
        jobName: 'Expert Payout Processing',
      },
      error,
    );

    return NextResponse.json(
      { error: 'Failed to process expert transfers', details: (error as Error).message },
      { status: 500 },
    );
  }
}

/**
 * Support for POST requests from QStash
 * This allows the endpoint to be called via QStash's HTTP POST mechanism
 */
export async function POST(request: Request) {
  // Call the GET handler to process transfers
  return GET(request);
}
