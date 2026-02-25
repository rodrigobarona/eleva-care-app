import * as Sentry from '@sentry/nextjs';
import type {
  CalendarAdapter,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  CalendarProvider,
  FreeBusySlot,
} from './types';
import { getCalendarToken } from './pipes';
import { googleCalendar } from './google';
import { outlookCalendar } from './outlook';

const { logger } = Sentry;

const adapters: Record<CalendarProvider, CalendarAdapter> = {
  'google-calendar': googleCalendar,
  'microsoft-outlook-calendar': outlookCalendar,
};

function getAdapter(provider: CalendarProvider): CalendarAdapter {
  return adapters[provider];
}

/**
 * Provider-agnostic calendar facade. All methods return `null` or `[]`
 * when the user has not connected a calendar -- never throws.
 */
export const CalendarService = {
  async listCalendars(
    provider: CalendarProvider,
    userId: string,
    orgId: string,
  ): Promise<CalendarInfo[]> {
    const token = await getCalendarToken(provider, userId, orgId);
    if (!token) return [];
    try {
      return await getAdapter(provider).listCalendars(token);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { calendarProvider: provider, operation: 'listCalendars' },
      });
      return [];
    }
  },

  async getFreeBusy(
    provider: CalendarProvider,
    userId: string,
    orgId: string,
    start: Date,
    end: Date,
  ): Promise<FreeBusySlot[]> {
    const token = await getCalendarToken(provider, userId, orgId);
    if (!token) return [];
    try {
      return await getAdapter(provider).getFreeBusy(
        token,
        ['primary'],
        start,
        end,
      );
    } catch (error) {
      Sentry.captureException(error, {
        tags: { calendarProvider: provider, operation: 'getFreeBusy' },
      });
      return [];
    }
  },

  /**
   * Aggregate free/busy across all connected providers.
   */
  async getAllFreeBusy(
    userId: string,
    orgId: string,
    start: Date,
    end: Date,
  ): Promise<FreeBusySlot[]> {
    const providers: CalendarProvider[] = [
      'google-calendar',
      'microsoft-outlook-calendar',
    ];
    const results = await Promise.all(
      providers.map((p) => this.getFreeBusy(p, userId, orgId, start, end)),
    );
    return results.flat();
  },

  async createEvent(
    provider: CalendarProvider,
    userId: string,
    orgId: string,
    calendarId: string,
    event: CalendarEventInput,
  ): Promise<CalendarEventResult | null> {
    const token = await getCalendarToken(provider, userId, orgId);
    if (!token) return null;
    try {
      return await getAdapter(provider).createEvent(
        token,
        calendarId,
        event,
      );
    } catch (error) {
      Sentry.captureException(error, {
        tags: { calendarProvider: provider, operation: 'createEvent' },
      });
      logger.error('Calendar event creation failed', {
        provider,
        calendarId,
        userId,
      });
      return null;
    }
  },

  async updateEvent(
    provider: CalendarProvider,
    userId: string,
    orgId: string,
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEventInput>,
  ): Promise<CalendarEventResult | null> {
    const token = await getCalendarToken(provider, userId, orgId);
    if (!token) return null;
    try {
      return await getAdapter(provider).updateEvent(
        token,
        calendarId,
        eventId,
        event,
      );
    } catch (error) {
      Sentry.captureException(error, {
        tags: { calendarProvider: provider, operation: 'updateEvent' },
      });
      return null;
    }
  },

  async deleteEvent(
    provider: CalendarProvider,
    userId: string,
    orgId: string,
    calendarId: string,
    eventId: string,
  ): Promise<boolean> {
    const token = await getCalendarToken(provider, userId, orgId);
    if (!token) return false;
    try {
      await getAdapter(provider).deleteEvent(token, calendarId, eventId);
      return true;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { calendarProvider: provider, operation: 'deleteEvent' },
      });
      return false;
    }
  },
};
