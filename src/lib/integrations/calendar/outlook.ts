import * as Sentry from '@sentry/nextjs';
import type {
  CalendarAdapter,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  FreeBusySlot,
} from './types';

const { logger } = Sentry;

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

async function graphFetch<T = unknown>(
  accessToken: string,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Microsoft Graph API ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

interface GraphCalendar {
  id: string;
  name: string;
  isDefaultCalendar?: boolean;
  canEdit?: boolean;
  color?: string;
}

interface GraphScheduleItem {
  status: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

interface GraphEvent {
  id: string;
  webLink?: string;
  onlineMeeting?: { joinUrl?: string };
}

export const outlookCalendar: CalendarAdapter = {
  async listCalendars(accessToken): Promise<CalendarInfo[]> {
    const data = await graphFetch<{ value: GraphCalendar[] }>(
      accessToken,
      '/me/calendars',
    );

    return data.value.map((cal) => ({
      id: cal.id,
      name: cal.name,
      provider: 'microsoft-outlook-calendar' as const,
      primary: cal.isDefaultCalendar ?? false,
      writable: cal.canEdit ?? true,
      color: cal.color ?? undefined,
    }));
  },

  async getFreeBusy(
    accessToken,
    _calendarIds,
    start,
    end,
  ): Promise<FreeBusySlot[]> {
    const data = await graphFetch<{
      value: Array<{ scheduleItems: GraphScheduleItem[] }>;
    }>(accessToken, '/me/calendar/getSchedule', {
      method: 'POST',
      body: JSON.stringify({
        schedules: ['me'],
        startTime: { dateTime: start.toISOString(), timeZone: 'UTC' },
        endTime: { dateTime: end.toISOString(), timeZone: 'UTC' },
      }),
    });

    return (data.value?.[0]?.scheduleItems ?? [])
      .filter(
        (item) =>
          item.status === 'busy' || item.status === 'tentative',
      )
      .map((item) => ({
        start: new Date(item.start.dateTime),
        end: new Date(item.end.dateTime),
      }));
  },

  async createEvent(
    accessToken,
    calendarId,
    event,
  ): Promise<CalendarEventResult> {
    const body: Record<string, unknown> = {
      subject: event.title,
      body: event.description
        ? { contentType: 'HTML', content: event.description }
        : undefined,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timeZone || 'UTC',
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timeZone || 'UTC',
      },
      attendees: event.attendees.map((a) => ({
        emailAddress: { address: a.email, name: a.name },
        type: 'required',
      })),
      ...(event.createMeetLink && {
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness',
      }),
    };

    const data = await graphFetch<GraphEvent>(
      accessToken,
      `/me/calendars/${calendarId}/events`,
      { method: 'POST', body: JSON.stringify(body) },
    );

    logger.info('Outlook Calendar event created', {
      eventId: data.id,
      calendarId,
    });

    return {
      id: data.id,
      provider: 'microsoft-outlook-calendar',
      calendarId,
      meetLink: data.onlineMeeting?.joinUrl ?? undefined,
      htmlLink: data.webLink ?? undefined,
    };
  },

  async updateEvent(
    accessToken,
    calendarId,
    eventId,
    event,
  ): Promise<CalendarEventResult> {
    const body: Record<string, unknown> = {};
    if (event.title) body.subject = event.title;
    if (event.description) body.body = { contentType: 'HTML', content: event.description };
    if (event.startTime) body.start = { dateTime: event.startTime.toISOString(), timeZone: event.timeZone || 'UTC' };
    if (event.endTime) body.end = { dateTime: event.endTime.toISOString(), timeZone: event.timeZone || 'UTC' };
    if (event.attendees) {
      body.attendees = event.attendees.map((a) => ({
        emailAddress: { address: a.email, name: a.name },
        type: 'required',
      }));
    }

    const data = await graphFetch<GraphEvent>(
      accessToken,
      `/me/calendars/${calendarId}/events/${eventId}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    );

    return {
      id: data.id,
      provider: 'microsoft-outlook-calendar',
      calendarId,
      meetLink: data.onlineMeeting?.joinUrl ?? undefined,
      htmlLink: data.webLink ?? undefined,
    };
  },

  async deleteEvent(
    accessToken,
    calendarId,
    eventId,
  ): Promise<void> {
    await graphFetch(
      accessToken,
      `/me/calendars/${calendarId}/events/${eventId}`,
      { method: 'DELETE' },
    );

    logger.info('Outlook Calendar event deleted', { eventId, calendarId });
  },
};
