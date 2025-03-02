import { markStepComplete } from '@/server/actions/expert-setup';
import { auth } from '@clerk/nextjs/server';

import { IdentityPageClient } from './identity-client';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function IdentityPage() {
  const { getToken } = await auth();

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/user/identity`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getToken()}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to load identity verification data');
    }

    const data = await response.json();

    if (!data || !data.user) {
      return (
        <div className="container flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">No identity verification data available.</p>
        </div>
      );
    }

    // If verification is complete, mark the identity step as complete
    if (data.verificationStatus === 'verified') {
      // Mark identity step as complete (non-blocking)
      markStepComplete('identity').catch((error) => {
        console.error('Failed to mark identity step as complete:', error);
      });
    }

    return <IdentityPageClient dbUser={data.user} verificationStatus={data.verificationStatus} />;
  } catch {
    return (
      <div className="container flex min-h-[400px] items-center justify-center">
        <p className="text-destructive">
          Failed to load identity verification data. Please try again later.
        </p>
      </div>
    );
  }
}
