import { triggerWorkflow } from '@/app/utils/novu';
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { addDays, format } from 'date-fns';
import { eq } from 'drizzle-orm';
import type { Stripe } from 'stripe';

/**
 * Handles Stripe Connect payout events for marketplace payments
 */
export async function handlePayoutPaid(payout: Stripe.Payout) {
  console.log('Payout processed:', payout.id);

  try {
    // Extract the destination account ID - it should be a string for Connect accounts
    const destinationAccountId = typeof payout.destination === 'string' ? payout.destination : null;

    if (!destinationAccountId) {
      console.error('Invalid payout destination type:', typeof payout.destination);
      return;
    }

    // Find the user associated with this Connect account
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.stripeConnectAccountId, destinationAccountId),
    });

    if (!user) {
      console.error('User not found for Connect account:', destinationAccountId);
      return;
    }

    // Calculate expected arrival date based on payout arrival_date or estimate
    const arrivalDate = payout.arrival_date
      ? new Date(payout.arrival_date * 1000)
      : addDays(new Date(), 2); // Default 2 business days

    const expectedArrival = format(arrivalDate, 'EEEE, MMMM d, yyyy');
    const amount = (payout.amount / 100).toFixed(2); // Convert cents to euros

    // Get bank account details (simplified)
    const bankAccount = `****${destinationAccountId.slice(-4)}`;

    // Trigger Novu workflow for payout notification
    try {
      const payload = {
        amount,
        payoutId: payout.id,
        expectedArrival,
        bankAccount,
        dashboardUrl: '/account/billing',
      };

      await triggerWorkflow({
        workflowId: 'marketplace-payout-processed',
        to: {
          subscriberId: user.clerkUserId,
          email: user.email || 'no-email@eleva.care',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          data: {
            stripeAccountId: typeof payout.destination === 'string' ? payout.destination : '',
            role: 'expert',
          },
        },
        payload,
        actor: {
          subscriberId: 'system',
          data: {
            source: 'stripe-webhook',
            payoutId: payout.id,
            timestamp: new Date().toISOString(),
          },
        },
      });
      console.log('✅ Marketplace payout notification sent via Novu');
    } catch (novuError) {
      console.error('❌ Failed to trigger marketplace payout notification:', novuError);
    }
  } catch (error) {
    console.error(`Error in handlePayoutPaid for payout ${payout.id}:`, error);
  }
}

export async function handlePayoutFailed(payout: Stripe.Payout) {
  console.log('Payout failed:', payout.id);

  try {
    // Extract the destination account ID - it should be a string for Connect accounts
    const destinationAccountId = typeof payout.destination === 'string' ? payout.destination : null;

    if (!destinationAccountId) {
      console.error('Invalid payout destination type:', typeof payout.destination);
      return;
    }

    // Find the user associated with this Connect account
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.stripeConnectAccountId, destinationAccountId),
    });

    if (!user) {
      console.error('User not found for Connect account:', destinationAccountId);
      return;
    }

    const amount = (payout.amount / 100).toFixed(2);
    const failureReason = payout.failure_message || 'Unknown reason';

    // Trigger Novu workflow for payout failure notification
    try {
      const payload = {
        title: 'Payout Failed',
        message: `Your payout of €${amount} has failed. Reason: ${failureReason}. Please check your bank account details and contact support if needed.`,
        requiresAction: true,
        actionRequired: 'Check your bank account details in your Stripe dashboard',
        actionUrl: '/account/connect',
      };

      await triggerWorkflow({
        workflowId: 'marketplace-connect-status',
        to: {
          subscriberId: user.clerkUserId,
          email: user.email || 'no-email@eleva.care',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          data: {
            stripeAccountId: destinationAccountId || '',
            role: 'expert',
          },
        },
        payload,
        actor: {
          subscriberId: 'system',
          data: {
            source: 'stripe-webhook',
            payoutId: payout.id,
            timestamp: new Date().toISOString(),
          },
        },
      });
      console.log('✅ Marketplace payout failure notification sent via Novu');
    } catch (novuError) {
      console.error('❌ Failed to trigger marketplace payout failure notification:', novuError);
    }
  } catch (error) {
    console.error(`Error in handlePayoutFailed for payout ${payout.id}:`, error);
  }
}
