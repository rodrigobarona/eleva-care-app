import { STRIPE_CONFIG } from '@/config/stripe';
import { getStripeConnectAccountStatus } from '@/lib/integrations/stripe';
import { ensureFullUserSynchronization } from '@/server/actions/user-sync';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Mark route as dynamic

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

export async function GET() {
  let workosUserId: string | null = null;

  try {
    // Get the authenticated user ID
    const { user } = await withAuth();
    const userId = user?.id;
    workosUserId = userId ?? null;
    console.log('Auth check result:', { userId, hasId: !!userId });

    if (!user || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use our synchronization service to ensure all systems are in sync
    const dbUser = await ensureFullUserSynchronization(userId);

    if (!dbUser) {
      console.error('Failed to synchronize user:', { workosUserId: userId });
      return NextResponse.json({ error: 'User synchronization failed' }, { status: 500 });
    }

    // Fetch customer data from Stripe directly
    let customerData: Stripe.Customer | null = null;
    try {
      if (dbUser.stripeCustomerId) {
        const customerResponse = await stripe.customers.retrieve(dbUser.stripeCustomerId);
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
    if (dbUser.stripeConnectAccountId) {
      try {
        accountStatus = await getStripeConnectAccountStatus(dbUser.stripeConnectAccountId);
      } catch (stripeError) {
        console.error('Error retrieving Stripe Connect account status:', stripeError);
      }
    }

    return NextResponse.json({
      user: {
        id: dbUser.id,
        stripeConnectAccountId: dbUser.stripeConnectAccountId,
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
      workosUserId,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
