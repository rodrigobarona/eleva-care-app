import { createIdentityVerificationSession } from '@/lib/stripe/identity';
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

    const verificationSession = await createIdentityVerificationSession();

    return NextResponse.json({
      url: verificationSession.url,
      sessionId: verificationSession.sessionId,
    });
  } catch (error) {
    console.error('Error starting identity verification:', error);
    return NextResponse.json(
      {
        error: 'Failed to start identity verification',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
