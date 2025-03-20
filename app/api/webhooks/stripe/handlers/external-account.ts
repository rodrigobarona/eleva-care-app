import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { createUserNotification } from '@/lib/notifications';
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

  // Create notification for the user
  await createUserNotification({
    userId: user.id,
    type: 'ACCOUNT_UPDATE',
    title: 'Bank Account Added',
    message: 'Your bank account has been successfully added to your Stripe Connect account.',
    actionUrl: '/account/connect',
  });
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
  await createUserNotification({
    userId: user.id,
    type: 'ACCOUNT_UPDATE',
    title: 'Bank Account Removed',
    message: 'A bank account has been removed from your Stripe Connect account.',
    actionUrl: '/account/connect',
  });
}
