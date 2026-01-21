import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { handlePayoutFailed, handlePayoutPaid } from '../stripe/handlers/payout';

// Add route segment config
export const preferredRegion = 'auto';
export const maxDuration = 60;

// Add GET handler to quickly return 405 Method Not Allowed
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

// Configure the request handler
export const POST = async (request: Request) => {
  let eventType = 'unknown';
  let eventId = 'unknown';

  try {
    // Log the request info (useful for debugging)
    console.log('Received webhook request to /api/webhooks/stripe-connect');

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
      console.error('Missing Stripe Connect webhook secret');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    if (!signature) {
      console.error('Missing Stripe signature header');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
    });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
      );

      eventType = event.type;
      eventId = event.id;
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    console.log('Received Stripe Connect webhook event:', {
      type: event.type,
      id: event.id,
      timestamp: new Date().toISOString(),
    });

    // Handle the event
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await db
          .update(UserTable)
          .set({
            stripeConnectAccountId: account.id,
            stripeConnectDetailsSubmitted: account.details_submitted,
            stripeConnectChargesEnabled: account.charges_enabled,
            stripeConnectPayoutsEnabled: account.payouts_enabled,
            stripeConnectOnboardingComplete:
              account.details_submitted && account.charges_enabled && account.payouts_enabled,
            updatedAt: new Date(),
          })
          .where(eq(UserTable.stripeConnectAccountId, account.id));

        console.log('Updated Connect account status:', {
          accountId: account.id,
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'account.application.deauthorized': {
        const application = event.data.object as { id: string };

        // Remove Stripe Connect account association
        await db
          .update(UserTable)
          .set({
            stripeConnectAccountId: null,
            stripeConnectDetailsSubmitted: false,
            stripeConnectChargesEnabled: false,
            stripeConnectPayoutsEnabled: false,
            stripeConnectOnboardingComplete: false,
            updatedAt: new Date(),
          })
          .where(eq(UserTable.stripeConnectAccountId, application.id));

        console.log('Deauthorized Connect account:', {
          accountId: application.id,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'account.external_account.created':
      case 'account.external_account.updated':
      case 'account.external_account.deleted': {
        const externalAccount = event.data.object as Stripe.BankAccount | Stripe.Card;
        const eventType = event.type.split('.').pop(); // 'created', 'updated', or 'deleted'

        // Update user's bank account status
        if ('bank_name' in externalAccount && typeof externalAccount.account === 'string') {
          await db
            .update(UserTable)
            .set({
              stripeBankAccountLast4: externalAccount.last4,
              stripeBankName: externalAccount.bank_name,
              updatedAt: new Date(),
            })
            .where(eq(UserTable.stripeConnectAccountId, externalAccount.account));
        }

        console.log(`Bank account ${eventType} for Connect account:`, {
          accountId: externalAccount.account,
          last4: externalAccount.last4,
          bankName: 'bank_name' in externalAccount ? externalAccount.bank_name : undefined,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'payout.created': {
        const payout = event.data.object as Stripe.Payout;
        console.log('Payout created:', {
          payoutId: payout.id,
          accountId: payout.destination,
          amount: payout.amount,
          currency: payout.currency,
          arrivalDate: payout.arrival_date
            ? new Date(payout.arrival_date * 1000).toISOString()
            : null,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        console.log('Payout paid:', {
          payoutId: payout.id,
          accountId: payout.destination,
          amount: payout.amount,
          currency: payout.currency,
          arrivalDate: payout.arrival_date
            ? new Date(payout.arrival_date * 1000).toISOString()
            : null,
          timestamp: new Date().toISOString(),
        });

        // Send payout notification to expert (wrapped in try-catch to prevent webhook failures)
        try {
          await handlePayoutPaid(payout);
        } catch (payoutHandlerError) {
          console.error('Error in handlePayoutPaid, continuing webhook processing:', {
            payoutId: payout.id,
            error:
              payoutHandlerError instanceof Error ? payoutHandlerError.message : payoutHandlerError,
          });
        }
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout;

        // Update user's payout status
        if (typeof payout.destination === 'string') {
          await db
            .update(UserTable)
            .set({
              stripeConnectPayoutsEnabled: false,
              updatedAt: new Date(),
            })
            .where(eq(UserTable.stripeConnectAccountId, payout.destination));
        }

        console.log('Payout failed:', {
          payoutId: payout.id,
          accountId: payout.destination,
          amount: payout.amount,
          currency: payout.currency,
          failureCode: payout.failure_code,
          failureMessage: payout.failure_message,
          timestamp: new Date().toISOString(),
        });

        // Send payout failure notification to expert
        await handlePayoutFailed(payout);
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true, status: 'success' });
  } catch (error) {
    console.error('Error in Stripe Connect webhook:', {
      error,
      eventType,
      eventId,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 },
    );
  }
};
