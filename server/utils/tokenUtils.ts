import { createClerkClient } from '@clerk/nextjs/server';

/**
 * Retrieves a fresh Google OAuth access token for a Clerk user.
 *
 * Clerk automatically refreshes the access token using the stored refresh token
 * when getUserOauthAccessToken() is called. No manual refresh logic is needed.
 *
 * @param clerkUserId - Clerk user ID to get the token for
 * @returns OAuth access token string, or null if unavailable
 */
export async function getGoogleAccessToken(clerkUserId: string): Promise<string | null> {
  try {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const tokenResponse = await clerk.users.getUserOauthAccessToken(clerkUserId, 'google');
    return tokenResponse.data[0]?.token ?? null;
  } catch (error) {
    console.error('[getGoogleAccessToken] Error:', error);
    return null;
  }
}

export async function hasValidGoogleToken(clerkUserId: string): Promise<boolean> {
  try {
    const token = await getGoogleAccessToken(clerkUserId);
    return !!token;
  } catch {
    return false;
  }
}
