import { db } from '@/drizzle/db';
import { PaymentTransferTable } from '@/drizzle/schema';
import { PAYMENT_TRANSFER_STATUS_COMPLETED } from '@/lib/constants/payment-transfers';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

type CheckResult = {
  existingTransferId: string | null;
  shouldCreateTransfer: boolean;
};

/**
 * Check if a Stripe transfer already exists for a given charge.
 * This prevents duplicate transfers when webhooks have already processed the payment.
 *
 * If a transfer exists, updates the database record with the existing transfer ID
 * and marks it as COMPLETED.
 *
 * @param stripe - Stripe instance
 * @param chargeId - The Stripe charge ID to check
 * @param transferRecord - The database transfer record to update if needed
 * @returns CheckResult with existing transfer ID (if any) and whether to create a new transfer
 */
export async function checkExistingTransfer(
  stripe: Stripe,
  chargeId: string,
  transferRecord: { id: number; paymentIntentId: string },
): Promise<CheckResult> {
  // Retrieve the charge to check if it has any transfers already
  const charge = await stripe.charges.retrieve(chargeId, {
    expand: ['transfer'],
  });

  // Check if a transfer already exists for this charge
  if (charge.transfer) {
    const existingTransferId =
      typeof charge.transfer === 'string' ? charge.transfer : charge.transfer.id;

    console.log(
      `⚠️ Transfer ${existingTransferId} already exists for charge ${chargeId}, skipping creation`,
    );

    // Update our database record with the existing transfer ID
    await db
      .update(PaymentTransferTable)
      .set({
        status: PAYMENT_TRANSFER_STATUS_COMPLETED,
        transferId: existingTransferId,
        updated: new Date(),
      })
      .where(eq(PaymentTransferTable.id, transferRecord.id));

    console.log(
      `✅ Updated database record ${transferRecord.id} with existing transfer ID: ${existingTransferId}`,
    );

    return {
      existingTransferId,
      shouldCreateTransfer: false,
    };
  }

  return {
    existingTransferId: null,
    shouldCreateTransfer: true,
  };
}
