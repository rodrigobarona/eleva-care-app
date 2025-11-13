/**
 * Google OAuth Token Management (WorkOS-based)
 *
 * Manages Google OAuth tokens obtained via WorkOS OAuth provider.
 * Stores tokens ENCRYPTED in database for server-side API access.
 *
 * Architecture:
 * - WorkOS handles OAuth flow with Google
 * - Tokens encrypted with AES-256-GCM (same as medical records)
 * - Stored in database (users.google_* columns)
 * - Automatic refresh using Google Auth Library
 * - Follows HIPAA/GDPR compliance standards
 *
 * Security:
 * - All tokens encrypted at rest using lib/utils/encryption.ts
 * - Uses same encryption as medical records for consistency
 * - Requires ENCRYPTION_KEY environment variable
 *
 * @module GoogleOAuthTokens
 */

'use server';

import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema-workos';
import { decryptRecord, encryptRecord } from '@/lib/utils/encryption';
import { eq } from 'drizzle-orm';
import { google } from 'googleapis';

/**
 * Google OAuth Token Management (WorkOS-based)
 *
 * Manages Google OAuth tokens obtained via WorkOS OAuth provider.
 * Stores tokens ENCRYPTED in database for server-side API access.
 *
 * Architecture:
 * - WorkOS handles OAuth flow with Google
 * - Tokens encrypted with AES-256-GCM (same as medical records)
 * - Stored in database (users.google_* columns)
 * - Automatic refresh using Google Auth Library
 * - Follows HIPAA/GDPR compliance standards
 *
 * Security:
 * - All tokens encrypted at rest using lib/utils/encryption.ts
 * - Uses same encryption as medical records for consistency
 * - Requires ENCRYPTION_KEY environment variable
 *
 * @module GoogleOAuthTokens
 */

/**
 * Google OAuth Token Management (WorkOS-based)
 *
 * Manages Google OAuth tokens obtained via WorkOS OAuth provider.
 * Stores tokens ENCRYPTED in database for server-side API access.
 *
 * Architecture:
 * - WorkOS handles OAuth flow with Google
 * - Tokens encrypted with AES-256-GCM (same as medical records)
 * - Stored in database (users.google_* columns)
 * - Automatic refresh using Google Auth Library
 * - Follows HIPAA/GDPR compliance standards
 *
 * Security:
 * - All tokens encrypted at rest using lib/utils/encryption.ts
 * - Uses same encryption as medical records for consistency
 * - Requires ENCRYPTION_KEY environment variable
 *
 * @module GoogleOAuthTokens
 */

/**
 * Google OAuth Token Management (WorkOS-based)
 *
 * Manages Google OAuth tokens obtained via WorkOS OAuth provider.
 * Stores tokens ENCRYPTED in database for server-side API access.
 *
 * Architecture:
 * - WorkOS handles OAuth flow with Google
 * - Tokens encrypted with AES-256-GCM (same as medical records)
 * - Stored in database (users.google_* columns)
 * - Automatic refresh using Google Auth Library
 * - Follows HIPAA/GDPR compliance standards
 *
 * Security:
 * - All tokens encrypted at rest using lib/utils/encryption.ts
 * - Uses same encryption as medical records for consistency
 * - Requires ENCRYPTION_KEY environment variable
 *
 * @module GoogleOAuthTokens
 */

/**
 * Google OAuth token structure
 */
export interface GoogleOAuthTokens {
  access_token: string;
  refresh_token?: string | null;
  expiry_date: number; // Unix timestamp in milliseconds
  token_type: 'Bearer';
  scope: string;
}

/**
 * Store Google OAuth tokens for a user (ENCRYPTED)
 *
 * Called after successful WorkOS OAuth callback with Google tokens.
 * Tokens are encrypted using AES-256-GCM before storage.
 *
 * @param workosUserId - WorkOS user ID
 * @param tokens - OAuth tokens from WorkOS/Google
 *
 * @example
 * ```ts
 * // In OAuth callback route
 * await storeGoogleTokens(userId, {
 *   access_token: 'ya29...',
 *   refresh_token: '1//...',
 *   expiry_date: Date.now() + 3600000,
 *   token_type: 'Bearer',
 *   scope: 'https://www.googleapis.com/auth/calendar'
 * });
 * ```
 */
