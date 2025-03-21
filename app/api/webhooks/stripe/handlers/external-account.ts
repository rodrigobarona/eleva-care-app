import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { createUserNotification } from '@/lib/notifications';
import { withRetry } from '@/lib/stripe';
import { eq } from 'drizzle-orm';
import type { Stripe } from 'stripe';

export async function handleExternalAccountCreated(
  externalAccount: Stripe.BankAccount | Stripe.Card,
  accountId: string,
) {
  console.log('External account added:', externalAccount.id);

  // Find the user associated with this Connect account
  const user = await db.query.UserTable.findFirst({
    where: eq(UserTable.stripeConnectAccountId, accountId),
  });

  if (!user) {
    console.error('User not found for Connect account:', accountId);
    return;
  }

  // Create notification for the user with retry
  try {
    await withRetry(
      async () => {
        await db.transaction(async (_tx) => {
          await createUserNotification({
            userId: user.id,
            type: 'ACCOUNT_UPDATE',
            title: externalAccount.object === 'bank_account' ? 'Bank Account Added' : 'Card Added',
            message:
              externalAccount.object === 'bank_account'
                ? 'Your bank account has been successfully added to your Stripe Connect account.'
                : 'Your card has been successfully added to your Stripe Connect account.',
            actionUrl: '/account/connect',
          });
        });
      },
      3,
      1000,
    );
  } catch (error) {
    console.error('Error creating notification after retries:', error);
  }
}

export async function handleExternalAccountDeleted(
  externalAccount: Stripe.BankAccount | Stripe.Card,
  accountId: string,
) {
  console.log('External account removed:', externalAccount.id);

  // Find the user associated with this Connect account
  const user = await db.query.UserTable.findFirst({
    where: eq(UserTable.stripeConnectAccountId, accountId),
  });

  if (!user) {
    console.error('User not found for Connect account:', accountId);
    return;
  }

  // Create notification for the user
  await db.transaction(async (_tx) => {
    await createUserNotification({
      userId: user.id,
      type: 'ACCOUNT_UPDATE',
      title: externalAccount.object === 'bank_account' ? 'Bank Account Removed' : 'Card Removed',
      message:
        externalAccount.object === 'bank_account'
          ? 'A bank account has been removed from your Stripe Connect account.'
          : 'A card has been removed from your Stripe Connect account.',
      actionUrl: '/account/connect',
    });
  });
}
