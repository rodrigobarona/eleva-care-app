import { NextResponse } from 'next/server';

import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { getStripeConnectAccountStatus } from '@/lib/stripe';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    // If user doesn't exist in database, create them
    if (!dbUser) {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return NextResponse.json({ error: 'Clerk user not found' }, { status: 404 });
      }

      // Create user in database
      const [newUser] = await db
        .insert(UserTable)
        .values({
          clerkUserId: userId,
          email: clerkUser.emailAddresses[0].emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
          role: 'expert', // Since this is the billing page, we assume they're an expert
        })
        .returning();

      dbUser = newUser;
    }

    let accountStatus = null;
    if (dbUser.stripeConnectAccountId) {
      accountStatus = await getStripeConnectAccountStatus(dbUser.stripeConnectAccountId);
    }

    return NextResponse.json({
      user: dbUser,
      accountStatus,
    });
  } catch (error) {
    console.error('Error in billing API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
