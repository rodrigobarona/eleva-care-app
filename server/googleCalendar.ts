/**
 * Google Calendar Integration Service
 *
 * This module provides a service for integrating with Google Calendar API.
 * It handles OAuth authentication, event management, and meeting creation.
 * The service is implemented as a singleton to maintain a consistent instance
 * throughout the application.
 *
 * @module GoogleCalendarService
 */
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

/**
 * GoogleCalendarService - Singleton service for Google Calendar integration
 *
 * This class manages Google Calendar operations including:
 * - OAuth authentication with Clerk
 * - Fetching calendar events
 * - Creating new calendar events with Google Meet
 * - Sending email notifications for appointments
 */
class GoogleCalendarService {
  private static instance: GoogleCalendarService | null = null;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of GoogleCalendarService
   * @returns The GoogleCalendarService instance
   */
  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  /**
   * Gets an authenticated OAuth client for Google API
   *
   * Uses Clerk to obtain a Google OAuth token for the specified user,
   * then configures a Google OAuth client with the token
   *
   * @param clerkUserId Clerk user ID to obtain OAuth token for
   * @returns Configured Google OAuth client
   * @throws Error if no OAuth token found or unable to obtain client
   */
  async getOAuthClient(clerkUserId: string) {
    // Create Clerk client to access OAuth tokens
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    try {
      // Get OAuth token from Clerk
      const response = await clerk.users.getUserOauthAccessToken(clerkUserId, 'google');
      const token = response.data[0]?.token;

      if (!token) {
        throw new Error('No OAuth token found');
      }

      // Create and configure Google OAuth client
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

  /**
   * Fetches calendar events for a user within a specific time range
   *
   * Gets all events from the user's primary calendar within the provided
   * start and end times. Filters out cancelled events and transparent events.
   * Handles both all-day events and timed events.
   *
   * @param clerkUserId Clerk user ID to fetch calendar events for
   * @param options Object containing start and end dates for the time range
   * @returns Array of event objects with start and end times
   */
  async getCalendarEventTimes(clerkUserId: string, { start, end }: { start: Date; end: Date }) {
    // Get authenticated OAuth client
    const oAuthClient = await this.getOAuthClient(clerkUserId);

    console.log('Fetching calendar events:', {
      timeRange: { start: start.toISOString(), end: end.toISOString() },
      userId: clerkUserId,
    });

    // Fetch events from Google Calendar API
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

    // Process and filter events
    return (
      events.data.items
        ?.map((event) => {
          // Skip "free" events (marked as transparent)
          if (event.transparency === 'transparent') {
            console.log('Skipping transparent event:', event.summary);
            return null;
          }

          // Skip cancelled events
          if (event.status === 'cancelled') {
            console.log('Skipping cancelled event:', event.summary);
            return null;
          }

          // Handle all-day events
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

          // Handle timed events
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

  /**
   * Creates a new calendar event with Google Meet integration
   *
   * This comprehensive method:
   * 1. Creates a Google Calendar event with Google Meet
   * 2. Shortens the Meet link using Dub.co
   * 3. Updates the event description with the shortened link
   * 4. Sends email notifications to both the expert and client
   *
   * @param params Event creation parameters
   * @param params.clerkUserId Clerk user ID of the calendar owner (expert)
   * @param params.guestName Name of the guest/client
   * @param params.guestEmail Email of the guest/client
   * @param params.startTime Start time of the appointment
   * @param params.guestNotes Optional notes from the guest
   * @param params.durationInMinutes Duration of the appointment in minutes
   * @param params.eventName Name/title of the event
   * @param params.timezone Optional timezone for display formatting (falls back to UTC if invalid)
   * @param params.locale Optional locale for email formatting (defaults to 'en')
   * @returns Created calendar event data with additional meet link information
   */
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
    // Get authenticated OAuth client
    const oAuthClient = await this.getOAuthClient(clerkUserId);

    // Get Clerk user information
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

    // Create the actual calendar event
    const calendarEvent = await google.calendar('v3').events.insert({
      calendarId: 'primary',
      auth: oAuthClient,
      sendUpdates: 'all',
      requestBody: {
        // Set up attendees (guest and calendar owner)
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
        // Set up Google Meet integration
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

            // Update the calendar event with the new description
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

  /**
   * Checks if a user has valid Google OAuth tokens
   *
   * Verifies that the specified user has connected their Google account
   * and that the OAuth tokens are available via Clerk
   *
   * @param userId Clerk user ID to check for valid tokens
   * @returns True if valid tokens exist, false otherwise
   */
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
 * Creates a new calendar event with Google Meet integration
 *
 * This is a convenience wrapper around the GoogleCalendarService.createCalendarEvent method
 *
 * @param params Event creation parameters
 * @param params.clerkUserId Clerk user ID of the calendar owner (expert)
 * @param params.guestName Name of the guest/client
 * @param params.guestEmail Email of the guest/client
 * @param params.startTime Start time of the appointment
 * @param params.guestNotes Optional notes from the guest
 * @param params.durationInMinutes Duration of the appointment in minutes
 * @param params.eventName Name/title of the event
 * @param params.timezone Optional timezone for display formatting (falls back to UTC if invalid)
 * @param params.locale Optional locale for email formatting (defaults to 'en')
 * @returns Created calendar event data with additional meet link information
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

/**
 * Gets a Google Calendar client for a specific user
 *
 * Obtains an OAuth token via Clerk and creates a configured Google Calendar client
 *
 * @param userId Clerk user ID to create the client for
 * @returns Configured Google Calendar client
 * @throws Error if no access token found or client creation fails
 */
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

/**
 * Gets a Google OAuth access token for a Clerk user
 *
 * @param clerkUserId Clerk user ID to get the token for
 * @returns OAuth access token or null if not available
 */
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
