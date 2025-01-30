import "use-server";
import { createClerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { addMinutes, endOfDay, startOfDay } from "date-fns";

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
      const tokenResponse = await clerk.users.getUserOauthAccessToken(
        clerkUserId,
        "oauth_google"
      );

      if (tokenResponse.data.length === 0 || !tokenResponse.data[0].token) {
        throw new Error("No OAuth token found");
      }

      const token = tokenResponse.data[0];
      const user = await clerk.users.getUser(clerkUserId);
      const tokenExpiryDate = user.privateMetadata?.googleTokenExpiry
        ? new Date(user.privateMetadata.googleTokenExpiry as number)
        : null;
      const isExpired = tokenExpiryDate ? tokenExpiryDate < new Date() : true;

      const client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_REDIRECT_URL
      );

      client.setCredentials({
        access_token: token.token,
        expiry_date: tokenExpiryDate?.getTime(),
      });

      if (
        isExpired ||
        (tokenExpiryDate && tokenExpiryDate.getTime() - Date.now() < 300000)
      ) {
        try {
          const { credentials } = await client.refreshAccessToken();
          client.setCredentials(credentials);

          await clerk.users.updateUser(clerkUserId, {
            privateMetadata: {
              ...user.privateMetadata,
              googleAccessToken: credentials.access_token,
              googleTokenExpiry: credentials.expiry_date,
            },
          });
        } catch (error) {
          console.error("Failed to refresh token:", error);
          throw new Error("Failed to refresh Google Calendar access token");
        }
      }

      client.on("tokens", async (tokens) => {
        if (tokens.access_token) {
          const updatedUser = await clerk.users.getUser(clerkUserId);
          await clerk.users.updateUser(clerkUserId, {
            privateMetadata: {
              ...updatedUser.privateMetadata,
              googleAccessToken: tokens.access_token,
              googleTokenExpiry: tokens.expiry_date,
            },
          });
        }
      });

      return client;
    } catch (error) {
      console.error("Error obtaining OAuth client:", error);
      throw new Error("Unable to obtain Google OAuth client");
    }
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
}

// Export the class and its methods
export { GoogleCalendarService as default };

export async function getCalendarEventTimes(
  clerkUserId: string,
  { start, end }: { start: Date; end: Date }
) {
  return GoogleCalendarService.getInstance().getCalendarEventTimes(
    clerkUserId,
    {
      start,
      end,
    }
  );
}

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
