import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { createIdentityVerification } from '@/lib/stripe/identity';
import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * POST /api/stripe/identity/verification
 *
 * Creates a new Stripe Identity verification session for the current user
 *
 * @returns 200 - Success with redirect URL or verification status
 * @returns 400 - Error from verification creation
 * @returns 401 - Unauthorized if no user is authenticated
 * @returns 404 - User not found in database
 * @returns 500 - Server error during verification creation
 */
export async function POST() {
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

    // Create verification session
    const result = await createIdentityVerification(
      dbUser.id,
      user.id,
      user.emailAddresses[0]?.emailAddress || dbUser.email,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating identity verification:', error);
    return NextResponse.json({ error: 'Failed to create identity verification' }, { status: 500 });
  }
}
