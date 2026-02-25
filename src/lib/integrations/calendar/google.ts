import * as Sentry from '@sentry/nextjs';
import { google } from 'googleapis';
import type {
  CalendarAdapter,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  FreeBusySlot,
} from './types';

const { logger } = Sentry;

function createAuth(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

export const googleCalendar: CalendarAdapter = {
  async listCalendars(accessToken): Promise<CalendarInfo[]> {
    const auth = createAuth(accessToken);
    const cal = google.calendar({ version: 'v3', auth });
    const { data } = await cal.calendarList.list({
      showHidden: false,
      showDeleted: false,
    });

    return (data.items ?? []).map((item) => ({
      id: item.id!,
      name: item.summary || 'Unnamed Calendar',
      provider: 'google-calendar' as const,
      primary: item.primary ?? false,
      writable:
        item.accessRole === 'owner' || item.accessRole === 'writer',
      color: item.backgroundColor ?? undefined,
      timeZone: item.timeZone ?? undefined,
    }));
  },

  async getFreeBusy(
    accessToken,
    calendarIds,
    start,
    end,
  ): Promise<FreeBusySlot[]> {
    const auth = createAuth(accessToken);
    const cal = google.calendar({ version: 'v3', auth });

    const { data } = await cal.freebusy.query({
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: calendarIds.map((id) => ({ id })),
      },
    });

    const slots: FreeBusySlot[] = [];
    for (const calId of calendarIds) {
      for (const busy of data.calendars?.[calId]?.busy ?? []) {
        if (busy.start && busy.end) {
          slots.push({
            start: new Date(busy.start),
            end: new Date(busy.end),
          });
        }
      }
    }
    return slots;
  },

  async createEvent(
    accessToken,
    calendarId,
    event,
  ): Promise<CalendarEventResult> {
    const auth = createAuth(accessToken);
    const cal = google.calendar({ version: 'v3', auth });

    const { data } = await cal.events.insert({
      calendarId,
      auth,
      sendUpdates: 'all',
      conferenceDataVersion: event.createMeetLink ? 1 : 0,
      requestBody: {
        summary: event.title,
        description: event.description,
        start: { dateTime: event.startTime.toISOString(), timeZone: event.timeZone },
        end: { dateTime: event.endTime.toISOString(), timeZone: event.timeZone },
        attendees: event.attendees.map((a) => ({
          email: a.email,
          displayName: a.name,
          responseStatus: 'accepted' as const,
        })),
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        guestsCanSeeOtherGuests: true,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'email', minutes: 15 },
            { method: 'popup', minutes: 5 },
          ],
        },
        ...(event.createMeetLink && {
          conferenceData: {
            createRequest: {
              requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }),
      },
    });

    logger.info('Google Calendar event created', {
      eventId: data.id,
      calendarId,
    });

    return {
      id: data.id!,
      provider: 'google-calendar',
      calendarId,
      meetLink: data.hangoutLink ?? undefined,
      htmlLink: data.htmlLink ?? undefined,
    };
  },

  async updateEvent(
    accessToken,
    calendarId,
    eventId,
    event,
  ): Promise<CalendarEventResult> {
    const auth = createAuth(accessToken);
    const cal = google.calendar({ version: 'v3', auth });

    const requestBody: Record<string, unknown> = {};
    if (event.title) requestBody.summary = event.title;
    if (event.description) requestBody.description = event.description;
    if (event.startTime) requestBody.start = { dateTime: event.startTime.toISOString(), timeZone: event.timeZone };
    if (event.endTime) requestBody.end = { dateTime: event.endTime.toISOString(), timeZone: event.timeZone };
    if (event.attendees) {
      requestBody.attendees = event.attendees.map((a) => ({
        email: a.email,
        displayName: a.name,
      }));
    }

    const { data } = await cal.events.patch({
      calendarId,
      eventId,
      auth,
      sendUpdates: 'all',
      requestBody,
    });

    return {
      id: data.id!,
      provider: 'google-calendar',
      calendarId,
      meetLink: data.hangoutLink ?? undefined,
      htmlLink: data.htmlLink ?? undefined,
    };
  },

  async deleteEvent(accessToken, calendarId, eventId): Promise<void> {
    const auth = createAuth(accessToken);
    const cal = google.calendar({ version: 'v3', auth });

    await cal.events.delete({
      calendarId,
      eventId,
      auth,
      sendUpdates: 'all',
    });

    logger.info('Google Calendar event deleted', { eventId, calendarId });
  },
};
