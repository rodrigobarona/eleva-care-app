import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { BillingPageClient } from './billing-client';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function BillingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/user/billing`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!data.user) {
      redirect('/sign-in');
    }

    return <BillingPageClient dbUser={data.user} accountStatus={data.accountStatus} />;
  } catch (error) {
    console.error('Error loading billing data:', error);
    throw new Error('Failed to load billing data');
  }
}
