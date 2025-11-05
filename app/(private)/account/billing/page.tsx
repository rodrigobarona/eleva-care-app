import { requireAuth } from '@/lib/auth/workos-session';
import { isUserExpert } from '@/lib/integrations/workos/roles';
import { markStepComplete } from '@/server/actions/expert-setup-workos';
import { redirect } from 'next/navigation';

import { BillingPageClient } from './billing-client';

// Note: Route is dynamic by default with cacheComponents enabled in Next.js 16

/**
 * Billing Page - WorkOS Implementation
 *
 * Experts can manage Stripe Connect account and payouts.
 * Uses WorkOS session for authentication and JWT for API calls.
 */
export default async function BillingPage() {
  // Require authentication - auto-redirects if not logged in
  const session = await requireAuth();

  // Check if user has expert role, redirect if not
  if (!(await isUserExpert(session.userId))) {
    return redirect('/dashboard');
  }

  try {
    // Use WorkOS access token for API authentication
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/user/billing`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to load billing data');
    }

    const data = await response.json();

    if (!data || !data.user) {
      return (
        <div className="container flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">No billing data available.</p>
        </div>
      );
    }

    // If Stripe Connect account is set up, mark the payment step as complete
    if (
      data.user.stripeConnectAccountId &&
      data.accountStatus?.detailsSubmitted &&
      data.accountStatus?.payoutsEnabled
    ) {
      // Mark payment step as complete (non-blocking)
      markStepComplete('payment').catch((error) => {
        console.error('Failed to mark payment step as complete:', error);
      });
    }

    return <BillingPageClient dbUser={data.user} accountStatus={data.accountStatus} />;
  } catch {
    return (
      <div className="container flex min-h-[400px] items-center justify-center">
        <p className="text-destructive">Failed to load billing data. Please try again later.</p>
      </div>
    );
  }
}
