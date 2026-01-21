import { isExpert } from '@/lib/auth/roles.server';
import { markStepComplete } from '@/server/actions/expert-setup';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { BillingPageClient } from './billing-client';

// Force dynamic rendering to prevent static prerendering without Clerk credentials
export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const { userId, getToken } = await auth();

  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/5ec49622-4f23-4e7d-b9b7-b1ff787148b0', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'billing/page.tsx:entry',
      message: 'BillingPage entry',
      data: { userId, hasUserId: !!userId },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      hypothesisId: 'A,C',
    }),
  }).catch(() => {});
  // #endregion

  // Check if user has expert role, redirect to unauthorized if not
  if (!userId || !(await isExpert())) {
    return redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);
  }

  try {
    const token = await getToken();
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/5ec49622-4f23-4e7d-b9b7-b1ff787148b0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'billing/page.tsx:token',
        message: 'Token obtained',
        data: { hasToken: !!token, tokenLength: token?.length },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'C',
      }),
    }).catch(() => {});
    // #endregion
    if (!token) {
      return (
        <div className="container flex min-h-[400px] items-center justify-center">
          <p className="text-destructive">Authentication error. Please log in again.</p>
        </div>
      );
    }

    const fetchUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/user/billing`;
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/5ec49622-4f23-4e7d-b9b7-b1ff787148b0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'billing/page.tsx:fetch-start',
        message: 'Starting fetch',
        data: { fetchUrl, envVar: process.env.NEXT_PUBLIC_APP_URL },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'B',
      }),
    }).catch(() => {});
    // #endregion

    const response = await fetch(fetchUrl, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/5ec49622-4f23-4e7d-b9b7-b1ff787148b0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'billing/page.tsx:fetch-response',
        message: 'Fetch response received',
        data: { ok: response.ok, status: response.status, statusText: response.statusText },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'B,D',
      }),
    }).catch(() => {});
    // #endregion

    if (!response.ok) {
      throw new Error('Failed to load billing data');
    }

    const data = await response.json();

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/5ec49622-4f23-4e7d-b9b7-b1ff787148b0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'billing/page.tsx:data-parsed',
        message: 'Data parsed',
        data: {
          hasData: !!data,
          hasUser: !!data?.user,
          userKeys: data?.user ? Object.keys(data.user) : [],
          hasAccountStatus: !!data?.accountStatus,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'A,D',
      }),
    }).catch(() => {});
    // #endregion

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

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/5ec49622-4f23-4e7d-b9b7-b1ff787148b0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'billing/page.tsx:render',
        message: 'Rendering BillingPageClient',
        data: {
          userId: data.user.id,
          hasStripeConnectAccountId: !!data.user.stripeConnectAccountId,
          hasStripeIdentityVerified: 'stripeIdentityVerified' in data.user,
          stripeIdentityVerifiedValue: data.user.stripeIdentityVerified,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion

    return <BillingPageClient dbUser={data.user} accountStatus={data.accountStatus} />;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/5ec49622-4f23-4e7d-b9b7-b1ff787148b0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'billing/page.tsx:catch',
        message: 'Error caught',
        data: {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'E',
      }),
    }).catch(() => {});
    // #endregion
    return (
      <div className="container flex min-h-[400px] items-center justify-center">
        <p className="text-destructive">Failed to load billing data. Please try again later.</p>
      </div>
    );
  }
}
