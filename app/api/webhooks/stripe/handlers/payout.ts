import { triggerWorkflow } from '@/app/utils/novu';
import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema-workos';
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
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.stripeConnectAccountId, destinationAccountId),
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

    // Trigger Novu workflow for payout notification
    try {
      await triggerWorkflow({
        workflowId: 'expert-payout-notification',
        to: {
          subscriberId: user.workosUserId,
          email: user.email || 'no-email@eleva.care',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        },
        payload: {
          expertName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Expert',
          payoutAmount: amount,
          currency: 'EUR',
          appointmentDate: format(new Date(), 'EEEE, MMMM d, yyyy'),
          appointmentTime: format(new Date(), 'h:mm a'),
          clientName: 'Client', // Could be enhanced to get actual client data
          serviceName: 'Professional consultation',
          payoutId: payout.id,
          expectedArrivalDate: expectedArrival,
          bankLastFour: destinationAccountId.slice(-4),
          dashboardUrl: '/account/billing',
          supportUrl: '/support',
          locale: 'en',
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
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.stripeConnectAccountId, destinationAccountId),
    });

    if (!user) {
      console.error('User not found for Connect account:', destinationAccountId);
      return;
    }

    const amount = (payout.amount / 100).toFixed(2);
    const failureReason = payout.failure_message || 'Unknown reason';

    // Trigger Novu workflow for payout failure notification
    try {
      await triggerWorkflow({
        workflowId: 'marketplace-universal',
        to: {
          subscriberId: user.workosUserId,
          email: user.email || 'no-email@eleva.care',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        },
        payload: {
          eventType: 'payout-failed',
          amount: `€${amount}`,
          expertName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Expert',
          accountStatus: 'action_required',
          message: `Your payout of €${amount} has failed. Reason: ${failureReason}. Please check your bank account details and contact support if needed.`,
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
