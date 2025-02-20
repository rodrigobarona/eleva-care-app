import { createClerkClient } from '@clerk/nextjs/server';
import { google } from 'googleapis';

export async function checkAndRefreshToken(clerkUserId: string) {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const user = await clerk.users.getUser(clerkUserId);
  const tokenExpiryDate = user.privateMetadata?.googleTokenExpiry
    ? new Date(user.privateMetadata.googleTokenExpiry as number)
    : null;
  const isExpired = tokenExpiryDate ? tokenExpiryDate < new Date() : true;

  if (isExpired || (tokenExpiryDate && tokenExpiryDate.getTime() - Date.now() < 300000)) {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URL,
    );

    try {
      const tokenResponse = await clerk.users.getUserOauthAccessToken(clerkUserId, 'google');

      if (tokenResponse.data.length === 0 || !tokenResponse.data[0].token) {
        throw new Error('No OAuth token found');
      }

      const token = tokenResponse.data[0];
      client.setCredentials({
        access_token: token.token,
        expiry_date: tokenExpiryDate?.getTime(),
      });

      const { credentials } = await client.refreshAccessToken();
      client.setCredentials(credentials);

      await clerk.users.updateUser(clerkUserId, {
        privateMetadata: {
          ...user.privateMetadata,
          googleAccessToken: credentials.access_token,
          googleTokenExpiry: credentials.expiry_date,
        },
      });

      return client;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw new Error('Failed to refresh Google Calendar access token');
    }
  }

  return null;
}

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