export async function storeGoogleTokens(
  workosUserId: string,
  tokens: GoogleOAuthTokens,
): Promise<void> {
  // 🔐 Encrypt tokens before storing (same as medical records)
  const encryptedAccessToken = encryptRecord(tokens.access_token);
  const encryptedRefreshToken = tokens.refresh_token ? encryptRecord(tokens.refresh_token) : null;

  await db
    .update(UsersTable)
    .set({
      googleAccessToken: encryptedAccessToken,
      googleRefreshToken: encryptedRefreshToken,
      googleTokenExpiry: new Date(tokens.expiry_date),
      googleCalendarConnected: true,
      googleCalendarConnectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(UsersTable.workosUserId, workosUserId));

  console.log('✅ Google OAuth tokens encrypted and stored for user:', workosUserId);
}

/**
 * Get stored Google OAuth tokens (DECRYPTED)
 *
 * Retrieves and decrypts tokens from database.
 *
 * @param workosUserId - WorkOS user ID
 * @returns Decrypted tokens or null if not connected
 */
export async function getStoredGoogleTokens(
  workosUserId: string,
): Promise<GoogleOAuthTokens | null> {
  const user = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.workosUserId, workosUserId),
    columns: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
    },
  });

  if (!user?.googleAccessToken || !user?.googleTokenExpiry) {
    return null;
  }

  // 🔓 Decrypt tokens (same method as medical records)
  const accessToken = decryptRecord(user.googleAccessToken);
  const refreshToken = user.googleRefreshToken ? decryptRecord(user.googleRefreshToken) : null;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: user.googleTokenExpiry.getTime(),
    token_type: 'Bearer',
    scope: 'https://www.googleapis.com/auth/calendar', // Adjust based on actual scopes
  };
}

/**
 * Get an authenticated Google OAuth2 client with automatic token refresh
 *
 * This is the main function to use for Google API access. It:
 * 1. Retrieves stored tokens from database
 * 2. Configures OAuth2 client with refresh handler
 * 3. Automatically refreshes expired tokens
 * 4. Stores new tokens back to database
 *
 * @param workosUserId - WorkOS user ID
 * @returns Configured Google OAuth2 client
 * @throws Error if user hasn't connected Google Calendar
 *
 * @example
 * ```ts
 * const auth = await getGoogleOAuthClient(userId);
 * const calendar = google.calendar({ version: 'v3', auth });
 * const events = await calendar.events.list({
 *   calendarId: 'primary',
 *   timeMin: new Date().toISOString(),
 *   maxResults: 10,
 * });
 * ```
 */
export async function getGoogleOAuthClient(workosUserId: string) {
  const tokens = await getStoredGoogleTokens(workosUserId);

  if (!tokens) {
    throw new Error('Google Calendar not connected. User must authorize via WorkOS OAuth.');
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
  });

  // Set initial credentials
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    token_type: tokens.token_type,
    scope: tokens.scope,
  });

  // 🔄 Setup automatic token refresh handler
  // This event fires when tokens are refreshed
  oauth2Client.on('tokens', async (newTokens) => {
    console.log('🔄 Google tokens refreshed for user:', workosUserId);

    // Build update object with encrypted tokens
    const updateData: {
      googleAccessToken?: string;
      googleRefreshToken?: string;
      googleTokenExpiry?: Date;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    // 🔐 Encrypt new tokens before storing
    if (newTokens.access_token) {
      updateData.googleAccessToken = encryptRecord(newTokens.access_token);
    }

    // Only update refresh token if a new one is provided
    // (Google only sends refresh token on first authorization)
    if (newTokens.refresh_token) {
      updateData.googleRefreshToken = encryptRecord(newTokens.refresh_token);
    }

    if (newTokens.expiry_date) {
      updateData.googleTokenExpiry = new Date(newTokens.expiry_date);
    }

    // Store encrypted tokens in database
    await db.update(UsersTable).set(updateData).where(eq(UsersTable.workosUserId, workosUserId));

    console.log('✅ Updated tokens encrypted and stored in database');
  });

  return oauth2Client;
}

/**
 * Check if user has Google Calendar connected
 *
 * @param workosUserId - WorkOS user ID
 * @returns true if connected and tokens exist
 */
export async function hasGoogleCalendarConnected(workosUserId: string): Promise<boolean> {
  const user = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.workosUserId, workosUserId),
    columns: {
      googleCalendarConnected: true,
      googleAccessToken: true,
    },
  });

  return !!(user?.googleCalendarConnected && user?.googleAccessToken);
}

/**
 * Disconnect Google Calendar for a user
 *
 * Removes stored tokens and revokes access with Google.
 *
 * @param workosUserId - WorkOS user ID
 */
export async function disconnectGoogleCalendar(workosUserId: string): Promise<void> {
  try {
    // Get current tokens to revoke
    const tokens = await getStoredGoogleTokens(workosUserId);

    if (tokens?.access_token) {
      // Revoke token with Google
      const oauth2Client = new google.auth.OAuth2();
      await oauth2Client.revokeToken(tokens.access_token);
      console.log('✅ Token revoked with Google');
    }
  } catch (error) {
    console.error('Failed to revoke Google token:', error);
    // Continue with local cleanup even if revoke fails
  }

  // Clear tokens from database
  await db
    .update(UsersTable)
    .set({
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleCalendarConnected: false,
      updatedAt: new Date(),
    })
    .where(eq(UsersTable.workosUserId, workosUserId));

  console.log('✅ Google Calendar disconnected for user:', workosUserId);
}
