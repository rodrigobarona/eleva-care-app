import 'server-only';

import GoogleCalendarService from '@/server/googleCalendar';
import { endOfDay, startOfDay } from 'date-fns';

// Busy blocks at or above this length are treated as all-day / multi-day events
// (e.g. an "out of office" or vacation block) and ignored for private booking
// links. A private link may intentionally land on a day the expert has blocked
// off, but real timed meetings are always shorter than this and must still
// block the slot to prevent double-booking.
const ALL_DAY_THRESHOLD_MS = 22 * 60 * 60 * 1000;

/**
 * Returns true if the slot [slotStart, slotEnd) overlaps a *timed* busy event
 * on the expert's primary Google Calendar. All-day / multi-day busy blocks are
 * ignored so a private booking link can target a slot on an otherwise
 * blocked-off day, while real meetings still prevent double-booking.
 *
 * The whole day is queried (rather than just the slot window) so all-day and
 * multi-day busy blocks surface at their full length and can be filtered out
 * reliably regardless of how Google clamps free/busy intervals.
 */
export async function hasTimedCalendarConflict(
  clerkUserId: string,
  slotStart: Date,
  slotEnd: Date,
): Promise<boolean> {
  const calendarService = GoogleCalendarService.getInstance();
  const busySlots = await calendarService.getCalendarEventTimes(clerkUserId, {
    start: startOfDay(slotStart),
    end: endOfDay(slotStart),
  });

  return busySlots.some((busy) => {
    const isAllDay = busy.end.getTime() - busy.start.getTime() >= ALL_DAY_THRESHOLD_MS;
    return !isAllDay && busy.start < slotEnd && busy.end > slotStart;
  });
}
