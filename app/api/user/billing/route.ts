import { STRIPE_CONFIG } from '@/config/stripe';
import { getStripeConnectAccountStatus } from '@/lib/stripe';
import { ensureFullUserSynchronization } from '@/server/actions/user-sync';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

export async function GET() {
  let clerkUserId: string | null = null;

  try {
    // Get the authenticated user ID
    const { userId } = await auth();
    clerkUserId = userId;
    console.log('Auth check result:', { userId, hasId: !!userId });

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use our synchronization service to ensure all systems are in sync
    const user = await ensureFullUserSynchronization(userId);

    if (!user) {
      console.error('Failed to synchronize user:', { clerkUserId: userId });
      return NextResponse.json({ error: 'User synchronization failed' }, { status: 500 });
    }

    // Fetch customer data from Stripe directly
    let customerData: Stripe.Customer | null = null;
    try {
      if (user.stripeCustomerId) {
        const customerResponse = await stripe.customers.retrieve(user.stripeCustomerId);
        if (!('deleted' in customerResponse)) {
          customerData = customerResponse;
          console.log('Retrieved customer data:', {
            customerId: customerData.id,
            hasDefaultPaymentMethod: !!customerData.invoice_settings?.default_payment_method,
          });
        }
      }
    } catch (stripeError) {
      console.error('Error retrieving Stripe customer:', stripeError);
    }

    // Get Stripe account status if connected
    let accountStatus = null;
    if (user.stripeConnectAccountId) {
      try {
        accountStatus = await getStripeConnectAccountStatus(user.stripeConnectAccountId);
      } catch (stripeError) {
        console.error('Error retrieving Stripe Connect account status:', stripeError);
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        stripeConnectAccountId: user.stripeConnectAccountId,
      },
      customer: customerData
        ? {
            id: customerData.id,
            defaultPaymentMethod: customerData.invoice_settings?.default_payment_method || null,
            email: customerData.email,
          }
        : null,
      accountStatus,
    });
  } catch (error) {
    console.error('Error in user billing API:', {
      error,
      clerkUserId,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
