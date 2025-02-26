import { updateVerificationStatus } from '@/lib/stripe/identity';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verificationStatus = await updateVerificationStatus();

    return NextResponse.json({
      status: verificationStatus.status,
      lastUpdated: verificationStatus.lastUpdated,
      details: verificationStatus.details,
    });
  } catch (error) {
    console.error('Error checking identity verification status:', error);
    return NextResponse.json(
      {
        error: 'Failed to check identity verification status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
