import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema-workos';
import { syncIdentityVerificationToConnect } from '@/lib/integrations/stripe';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Get the clerk user ID from the query parameter
    const url = new URL(request.url);
    const workosUserId = url.searchParams.get('workosUserId');

    if (!workosUserId) {
      return NextResponse.json({ error: 'Missing workosUserId parameter' }, { status: 400 });
    }

    // Verify this is a valid user in our system
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, workosUserId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('Syncing identity verification for user:', {
      workosUserId,
      userId: user.id,
      email: user.email,
      hasIdentityVerification: !!user.stripeIdentityVerificationId,
      isVerified: !!user.stripeIdentityVerified,
    });

    // Call the sync function
    const result = await syncIdentityVerificationToConnect(workosUserId);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      user: {
        email: user.email,
        connectAccountId: user.stripeConnectAccountId,
        identityVerificationId: user.stripeIdentityVerificationId,
        identityVerified: user.stripeIdentityVerified,
      },
    });
  } catch (error) {
    console.error('Error syncing identity verification:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
