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

    console.log(
      `Starting identity verification for user ${userId} using configured Verification Flow`,
    );

    const verificationSession = await createIdentityVerificationSession();

    console.log(
      `Successfully created verification session ${verificationSession.sessionId} for user ${userId}`,
    );

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
