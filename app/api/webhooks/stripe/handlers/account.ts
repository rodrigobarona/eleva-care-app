import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { createUserNotification } from '@/lib/notifications';
import { markStepCompleteForUser } from '@/server/actions/expert-setup';
import { eq } from 'drizzle-orm';
import type { Stripe } from 'stripe';

// Helper function to generate account update message
export function getAccountUpdateMessage(account: Stripe.Account): string {
  if (account.charges_enabled && account.payouts_enabled) {
    return 'Your Stripe Connect account has been fully activated. You can now receive payments for your services.';
  }
  if (account.details_submitted) {
    return "Your account details are being reviewed by Stripe. This usually takes 24-48 hours. We'll notify you once your account is fully activated.";
  }
  return 'Your account status has been updated. Please complete the required information to activate your payment account.';
}

export async function handleAccountUpdated(account: Stripe.Account) {
  console.log('Connect account updated:', account.id);

  // Find the user associated with this account
  const user = await db.query.UserTable.findFirst({
    where: eq(UserTable.stripeConnectAccountId, account.id),
  });

  if (!user) {
    console.error('User not found for Connect account:', account.id);
    return;
  }

  const previousPayoutsEnabled = user.stripeConnectPayoutsEnabled;
  const previousChargesEnabled = user.stripeConnectChargesEnabled;

  try {
    // Use a transaction to ensure all operations succeed or fail together
    await db.transaction(async (tx) => {
      // Update user record
      await tx
        .update(UserTable)
        .set({
          stripeConnectDetailsSubmitted: account.details_submitted,
          stripeConnectPayoutsEnabled: account.payouts_enabled,
          stripeConnectChargesEnabled: account.charges_enabled,
          updatedAt: new Date(),
        })
        .where(eq(UserTable.id, user.id));

      // If account is fully enabled, mark payment step as complete
      if (account.charges_enabled && account.payouts_enabled) {
        await markStepCompleteForUser('payment', user.clerkUserId);
      }

      // Create notification if payout or charges status has changed
      if (
        previousPayoutsEnabled !== account.payouts_enabled ||
        previousChargesEnabled !== account.charges_enabled
      ) {
        await createUserNotification({
          userId: user.id,
          type: 'ACCOUNT_UPDATE',
          title: 'Account Status Updated',
          message: getAccountUpdateMessage(account),
          actionUrl: '/account/connect',
        });
      }
    });
  } catch (error) {
    console.error('Error updating Connect account status:', error);
    // Consider additional error handling or retry logic here
  }
}
