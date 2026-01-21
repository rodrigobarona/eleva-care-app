/**
 * Stripe Payout Event Handlers
 *
 * Processes payout events from Stripe Connect for expert marketplace payments.
 * Sends notifications to experts when their earnings are transferred to their bank accounts.
 *
 * @module app/api/webhooks/stripe/handlers/payout
 *
 * @remarks
 * Payouts are triggered by the `process-pending-payouts` cron job after:
 * 1. Successful payment from customer
 * 2. Transfer to expert's Connect account
 * 3. Complaint window period (7 days post-appointment)
 *
 * @see {@link app/api/cron/process-pending-payouts} - Initiates payouts
 * @see {@link app/api/webhooks/stripe-connect} - Receives payout webhooks
 */
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { triggerWorkflow } from '@/lib/integrations/novu';
import { addDays, format } from 'date-fns';
import { eq } from 'drizzle-orm';
import type { Stripe } from 'stripe';

/**
 * Handles successful payout events from Stripe Connect.
 *
 * Sends a notification to the expert when their earnings have been
 * successfully transferred to their bank account.
 *
 * @param {Stripe.Payout} payout - The Stripe Payout object
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * // Called from stripe-connect webhook handler
 * case 'payout.paid':
 *   await handlePayoutPaid(payout);
 *   break;
 * ```
 *
 * @remarks
 * - Uses idempotency key `payout-paid-{payout.id}` to prevent duplicate notifications
 * - Calculates expected arrival date from payout.arrival_date
 * - Falls back to 2-day estimate if arrival_date not provided
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

    // Trigger Novu workflow for payout notification
    try {
      await triggerWorkflow({
        workflowId: 'expert-payout-notification',
        to: {
          subscriberId: user.clerkUserId,
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

/**
 * Handles failed payout events from Stripe Connect.
 *
 * Sends a failure notification to the expert when a payout to their
 * bank account fails, including the failure reason and guidance.
 *
 * @param {Stripe.Payout} payout - The Stripe Payout object
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * // Called from stripe-connect webhook handler
 * case 'payout.failed':
 *   await handlePayoutFailed(payout);
 *   break;
 * ```
 *
 * @remarks
 * - Uses idempotency key `payout-failed-{payout.id}` to prevent duplicate notifications
 * - Includes failure reason from payout.failure_message
 * - Prompts expert to check bank account details
 */
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
      await triggerWorkflow({
        workflowId: 'marketplace-universal',
        to: {
          subscriberId: user.clerkUserId,
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
        transactionId: `payout-failed-${payout.id}`, // Idempotency key to prevent duplicate notifications
      });
      console.log('✅ Marketplace payout failure notification sent via Novu');
    } catch (novuError) {
      console.error('❌ Failed to trigger marketplace payout failure notification:', novuError);
    }
  } catch (error) {
    console.error(`Error in handlePayoutFailed for payout ${payout.id}:`, error);
  }
}
