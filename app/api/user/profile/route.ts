import { getUserByClerkId, getUserFromClerk } from '@/server/actions/user-sync';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Mark route as dynamic

export async function GET() {
  try {
    // Get the authenticated user ID
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from our database
    const dbUser = await getUserByClerkId(userId);

    // Also get user data from Clerk for complete profile
    const clerkUser = await getUserFromClerk(userId);

    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get primary email
    const primaryEmailObject = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    );

    const email = primaryEmailObject?.emailAddress;

    return NextResponse.json({
      user: {
        id: dbUser?.id,
        clerkId: userId,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        country: dbUser?.country || 'PT', // Default to US if not set
        stripeCustomerId: dbUser?.stripeCustomerId,
        stripeConnectAccountId: dbUser?.stripeConnectAccountId,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
