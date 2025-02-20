import { auth } from '@clerk/nextjs/server';

import { BillingPageClient } from './billing-client';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function BillingPage() {
  const { getToken } = await auth();

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/user/billing`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getToken()}`,
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

    return <BillingPageClient dbUser={data.user} accountStatus={data.accountStatus} />;
  } catch {
    return (
      <div className="container flex min-h-[400px] items-center justify-center">
        <p className="text-destructive">Failed to load billing data. Please try again later.</p>
      </div>
    );
  }
}
