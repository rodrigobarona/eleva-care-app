import "use-server";
import { createClerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { addMinutes, endOfDay, startOfDay } from "date-fns";
import { db } from "@/drizzle/db";
import { TokenTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

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
      // Get the OAuth tokens from Clerk
      const tokenResponse = await clerk.users.getUserOauthAccessToken(
        clerkUserId,
        "oauth_google"
      );

      if (tokenResponse.data.length === 0 || !tokenResponse.data[0].token) {
        throw new Error("No OAuth token found");
      }

      const token = tokenResponse.data[0];

      // Get the refresh token from Clerk
      const oauthTokens = await clerk.users.getUserOauthAccessToken(
        clerkUserId,
        "oauth_google"
      );

      const refreshToken = oauthTokens.data[0]?.token;
      if (!refreshToken) {
        throw new Error("No refresh token found");
      }

      const client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_REDIRECT_URL
      );

      // Set both access and refresh tokens
      client.setCredentials({
        access_token: token.token,
        refresh_token: refreshToken,
      });

      // Set up token refresh handler
      client.on("tokens", async (tokens) => {
        if (tokens.access_token) {
          try {
            // Store the new token in user's private metadata
            const user = await clerk.users.getUser(clerkUserId);
            await clerk.users.updateUser(clerkUserId, {
              privateMetadata: {
                ...user.privateMetadata,
                googleAccessToken: tokens.access_token,
                googleTokenExpiry: tokens.expiry_date,
              },
            });
          } catch (error) {
            console.error("Failed to update token:", error);
          }
        }
      });

      return client;
    } catch (error) {
      console.error("Error obtaining OAuth client:", error);
      throw new Error("Unable to obtain Google OAuth client");
    }
  }

  private shouldRefreshToken(credentials: { expiry_date?: number | null }) {
    if (!credentials.expiry_date) return true;

    // Refresh if token expires in less than 5 minutes
    const expiryDate = new Date(credentials.expiry_date);
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() + fiveMinutes >= expiryDate.getTime();
  }

  async getCalendarEventTimes(
    clerkUserId: string,
    { start, end }: { start: Date; end: Date }
  ) {
    const oAuthClient = await this.getOAuthClient(clerkUserId);

    const events = await google.calendar("v3").events.list({
      calendarId: "primary",
      eventTypes: ["default"],
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
      throw new Error("Clerk user has no email");
    }

    const calendarEvent = await google.calendar("v3").events.insert({
      calendarId: "primary",
      auth: oAuthClient,
      sendUpdates: "all",
      requestBody: {
        attendees: [
          {
            email: guestEmail,
            displayName: guestName,
            responseStatus: "accepted",
          },
          {
            email: calendarUser.primaryEmailAddress.emailAddress,
            displayName: calendarUser.fullName,
            responseStatus: "accepted",
          },
        ],
        description: guestNotes
          ? `Additional Details: ${guestNotes}`
          : undefined,
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
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
      conferenceDataVersion: 1,
    });

    return calendarEvent.data;
  }

  async updateStoredTokens(
    clerkUserId: string,
    tokens: { access_token: string; expiry_date: number }
  ) {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const user = await clerk.users.getUser(clerkUserId);
    await clerk.users.updateUser(clerkUserId, {
      privateMetadata: {
        ...user.privateMetadata,
        googleAccessToken: tokens.access_token,
        googleTokenExpiry: tokens.expiry_date,
      },
    });

    console.log("Token updated for user:", clerkUserId);
  }

  async getTokens(userId: string) {
    const tokenRecord = await db.query.TokenTable.findFirst({
      where: eq(TokenTable.clerkUserId, userId),
    });

    if (!tokenRecord) {
      return null;
    }

    return {
      access_token: tokenRecord.accessToken,
      refresh_token: tokenRecord.refreshToken,
      expiry_date: tokenRecord.expiryDate?.getTime(),
    };
  }

  async hasValidTokens(userId: string): Promise<boolean> {
    try {
      const tokens = await this.getTokens(userId);
      return Boolean(tokens?.refresh_token);
    } catch {
      return false;
    }
  }
}

// Export server-only methods
export { GoogleCalendarService as default };

// Export specific methods for server usage
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
