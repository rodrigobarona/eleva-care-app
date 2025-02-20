import { createClerkClient } from '@clerk/nextjs/server';
import { addMinutes, endOfDay, startOfDay } from 'date-fns';
import { google } from 'googleapis';
import 'use-server';

class GoogleCalendarService {
  private static instance: GoogleCalendarService | null = null;

  private constructor() {}

  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  async getOAuthClient(clerkUserId: string) {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    try {
      const response = await clerk.users.getUserOauthAccessToken(clerkUserId, 'google');
      const token = response.data[0]?.token;

      if (!token) {
        throw new Error('No OAuth token found');
      }

      const client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_REDIRECT_URL,
      );

      client.setCredentials({ access_token: token });
      return client;
    } catch (error) {
      console.error('Error obtaining OAuth client:', error);
      throw new Error('Unable to obtain Google OAuth client');
    }
  }

  async getCalendarEventTimes(clerkUserId: string, { start, end }: { start: Date; end: Date }) {
    const oAuthClient = await this.getOAuthClient(clerkUserId);

    const events = await google.calendar('v3').events.list({
      calendarId: 'primary',
      eventTypes: ['default'],
      singleEvents: true,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      maxResults: 2500,
      auth: oAuthClient,
    });

    return (
      events.data.items
        ?.map((event) => {
          if (event.start?.date != null && event.end?.date != null) {
            return {
              start: startOfDay(event.start.date),
              end: endOfDay(event.end.date),
            };
          }

          if (event.start?.dateTime != null && event.end?.dateTime != null) {
            return {
              start: new Date(event.start.dateTime),
              end: new Date(event.end.dateTime),
            };
          }
        })
        .filter((date) => date != null) || []
    );
  }

  async createCalendarEvent({
    clerkUserId,
    guestName,
    guestEmail,
    startTime,
    guestNotes,
    durationInMinutes,
    eventName,
  }: {
    clerkUserId: string;
    guestName: string;
    guestEmail: string;
    startTime: Date;
    guestNotes?: string | null;
    durationInMinutes: number;
    eventName: string;
  }) {
    const oAuthClient = await this.getOAuthClient(clerkUserId);
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const calendarUser = await clerk.users.getUser(clerkUserId);
    if (calendarUser.primaryEmailAddress == null) {
      throw new Error('Clerk user has no email');
    }

    const calendarEvent = await google.calendar('v3').events.insert({
      calendarId: 'primary',
      auth: oAuthClient,
      sendUpdates: 'all',
      requestBody: {
        attendees: [
          {
            email: guestEmail,
            displayName: guestName,
            responseStatus: 'accepted',
          },
          {
            email: calendarUser.primaryEmailAddress.emailAddress,
            displayName: calendarUser.fullName,
            responseStatus: 'accepted',
          },
        ],
        description: guestNotes ? `Additional Details: ${guestNotes}` : undefined,
        start: {
          dateTime: startTime.toISOString(),
        },
        end: {
          dateTime: addMinutes(startTime, durationInMinutes).toISOString(),
        },
        summary: `${guestName} + ${calendarUser.fullName}: ${eventName}`,
        conferenceData: {
          createRequest: {
            requestId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
      conferenceDataVersion: 1,
    });

    return calendarEvent.data;
  }

  async hasValidTokens(userId: string): Promise<boolean> {
    try {
      const clerk = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      const response = await clerk.users.getUserOauthAccessToken(userId, 'google');
      return !!response.data[0]?.token;
    } catch {
      return false;
    }
  }
}

export { GoogleCalendarService as default };

export async function createCalendarEvent(params: {
  clerkUserId: string;
  guestName: string;
  guestEmail: string;
  startTime: Date;
  guestNotes?: string | null;
  durationInMinutes: number;
  eventName: string;
}) {
  return GoogleCalendarService.getInstance().createCalendarEvent(params);
}

export async function getGoogleCalendarClient(userId: string) {
  try {
    const accessToken = await getGoogleAccessToken(userId);
    if (!accessToken) {
      throw new Error('No Google access token found');
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    return google.calendar({
      version: 'v3',
      auth: oauth2Client,
    });
  } catch (error) {
    console.error('[getGoogleCalendarClient] Error:', error);
    throw error;
  }
}

async function getGoogleAccessToken(clerkUserId: string): Promise<string | null> {
  try {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const response = await clerk.users.getUserOauthAccessToken(clerkUserId, 'google');
    return response.data[0]?.token ?? null;
  } catch (error) {
    console.error('[getGoogleAccessToken] Error getting token:', error);
    return null;
  }
}
