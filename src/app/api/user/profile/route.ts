import { getFullUserByWorkosId } from '@/server/db/users';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { user } = await withAuth();
    const userId = user?.id;

    if (!user || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Drizzle query-level cache (.$withCache) handles caching in getFullUserByWorkosId
    const dbUser = await getFullUserByWorkosId(userId);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userProfile = {
      id: dbUser.id,
      workosUserId: userId,
      email: user.email || dbUser.email,
      username: dbUser.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      imageUrl:
        dbUser.imageUrl ||
        (user as unknown as Record<string, unknown>).profilePictureUrl ||
        (user as unknown as Record<string, unknown>).profile_picture_url ||
        null,
      country: dbUser.country || 'PT',
      stripeCustomerId: dbUser.stripeCustomerId,
      stripeConnectAccountId: dbUser.stripeConnectAccountId,
    };

    return NextResponse.json({ user: userProfile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
