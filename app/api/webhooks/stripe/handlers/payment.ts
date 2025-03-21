import { db } from '@/drizzle/db';
import { PaymentTransferTable } from '@/drizzle/schema';
import { createUserNotification } from '@/lib/notifications';
import { withRetry } from '@/lib/stripe';
import { eq } from 'drizzle-orm';
import type { Stripe } from 'stripe';

export async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);

  // Find the payment transfer record
  const transfer = await db.query.PaymentTransferTable.findFirst({
    where: eq(PaymentTransferTable.paymentIntentId, paymentIntent.id),
  });

  if (!transfer) {
    console.error('No transfer record found for payment:', paymentIntent.id);
    return;
  }

  // Update transfer status if needed with retry logic
  if (transfer.status === 'PENDING') {
    try {
      await withRetry(
        async () => {
          await db.transaction(async (_tx) => {
            await db
              .update(PaymentTransferTable)
              .set({
                status: 'READY',
                updated: new Date(),
              })
              .where(eq(PaymentTransferTable.id, transfer.id));
          });
        },
        3,
        1000,
      );
    } catch (error) {
      console.error('Error updating payment status after retries:', error);
      return;
    }

    // Notify the expert about the successful payment
    await createUserNotification({
      userId: transfer.expertClerkUserId,
      type: 'ACCOUNT_UPDATE',
      title: 'Payment Received',
      message: 'A payment for your session has been successfully processed.',
      actionUrl: '/account/payments',
    });
  }
}

export async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);

  // Find the payment transfer record
  const transfer = await db.query.PaymentTransferTable.findFirst({
    where: eq(PaymentTransferTable.paymentIntentId, paymentIntent.id),
  });

  if (!transfer) {
    console.error('No transfer record found for payment:', paymentIntent.id);
    return;
  }

  // Update transfer status if it's not already in a final state
  if (transfer.status === 'PENDING' || transfer.status === 'READY') {
    try {
      await withRetry(
        async () => {
          await db.transaction(async (_tx) => {
            await db
              .update(PaymentTransferTable)
              .set({
                status: 'FAILED',
                updated: new Date(),
              })
              .where(eq(PaymentTransferTable.id, transfer.id));
          });
        },
        3,
        1000,
      );
    } catch (error) {
      console.error('Error updating payment status after retries:', error);
      return;
    }
  }

  // Notify the expert about the failed payment
  await createUserNotification({
    userId: transfer.expertClerkUserId,
    type: 'ACCOUNT_UPDATE',
    title: 'Payment Failed',
    message:
      'A payment for your session has failed to process. The client may need to update their payment method.',
    actionUrl: '/account/payments',
  });
}

export async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log('Payment refunded:', charge.id);

  // Find the payment transfer record using the payment intent ID
  if (!charge.payment_intent || typeof charge.payment_intent !== 'string') {
    console.error('No payment intent found for charge:', charge.id);
    return;
  }

  const transfer = await db.query.PaymentTransferTable.findFirst({
    where: eq(PaymentTransferTable.paymentIntentId, charge.payment_intent),
  });

  if (!transfer) {
    console.error('No transfer record found for payment:', charge.payment_intent);
    return;
  }

  // Update transfer status
  await db.transaction(async (_tx) => {
    await db
      .update(PaymentTransferTable)
      .set({
        status: 'REFUNDED',
        updated: new Date(),
      })
      .where(eq(PaymentTransferTable.id, transfer.id));
  });

  // Notify the expert about the refund
  await createUserNotification({
    userId: transfer.expertClerkUserId,
    type: 'ACCOUNT_UPDATE',
    title: 'Payment Refunded',
    message: 'A payment has been refunded for one of your sessions.',
    actionUrl: '/account/payments',
  });
}

export async function handleDisputeCreated(dispute: Stripe.Dispute) {
  console.log('Dispute created:', dispute.id);

  // Find the payment transfer record using the payment intent ID
  if (!dispute.payment_intent || typeof dispute.payment_intent !== 'string') {
    console.error('No payment intent found for dispute:', dispute.id);
    return;
  }

  const transfer = await db.query.PaymentTransferTable.findFirst({
    where: eq(PaymentTransferTable.paymentIntentId, dispute.payment_intent),
  });

  if (!transfer) {
    console.error('No transfer record found for payment:', dispute.payment_intent);
    return;
  }

  // Update transfer status
  await db.transaction(async (_tx) => {
    await db
      .update(PaymentTransferTable)
      .set({
        status: 'DISPUTED',
        updated: new Date(),
      })
      .where(eq(PaymentTransferTable.id, transfer.id));
  });

  // Create notification for the expert
  await createUserNotification({
    userId: transfer.expertClerkUserId,
    type: 'SECURITY_ALERT',
    title: 'Payment Dispute Opened',
    message:
      'A payment dispute has been opened for one of your sessions. We will contact you with more information.',
    actionUrl: '/account/payments',
  });
}
