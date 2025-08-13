import { isExpert } from '@/lib/auth/roles.server';
import { markStepComplete } from '@/server/actions/expert-setup';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { BillingPageClient } from './billing-client';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function BillingPage() {
  const { userId, getToken } = await auth();

  // Check if user has expert role, redirect to unauthorized if not
  if (!userId || !(await isExpert())) {
    return redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);
  }

  try {
    const token = await getToken();
    if (!token) {
      return (
        <div className="container flex min-h-[400px] items-center justify-center">
          <p className="text-destructive">Authentication error. Please log in again.</p>
        </div>
      );
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/user/billing`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
      // Note: markStepComplete already handles revalidatePath internally
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
