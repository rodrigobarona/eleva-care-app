import { STRIPE_CONFIG } from '@/config/stripe';
import { getStripeConnectAccountStatus } from '@/lib/integrations/stripe';
import { redactResponsePayload, sendDebugTelemetry } from '@/lib/utils/debug-telemetry';
import { ensureFullUserSynchronization } from '@/server/actions/user-sync';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Mark route as dynamic

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

    // Debug telemetry - gated and redacted
    sendDebugTelemetry({
      location: 'api/user/billing:auth',
      message: 'Auth result',
      data: { userId, hasId: !!userId },
      hypothesisId: 'C',
    });

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use our synchronization service to ensure all systems are in sync
    const user = await ensureFullUserSynchronization(userId);

    // Debug telemetry - gated and redacted
    sendDebugTelemetry({
      location: 'api/user/billing:sync',
      message: 'User sync result',
      data: {
        hasUser: !!user,
        userId: user?.id,
        stripeIdentityVerified: user?.stripeIdentityVerified,
        stripeConnectAccountId: user?.stripeConnectAccountId,
        allUserKeys: user ? Object.keys(user) : [],
      },
      hypothesisId: 'A',
    });

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

    const responsePayload = {
      user: {
        id: user.id,
        stripeConnectAccountId: user.stripeConnectAccountId,
        stripeIdentityVerified: user.stripeIdentityVerified,
      },
      customer: customerData
        ? {
            id: customerData.id,
            defaultPaymentMethod: customerData.invoice_settings?.default_payment_method || null,
            email: customerData.email,
          }
        : null,
      accountStatus,
    };

    // Debug telemetry - gated and redacted (uses special response payload redactor)
    sendDebugTelemetry({
      location: 'api/user/billing:response',
      message: 'Sending response',
      data: redactResponsePayload(responsePayload as Record<string, unknown>),
      hypothesisId: 'A,D',
    });

    // #region agent log - console for Vercel
    console.log('[DEBUG api/user/billing:response]', {
      userKeys: Object.keys(responsePayload.user),
      hasAccountStatus: !!responsePayload.accountStatus,
      hasStripeIdentityVerified: 'stripeIdentityVerified' in responsePayload.user,
    });
    // #endregion

    return NextResponse.json(responsePayload);
  } catch (error) {
    // Debug telemetry - gated and redacted
    sendDebugTelemetry({
      location: 'api/user/billing:error',
      message: 'API error',
      data: { errorMessage: error instanceof Error ? error.message : String(error) },
      hypothesisId: 'E',
    });

    console.error('Error in user billing API:', {
      error,
      clerkUserId,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
