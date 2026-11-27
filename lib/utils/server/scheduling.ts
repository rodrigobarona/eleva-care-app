import type { DAYS_OF_WEEK_IN_ORDER } from '@/app/data/constants';
import { db } from '@/drizzle/db';
import type { ScheduleAvailabilityTable } from '@/drizzle/schema';
import 'core-js/actual/object/group-by';
import {
  addMinutes,
  isFriday,
  isMonday,
  isSameDay,
  isSaturday,
  isSunday,
  isThursday,
  isTuesday,
  isWednesday,
  isWithinInterval,
  setHours,
  setMinutes,
  startOfDay,
} from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

interface ScheduleEvent {
  clerkUserId: string;
  durationInMinutes: number;
}

interface GetValidTimesOptions {
  /**
   * Stop after this many valid times. `times` is expected in ascending order, so
   * `{ limit: 1 }` returns the next available slot without evaluating the rest
   * of the booking window (used by the profile page's "next available" badge).
   */
  limit?: number;
}

const MINUTE_MS = 60_000;

export async function getValidTimesFromSchedule(
  times: Date[],
  event: ScheduleEvent,
  calendarEvents: Array<{ start: Date; end: Date }>,
  excludeGuestEmail?: string,
  options: GetValidTimesOptions = {},
) {
  // The three lookups are independent, so run them in parallel.
  const currentTime = new Date();
  const [schedule, activeReservations, settings] = await Promise.all([
    db.query.ScheduleTable.findFirst({
      where: ({ clerkUserId: userIdCol }, { eq }) => eq(userIdCol, event.clerkUserId),
      with: { availabilities: true },
    }),
    // Active slot reservations for this expert
    db.query.SlotReservationTable.findMany({
      where: (fields, { eq, and, gt }) =>
        and(eq(fields.clerkUserId, event.clerkUserId), gt(fields.expiresAt, currentTime)),
    }),
    // Scheduling settings for minimum notice period and buffer times
    db.query.schedulingSettings.findFirst({
      where: ({ userId: userIdCol }, { eq }) => eq(userIdCol, event.clerkUserId),
    }),
  ]);

  if (schedule == null) return [];

  // Convert reservations to a Set for faster lookup (exclude returning guest's own reservations)
  const reservedTimes = new Set(
    activeReservations
      .filter((r) => !excludeGuestEmail || r.guestEmail !== excludeGuestEmail)
      .map((r) => r.startTime.toISOString()),
  );

  // Only log detailed reservation info in development
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[getValidTimesFromSchedule] Found ${activeReservations.length} active slot reservations:`,
      {
        expertId: event.clerkUserId,
        reservedSlots: activeReservations.map((r) => ({
          startTime: r.startTime.toISOString(),
          guestEmail: r.guestEmail,
          expiresAt: r.expiresAt.toISOString(),
        })),
      },
    );
  }

  const minimumNotice = settings?.minimumNotice ?? 1440; // Default to 24 hours if not set
  const beforeEventBuffer = settings?.beforeEventBuffer ?? 15; // Default to 15 minutes if not set
  const afterEventBuffer = settings?.afterEventBuffer ?? 15; // Default to 15 minutes if not set

  const now = new Date();
  const earliestPossibleTime = addMinutes(now, minimumNotice);

  // Calculate if we should use day-level granularity
  // If minimum notice is 24 hours or more, we'll use day-level granularity
  const useDayGranularity = minimumNotice >= 1440;

  // For day-level granularity, calculate the earliest possible day
  const earliestStartOfDay = startOfDay(earliestPossibleTime);

  // --- Loop-invariant work, hoisted out of the per-slot loop ---------------
  // A booking page evaluates thousands of slots (e.g. 60 days x 48 slots/day)
  // against every calendar event, so per-slot allocations and timezone math
  // dominate the CPU cost of rendering availability.

  // Calendar events as epoch-ms pairs (avoids Date allocation per comparison)
  const busyIntervals = calendarEvents.map((calendarEvent) => ({
    start: calendarEvent.start.getTime(),
    end: calendarEvent.end.getTime(),
  }));

  const groupedAvailabilities = Object.groupBy(schedule.availabilities, (a) => a.dayOfWeek);

  // Availability windows depend only on the slot's calendar day (in the server's
  // local time, matching getAvailabilities' setHours/isMonday semantics), so
  // compute them once per day instead of once per slot.
  const availabilitiesByDay = new Map<string, Array<{ start: Date; end: Date }>>();
  const getDayAvailabilities = (time: Date) => {
    const dayKey = `${time.getFullYear()}-${time.getMonth()}-${time.getDate()}`;
    let availabilities = availabilitiesByDay.get(dayKey);
    if (availabilities === undefined) {
      availabilities = getAvailabilities(groupedAvailabilities, time, schedule.timezone);
      availabilitiesByDay.set(dayKey, availabilities);
    }
    return availabilities;
  };

  const beforeBufferMs = beforeEventBuffer * MINUTE_MS;
  const afterBufferMs = (event.durationInMinutes + afterEventBuffer) * MINUTE_MS;
  const limit = options.limit ?? Number.POSITIVE_INFINITY;

  const validTimes: Date[] = [];
  for (const time of times) {
    if (validTimes.length >= limit) break;

    // Check if this time slot is currently reserved
    if (reservedTimes.has(time.toISOString())) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[getValidTimesFromSchedule] Skipping reserved slot: ${time.toISOString()}`);
      }
      continue;
    }

    // For short notice periods (< 24 hours), use exact time comparison
    if (!useDayGranularity) {
      if (time < earliestPossibleTime) continue;
    } else {
      // For longer notice periods (>= 24 hours)
      const timeStartOfDay = startOfDay(time);

      // If the day is before the earliest possible day, skip it
      if (timeStartOfDay < earliestStartOfDay) continue;

      // If it's the transition day (the day when minimum notice ends),
      // only show times after the minimum notice period
      if (isSameDay(timeStartOfDay, earliestStartOfDay)) {
        if (time < earliestPossibleTime) continue;
      }
      // For all subsequent days, show all available times
      // No additional time filtering needed here
    }

    // Meeting window including buffers (epoch ms)
    const timeMs = time.getTime();
    const meetingStartWithBuffer = timeMs - beforeBufferMs;
    const meetingEndWithBuffer = timeMs + afterBufferMs;

    // Check if the meeting time (including buffers) overlaps with any calendar event
    const hasCalendarConflict = busyIntervals.some(
      (busy) =>
        (meetingStartWithBuffer >= busy.start && meetingStartWithBuffer < busy.end) ||
        (meetingEndWithBuffer > busy.start && meetingEndWithBuffer <= busy.end) ||
        (meetingStartWithBuffer <= busy.start && meetingEndWithBuffer >= busy.end),
    );

    if (hasCalendarConflict) continue;

    const availabilities = getDayAvailabilities(time);
    if (availabilities.length === 0) continue;

    const eventInterval = {
      start: new Date(meetingStartWithBuffer), // Include buffer before event
      end: new Date(meetingEndWithBuffer), // Include buffer after event
    };

    const isTimeValid = availabilities.some(
      (availability) =>
        isWithinInterval(eventInterval.start, availability) &&
        isWithinInterval(eventInterval.end, availability),
    );

    if (isTimeValid) {
      validTimes.push(time);
    }
  }

  // Only log detailed results in development
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[getValidTimesFromSchedule] Returning ${validTimes.length} valid times out of ${times.length} requested`,
    );
  }

  return validTimes;
}

function getAvailabilities(
  groupedAvailabilities: Partial<
    Record<
      (typeof DAYS_OF_WEEK_IN_ORDER)[number],
      (typeof ScheduleAvailabilityTable.$inferSelect)[]
    >
  >,
  date: Date,
  timezone: string,
) {
  let availabilities: (typeof ScheduleAvailabilityTable.$inferSelect)[] | undefined;

  if (isMonday(date)) {
    availabilities = groupedAvailabilities.monday;
  }
  if (isTuesday(date)) {
    availabilities = groupedAvailabilities.tuesday;
  }
  if (isWednesday(date)) {
    availabilities = groupedAvailabilities.wednesday;
  }
  if (isThursday(date)) {
    availabilities = groupedAvailabilities.thursday;
  }
  if (isFriday(date)) {
    availabilities = groupedAvailabilities.friday;
  }
  if (isSaturday(date)) {
    availabilities = groupedAvailabilities.saturday;
  }
  if (isSunday(date)) {
    availabilities = groupedAvailabilities.sunday;
  }

  if (availabilities == null) return [];

  return availabilities.map(({ startTime, endTime }) => {
    const start = fromZonedTime(
      setMinutes(
        setHours(date, Number.parseInt(startTime.split(':')[0])),
        Number.parseInt(startTime.split(':')[1]),
      ),
      timezone,
    );

    const end = fromZonedTime(
      setMinutes(
        setHours(date, Number.parseInt(endTime.split(':')[0])),
        Number.parseInt(endTime.split(':')[1]),
      ),
      timezone,
    );

    return { start, end };
  });
}
