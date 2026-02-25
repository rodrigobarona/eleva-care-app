export type CalendarProvider =
  | 'google-calendar'
  | 'microsoft-outlook-calendar';

export interface CalendarInfo {
  id: string;
  name: string;
  provider: CalendarProvider;
  primary: boolean;
  writable: boolean;
  color?: string;
  timeZone?: string;
}

export interface FreeBusySlot {
  start: Date;
  end: Date;
}

export interface CalendarEventInput {
  title: string;
  startTime: Date;
  endTime: Date;
  attendees: Array<{ email: string; name?: string }>;
  description?: string;
  timeZone?: string;
  createMeetLink?: boolean;
}

export interface CalendarEventResult {
  id: string;
  provider: CalendarProvider;
  calendarId: string;
  meetLink?: string;
  htmlLink?: string;
}

export interface CalendarAdapter {
  listCalendars(accessToken: string): Promise<CalendarInfo[]>;

  getFreeBusy(
    accessToken: string,
    calendarIds: string[],
    start: Date,
    end: Date,
  ): Promise<FreeBusySlot[]>;

  createEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEventInput,
  ): Promise<CalendarEventResult>;

  updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEventInput>,
  ): Promise<CalendarEventResult>;

  deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
  ): Promise<void>;
}
