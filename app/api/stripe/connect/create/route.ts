import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { createConnectAccountWithVerifiedIdentity } from '@/lib/stripe/identity';
import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * POST /api/stripe/connect/create
 *
 * Creates a Stripe Connect account for the current user
 * This endpoint requires the user to have completed identity verification first
 *
 * @returns 200 - Success with onboarding URL
 * @returns 400 - Error from Connect account creation
 * @returns 401 - Unauthorized if no user is authenticated
 * @returns 404 - User not found in database
 * @returns 500 - Server error during Connect account creation
 */
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user record from database
    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get request body for country
    let body: { country?: string };
    try {
      body = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { country = 'US' } = body;

    // Create Connect account with verified identity
    const result = await createConnectAccountWithVerifiedIdentity(
      user.id,
      user.emailAddresses[0]?.emailAddress || dbUser.email,
      country,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating Connect account:', error);
    return NextResponse.json({ error: 'Failed to create Connect account' }, { status: 500 });
  }
}
