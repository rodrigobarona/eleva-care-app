import { isExpert } from '@/lib/auth/roles.server';
import { sendDebugTelemetry } from '@/lib/utils/debug-telemetry';
import { markStepComplete } from '@/server/actions/expert-setup';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { BillingPageClient } from './billing-client';

// Force dynamic rendering to prevent static prerendering without Clerk credentials
export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const { userId, getToken } = await auth();

  // Debug telemetry - gated and redacted
  sendDebugTelemetry({
    location: 'billing/page.tsx:entry',
    message: 'BillingPage entry',
    data: { userId, hasUserId: !!userId },
    hypothesisId: 'A,C',
  });

  // Check if user has expert role, redirect to unauthorized if not
  if (!userId || !(await isExpert())) {
    return redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);
  }

  try {
    const token = await getToken();

    // Debug telemetry - gated and redacted
    sendDebugTelemetry({
      location: 'billing/page.tsx:token',
      message: 'Token obtained',
      data: { hasToken: !!token, tokenLength: token?.length },
      hypothesisId: 'C',
    });

    if (!token) {
      return (
        <div className="container flex min-h-[400px] items-center justify-center">
          <p className="text-destructive">Authentication error. Please log in again.</p>
        </div>
      );
    }

    const fetchUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/user/billing`;

    // Debug telemetry - gated and redacted
    sendDebugTelemetry({
      location: 'billing/page.tsx:fetch-start',
      message: 'Starting fetch',
      data: { fetchUrl, envVar: process.env.NEXT_PUBLIC_APP_URL },
      hypothesisId: 'B',
    });

    const response = await fetch(fetchUrl, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    // Debug telemetry - gated and redacted
    sendDebugTelemetry({
      location: 'billing/page.tsx:fetch-response',
      message: 'Fetch response received',
      data: { ok: response.ok, status: response.status, statusText: response.statusText },
      hypothesisId: 'B,D',
    });

    if (!response.ok) {
      throw new Error('Failed to load billing data');
    }

    const data = await response.json();

    // Debug telemetry - gated and redacted
    sendDebugTelemetry({
      location: 'billing/page.tsx:data-parsed',
      message: 'Data parsed',
      data: {
        hasData: !!data,
        hasUser: !!data?.user,
        userKeys: data?.user ? Object.keys(data.user) : [],
        hasAccountStatus: !!data?.accountStatus,
      },
      hypothesisId: 'A,D',
    });

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

    // Debug telemetry - gated and redacted
    sendDebugTelemetry({
      location: 'billing/page.tsx:render',
      message: 'Rendering BillingPageClient',
      data: {
        userId: data.user.id,
        hasStripeConnectAccountId: !!data.user.stripeConnectAccountId,
        hasStripeIdentityVerified: 'stripeIdentityVerified' in data.user,
        stripeIdentityVerifiedValue: data.user.stripeIdentityVerified,
      },
      hypothesisId: 'A',
    });

    return <BillingPageClient dbUser={data.user} accountStatus={data.accountStatus} />;
  } catch (error) {
    // Debug telemetry - gated and redacted (no stack traces)
    sendDebugTelemetry({
      location: 'billing/page.tsx:catch',
      message: 'Error caught',
      data: {
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      hypothesisId: 'E',
    });

    return (
      <div className="container flex min-h-[400px] items-center justify-center">
        <p className="text-destructive">Failed to load billing data. Please try again later.</p>
      </div>
    );
  }
}
