import { getUserByWorkOsId } from '@/server/actions/user-sync';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';

// Mark route as dynamic (required for auth)
export const dynamic = 'force-dynamic';

/**
 * Cached function to fetch user profile from database using WorkOS user ID
 * Uses Next.js 16 unstable_cache with tag-based revalidation
 * 
 * NOTE: We use unstable_cache instead of 'use cache: remote' because
 * cacheComponents is disabled (blocked on next/root-params for next-intl).
 * Track: https://github.com/amannn/next-intl/issues/1493
 * 
 * Cache duration: 5 minutes (300 seconds)
 * Cache tags: 'user-profile', 'user-profile-{userId}'
 * 
 * Invalidation:
 * - Background update: revalidateTag('user-profile-{userId}')
 * - Immediate update: updateTag('user-profile-{userId}')
 */
function getCachedUserProfile(workosUserId: string) {
  return unstable_cache(
    async () => {
      // Get user from our database by WorkOS user ID
      const dbUser = await getUserByWorkOsId(workosUserId);
      return dbUser;
    },
    [`user-profile-${workosUserId}`], // Unique cache key per user
    {
      revalidate: 300, // 5 minutes
      tags: ['user-profile', `user-profile-${workosUserId}`], // Tags for selective invalidation
    }
  )();
}

export async function GET() {
  try {
    // Get the authenticated user from WorkOS
    const { user } = await withAuth();
    const userId = user?.id;

    if (!user || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database with Next.js 16 native caching
    const dbUser = await getCachedUserProfile(userId);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Combine WorkOS user data with database user data
    // Note: firstName/lastName come from WorkOS API, not stored in UsersTable
    // For profile display names, use ProfilesTable instead
    const userProfile = {
      id: dbUser.id,
      workosUserId: userId,
      email: user.email || dbUser.email,
      username: dbUser.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      // Use WorkOS profile_picture_url as fallback if database doesn't have imageUrl
      imageUrl: dbUser.imageUrl || (user as any).profilePictureUrl || (user as any).profile_picture_url || null,
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

/**
 * To invalidate the cache after profile updates, use:
 * 
 * import { revalidateTag } from 'next/cache';
 * await revalidateTag('user-profile-{userId}');
 * 
 * Or for immediate updates:
 * import { updateTag } from 'next/cache';
 * await updateTag('user-profile-{userId}');
 */
