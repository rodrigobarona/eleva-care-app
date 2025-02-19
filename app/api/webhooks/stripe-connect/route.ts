import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Add route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? '';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature') ?? '';

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', {
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      return new NextResponse('Invalid signature', { status: 400 });
    }

    console.log('Received Stripe Connect webhook event:', {
      type: event.type,
      id: event.id,
      timestamp: new Date().toISOString(),
    });

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;

        // Update user's Stripe Connect status
        await db
          .update(UserTable)
          .set({
            stripeConnectOnboardingComplete: account.details_submitted,
            stripeConnectPayoutsEnabled: account.payouts_enabled,
            updatedAt: new Date(),
          })
          .where(eq(UserTable.stripeConnectAccountId, account.id));

        console.log('Updated Connect account status:', {
          accountId: account.id,
          detailsSubmitted: account.details_submitted,
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
            stripeConnectOnboardingComplete: false,
            stripeConnectPayoutsEnabled: false,
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

        if (!payout.metadata?.transfer_id) {
          console.error('Missing transfer_id in payout metadata:', payout.id);
          break;
        }

        const transfer = await stripe.transfers.retrieve(payout.metadata.transfer_id);

        console.log('Payout initiated:', {
          payoutId: payout.id,
          accountId: payout.destination,
          amount: payout.amount,
          currency: payout.currency,
          meetingId: transfer.metadata.meetingId,
          customerName: transfer.metadata.customerName,
          customerEmail: transfer.metadata.customerEmail,
          meetingStartTime: transfer.metadata.meetingStartTime,
          payoutScheduledFor: transfer.metadata.payoutScheduledFor,
          arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout;

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
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;

        console.log('Payout successful:', {
          payoutId: payout.id,
          accountId: payout.destination,
          amount: payout.amount,
          currency: payout.currency,
          arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
          timestamp: new Date().toISOString(),
        });
        break;
      }
    }

    return new NextResponse('Webhook processed', { status: 200 });
  } catch (error) {
    console.error('Webhook processing failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    return new NextResponse(error instanceof Error ? error.message : 'Webhook Error', {
      status: 500,
    });
  }
}
