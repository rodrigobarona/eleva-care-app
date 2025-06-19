/**
 * Dynamic Google APIs Client
 *
 * This module provides dynamic loading of Google APIs to reduce initial bundle size.
 * The googleapis library is only loaded when actually needed for calendar operations.
 */

let googlePromise: Promise<typeof import('googleapis')> | null = null;

/**
 * Dynamically imports Google APIs library
 * This reduces the initial bundle size by loading googleapis only when needed
 */
async function getGoogleAPIs() {
  if (!googlePromise) {
    googlePromise = import('googleapis');
  }
  return googlePromise;
}

/**
 * Creates a Google Calendar client with dynamic loading
 * @param auth - OAuth2 client for authentication
 * @returns Google Calendar client
 */
export async function createGoogleCalendarClient(auth: import('googleapis').Auth.OAuth2Client) {
  const { google } = await getGoogleAPIs();
  return google.calendar({ version: 'v3', auth });
}

/**
 * Creates a Google OAuth2 client with dynamic loading
 * @param clientId - Google OAuth client ID
 * @param clientSecret - Google OAuth client secret
 * @param redirectUrl - OAuth redirect URL
 * @returns OAuth2 client
 */
export async function createGoogleOAuth2Client(
  clientId: string,
  clientSecret: string,
  redirectUrl: string,
) {
  const { google } = await getGoogleAPIs();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUrl);
}
