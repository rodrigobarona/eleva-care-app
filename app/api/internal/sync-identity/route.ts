import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { syncIdentityVerificationToConnect } from '@/lib/integrations/stripe';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Get the clerk user ID from the query parameter
    const url = new URL(request.url);
    const clerkUserId = url.searchParams.get('clerkUserId');

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Missing clerkUserId parameter' }, { status: 400 });
    }

    // Verify this is a valid user in our system
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, clerkUserId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('Syncing identity verification for user:', {
      clerkUserId,
      userId: user.id,
      email: user.email,
      hasIdentityVerification: !!user.stripeIdentityVerificationId,
      isVerified: !!user.stripeIdentityVerified,
    });

    // Call the sync function
    const result = await syncIdentityVerificationToConnect(clerkUserId);

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
