import { generateAppointmentEmailHtml, sendEmail } from '@/lib/email';
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

    console.log('Fetching calendar events:', {
      timeRange: { start: start.toISOString(), end: end.toISOString() },
      userId: clerkUserId,
    });

    const events = await google.calendar('v3').events.list({
      calendarId: 'primary',
      eventTypes: ['default'],
      singleEvents: true,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      maxResults: 2500,
      auth: oAuthClient,
      fields: 'items(id,status,summary,start,end,transparency,eventType)',
    });

    console.log('Calendar response:', {
      totalEvents: events.data.items?.length || 0,
      events: events.data.items?.map((event) => ({
        summary: event.summary,
        start: event.start,
        end: event.end,
        status: event.status,
        transparency: event.transparency,
        eventType: event.eventType,
      })),
    });

    return (
      events.data.items
        ?.map((event) => {
          if (event.transparency === 'transparent') {
            console.log('Skipping transparent event:', event.summary);
            return null;
          }

          if (event.status === 'cancelled') {
            console.log('Skipping cancelled event:', event.summary);
            return null;
          }

          if (event.start?.date != null && event.end?.date != null) {
            console.log('All-day event found:', {
              summary: event.summary,
              start: event.start.date,
              end: event.end.date,
            });
            return {
              start: startOfDay(event.start.date),
              end: endOfDay(event.end.date),
            };
          }

          if (event.start?.dateTime != null && event.end?.dateTime != null) {
            console.log('Timed event found:', {
              summary: event.summary,
              start: event.start.dateTime,
              end: event.end.dateTime,
            });
            return {
              start: new Date(event.start.dateTime),
              end: new Date(event.end.dateTime),
            };
          }

          console.log('Event skipped due to invalid date format:', event);
          return null;
        })
        .filter((date): date is { start: Date; end: Date } => date != null) || []
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

    // Generate a descriptive summary and formatted description
    const eventSummary = `${guestName} + ${calendarUser.fullName}: ${eventName}`;
    const formattedTime = startTime.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const endTime = addMinutes(startTime, durationInMinutes);
    const formattedDuration = `${durationInMinutes} minutes`;

    const eventDescription = `
Appointment Details:
- Date and Time: ${formattedTime}
- Duration: ${formattedDuration}
- Client: ${guestName} (${guestEmail})
- Expert: ${calendarUser.fullName}
${guestNotes ? `\nAdditional Notes from Client:\n${guestNotes}` : ''}

This appointment was created through Eleva Care. A Google Meet link will be available for the session.
`;

    // Create the calendar event with all necessary parameters
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
            // Set as optional organizer to ensure they also get notifications
            organizer: true,
            optional: false,
          },
        ],
        description: eventDescription,
        start: {
          dateTime: startTime.toISOString(),
        },
        end: {
          dateTime: endTime.toISOString(),
        },
        summary: eventSummary,
        conferenceData: {
          createRequest: {
            requestId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'email', minutes: 15 },
            { method: 'popup', minutes: 5 },
          ],
        },
        // Add additional properties to enhance notification behavior
        guestsCanModify: false,
        guestsCanSeeOtherGuests: true,
      },
      conferenceDataVersion: 1,
    });

    try {
      // After creating the event, send an immediate email notification to the expert
      // using Resend email service
      console.log('Event created, sending email notification to expert: ', {
        expertEmail: calendarUser.primaryEmailAddress.emailAddress,
        eventId: calendarEvent?.data?.id,
        eventSummary: eventSummary,
      });

      // Get the Google Meet link if available
      const meetLink = calendarEvent?.data?.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === 'video',
      )?.uri;

      // Send the actual email using our Resend utility
      const emailResult = await sendEmail({
        to: calendarUser.primaryEmailAddress.emailAddress,
        subject: `New Booking: ${eventSummary}`,
        html: await generateAppointmentEmailHtml({
          expertName: calendarUser.fullName || 'Expert',
          clientName: guestName,
          appointmentDate: formattedTime,
          appointmentDuration: formattedDuration,
          eventTitle: eventName,
          meetLink: meetLink || undefined,
          notes: guestNotes ? guestNotes : undefined,
        }),
      });

      if (!emailResult.success) {
        console.error('Failed to send expert notification email:', emailResult.error);
      } else {
        console.log('Expert notification email sent successfully:', emailResult.messageId);
      }
    } catch (error) {
      console.error('Error sending expert notification:', error);
      // Don't fail the whole operation if just the email notification fails
    }

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
