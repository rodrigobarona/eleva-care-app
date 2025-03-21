import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { createUserNotification } from '@/lib/notifications';
import { withRetry } from '@/lib/stripe';
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

/**
 * Handles updates to a user's Stripe Connect account status
 * Implements retry logic for critical operations to ensure robustness
 */
export async function handleAccountUpdated(account: Stripe.Account) {
  console.log('Connect account updated:', account.id);

  // Find the user associated with this account
  let user = await db.query.UserTable.findFirst({
    where: eq(UserTable.stripeConnectAccountId, account.id),
  });

  if (!user) {
    // Try additional lookup methods if available
    if (account.metadata?.user_id) {
      user = await db.query.UserTable.findFirst({
        where: eq(UserTable.id, account.metadata.user_id),
      });
    }

    // Try looking up by email if available
    if (!user && account.email) {
      user = await db.query.UserTable.findFirst({
        where: eq(UserTable.email, account.email),
      });
    }

    if (!user) {
      console.error('User not found for Connect account:', {
        accountId: account.id,
        metadata: account.metadata,
        email: account.email,
      });
      return;
    }
  }

  const previousPayoutsEnabled = user.stripeConnectPayoutsEnabled;
  const previousChargesEnabled = user.stripeConnectChargesEnabled;

  try {
    // Use withRetry for the critical database operations to handle transient errors
    await withRetry(
      async () => {
        // Use a transaction to ensure all operations succeed or fail together
        await db.transaction(async (tx) => {
          // Update user record
          await tx
            .update(UserTable)
            .set({
              stripeConnectDetailsSubmitted: account.details_submitted,
              stripeConnectPayoutsEnabled: account.payouts_enabled,
              stripeConnectChargesEnabled: account.charges_enabled,
              stripeConnectOnboardingComplete: account.charges_enabled && account.payouts_enabled,
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
      },
      3,
      1000,
    ); // Retry up to 3 times with 1s initial delay (doubles each retry)
  } catch (error) {
    console.error('Error updating Connect account status after retries:', error);

    // Store the failed operation for manual recovery
    // This could be logged to a database table or monitoring system
    const operationDetails = {
      operation: 'connect-account-update',
      accountId: account.id,
      userId: user.id,
      status: {
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      },
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };

    // Log to a persistent store for administrative review
    console.error('Critical operation failed, needs manual intervention:', operationDetails);

    // In a production environment, you might want to:
    // 1. Log to error tracking system (Sentry, Datadog, etc.)
    // 2. Add to a dead letter queue for later processing
    // 3. Send alerts to administrators
    // 4. Record in a dedicated "failed_operations" table
  }
}
