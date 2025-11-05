import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema-workos';
import { eq } from 'drizzle-orm';
import { google } from 'googleapis';

/**
 * OAuth Token Management for WorkOS
 * 
 * Stores OAuth tokens in database user metadata
 * Note: For production, consider using a dedicated tokens table with encryption
 */

export async function checkAndRefreshToken(workosUserId: string) {
  // Fetch user from database
  const user = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.workosUserId, workosUserId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get token expiry from user metadata (stored in JSON column)
  const tokenExpiryDate = user.googleTokenExpiry
    ? new Date(user.googleTokenExpiry)
    : null;
  const isExpired = tokenExpiryDate ? tokenExpiryDate < new Date() : true;

  // If token is expired or expiring soon (within 5 minutes)
  if (isExpired || (tokenExpiryDate && tokenExpiryDate.getTime() - Date.now() < 300000)) {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URL,
    );

    try {
      // Get the stored refresh token
      if (!user.googleRefreshToken) {
        throw new Error('No refresh token found');
      }

      client.setCredentials({
        refresh_token: user.googleRefreshToken,
        expiry_date: tokenExpiryDate?.getTime(),
      });

      const { credentials } = await client.refreshAccessToken();
      client.setCredentials(credentials);

      // Update database with new tokens
      await db
        .update(UsersTable)
        .set({
          googleAccessToken: credentials.access_token || user.googleAccessToken,
          googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          googleRefreshToken: credentials.refresh_token || user.googleRefreshToken,
          updatedAt: new Date(),
        })
        .where(eq(UsersTable.workosUserId, workosUserId));

      return client;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw new Error('Failed to refresh Google Calendar access token');
    }
  }

  // Token is still valid, return client with existing credentials
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URL,
  );

  client.setCredentials({
    access_token: user.googleAccessToken,
    expiry_date: tokenExpiryDate?.getTime(),
  });

  return client;
}

/**
 * Store OAuth tokens for a user
 */
export async function storeOAuthTokens(
  workosUserId: string,
  accessToken: string,
  refreshToken: string,
  expiryDate: number,
) {
  await db
    .update(UsersTable)
    .set({
      googleAccessToken: accessToken,
      googleRefreshToken: refreshToken,
      googleTokenExpiry: new Date(expiryDate),
      updatedAt: new Date(),
    })
    .where(eq(UsersTable.workosUserId, workosUserId));
}

/**
 * Get OAuth tokens for a user
 */
export async function getOAuthTokens(workosUserId: string) {
  const user = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.workosUserId, workosUserId),
    columns: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    accessToken: user.googleAccessToken,
    refreshToken: user.googleRefreshToken,
    expiryDate: user.googleTokenExpiry,
  };
}
