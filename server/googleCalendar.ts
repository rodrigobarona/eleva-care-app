import { createShortMeetLink } from '@/lib/dub';
import { generateAppointmentEmail, sendEmail } from '@/lib/email';
import { createClerkClient } from '@clerk/nextjs/server';
import { addMinutes, endOfDay, startOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { google } from 'googleapis';
import 'use-server';

/**
 * Validates if a timezone string is valid by attempting to use it with Intl.DateTimeFormat
 * @param tz Timezone string to validate
 * @returns Boolean indicating if the timezone is valid
 */
function isValidTimezone(tz: string): boolean {
  if (!tz) return false;

  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

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
    timezone: providedTimezone,
    locale = 'en',
  }: {
    clerkUserId: string;
    guestName: string;
    guestEmail: string;
    startTime: Date;
    guestNotes?: string | null;
    durationInMinutes: number;
    eventName: string;
    timezone?: string;
    locale?: string;
  }) {
    const oAuthClient = await this.getOAuthClient(clerkUserId);
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const calendarUser = await clerk.users.getUser(clerkUserId);
    if (calendarUser.primaryEmailAddress == null) {
      throw new Error('Clerk user has no email');
    }

    // Generate a descriptive summary
    const eventSummary = `${guestName} + ${calendarUser.fullName}: ${eventName}`;

    // Format date and time with proper timezone support
    const formatDate = (date: Date, tz: string) => formatInTimeZone(date, tz, 'EEEE, MMMM d, yyyy');

    const formatTime = (date: Date, duration: number, tz: string) => {
      const endTime = addMinutes(date, duration);
      return `${formatInTimeZone(date, tz, 'h:mm a')} - ${formatInTimeZone(endTime, tz, 'h:mm a')}`;
    };

    // Get timezone information
    let timezone = 'UTC';

    // First try the provided timezone
    if (providedTimezone && isValidTimezone(providedTimezone)) {
      timezone = providedTimezone;
    } else if (providedTimezone) {
      console.warn(`Invalid timezone provided: ${providedTimezone}, falling back to defaults`);
    }

    // If no valid timezone provided, try to get from other sources
    if (timezone === 'UTC') {
      try {
        // Try to get from Intl API first
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detectedTimezone && isValidTimezone(detectedTimezone)) {
          timezone = detectedTimezone;
        }

        // Check if user has timezone stored in metadata (would override the default)
        if (
          calendarUser.privateMetadata &&
          typeof calendarUser.privateMetadata === 'object' &&
          calendarUser.privateMetadata.timezone
        ) {
          const metadataTimezone = calendarUser.privateMetadata.timezone as string;
          if (isValidTimezone(metadataTimezone)) {
            timezone = metadataTimezone;
          } else {
            console.warn(`Invalid timezone in user metadata: ${metadataTimezone}`);
          }
        }
      } catch (error) {
        console.warn('Error getting timezone, using UTC:', error);
      }
    }

    console.log('Using validated timezone:', timezone);

    // Format for display with the validated timezone
    const appointmentDate = formatDate(startTime, timezone);
    const appointmentTime = formatTime(startTime, durationInMinutes, timezone);
    const formattedDuration = `${durationInMinutes} minutes`;

    console.log('Creating calendar event with timezone:', {
      datetime: startTime.toISOString(),
      timezone,
      localizedTime: formatInTimeZone(startTime, timezone, 'PPpp'), // Log the localized time for debugging
      formattedDate: appointmentDate,
      formattedTime: appointmentTime,
    });

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
            organizer: true,
            optional: false,
          },
        ],
        description: guestNotes ? `Additional Details: ${guestNotes}` : undefined,
        start: {
          dateTime: startTime.toISOString(),
        },
        end: {
          dateTime: addMinutes(startTime, durationInMinutes).toISOString(),
        },
        summary: eventSummary,
        conferenceData: {
          createRequest: {
            requestId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        // Security and permissions settings
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        guestsCanSeeOtherGuests: true,
        // Reminder settings - these apply to the calendar owner (expert)
        // Guests will receive standard calendar notifications based on their settings
        // Note: Google Calendar API doesn't allow setting reminders for guests directly
        // Guests will get notifications based on their Google Calendar preferences
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 }, // 1 hour before
            { method: 'email', minutes: 15 }, // 15 minutes before
            { method: 'popup', minutes: 5 }, // 5 minutes before
          ],
        },
      },
      conferenceDataVersion: 1,
    });

    // Check if a Google Meet link was created and shorten it with Dub.co
    let meetLink = '';
    let shortMeetLink = '';

    if (calendarEvent.data.conferenceData?.conferenceId) {
      // Extract the Google Meet link
      meetLink = calendarEvent.data.hangoutLink || '';

      if (meetLink) {
        try {
          // Create a shortened URL with tracking parameters
          shortMeetLink = await createShortMeetLink({
            url: meetLink,
            expertName: calendarUser.fullName || undefined,
            expertUsername: calendarUser.username || undefined,
          });

          console.log('Generated short meet link:', shortMeetLink);

          // Update the calendar event description to include the shortened link
          if (shortMeetLink && shortMeetLink !== meetLink) {
            const updatedDescription = `Join the meeting: ${shortMeetLink}\n\n${
              calendarEvent.data.description || guestNotes
                ? `Additional Details: ${guestNotes}`
                : ''
            }`;

            await google.calendar('v3').events.patch({
              calendarId: 'primary',
              eventId: calendarEvent.data.id || '',
              auth: oAuthClient,
              requestBody: {
                description: updatedDescription,
              },
            });

            // Update the local event data
            calendarEvent.data.description = updatedDescription;
          }
        } catch (error) {
          console.error('Error processing Meet link:', error);
          // Continue with the original Meet link if shortening fails
        }
      }
    }

    try {
      // After creating the event, send an immediate email notification to the expert
      console.log('Event created, sending email notification to expert: ', {
        expertEmail: calendarUser.primaryEmailAddress.emailAddress,
        eventId: calendarEvent?.data?.id,
        eventSummary: eventSummary,
      });

      // Generate the email content for the expert
      const expertEmailContent = await generateAppointmentEmail({
        expertName: calendarUser.fullName || 'Expert',
        clientName: guestName,
        appointmentDate,
        appointmentTime,
        timezone,
        appointmentDuration: formattedDuration,
        eventTitle: eventName,
        meetLink: shortMeetLink || meetLink || undefined,
        notes: guestNotes ? guestNotes : undefined,
        locale,
      });

      // Send the expert notification
      const expertEmailResult = await sendEmail({
        to: calendarUser.primaryEmailAddress.emailAddress,
        subject: `New Booking: ${eventSummary}`,
        html: expertEmailContent.html,
        text: expertEmailContent.text,
      });

      if (!expertEmailResult.success) {
        console.error('Failed to send expert notification email:', expertEmailResult.error);
      } else {
        console.log('Expert notification email sent successfully:', expertEmailResult.messageId);
      }

      // Also send notification to the client
      console.log('Sending email notification to client:', {
        clientEmail: guestEmail,
        eventId: calendarEvent?.data?.id,
        eventSummary: eventSummary,
      });

      // Generate client email
      const clientEmailContent = await generateAppointmentEmail({
        expertName: calendarUser.fullName || 'Expert',
        clientName: guestName,
        appointmentDate,
        appointmentTime,
        timezone,
        appointmentDuration: formattedDuration,
        eventTitle: eventName,
        meetLink: shortMeetLink || meetLink || undefined,
        notes: guestNotes ? guestNotes : undefined,
        locale,
      });

      const clientEmailResult = await sendEmail({
        to: guestEmail,
        subject: `Appointment Confirmation: ${eventSummary}`,
        html: clientEmailContent.html,
        text: clientEmailContent.text,
      });

      if (!clientEmailResult.success) {
        console.error('Failed to send client notification email:', clientEmailResult.error);
      } else {
        console.log('Client notification email sent successfully:', clientEmailResult.messageId);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      // Don't fail the whole operation if just the email notification fails
    }

    // Add the original and shortened Meet links to the returned data
    return {
      ...calendarEvent.data,
      meetLink,
      shortMeetLink,
    };
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

/**
 * Creates a Google Calendar event for a user and guest, sends email notifications, and returns event details.
 *
 * Delegates event creation and notification logic to {@link GoogleCalendarService}. The event includes Google Meet conferencing and supports localization of email content via the optional {@link locale} parameter.
 *
 * @param params - Event details including user and guest information, timing, and optional timezone and locale.
 * @returns The created calendar event data, including any generated Meet links.
 */
export async function createCalendarEvent(params: {
  clerkUserId: string;
  guestName: string;
  guestEmail: string;
  startTime: Date;
  guestNotes?: string | null;
  durationInMinutes: number;
  eventName: string;
  timezone?: string; // Will be validated - invalid timezones will fall back to UTC
  locale?: string; // Add locale parameter
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
