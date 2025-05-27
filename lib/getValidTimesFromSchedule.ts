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

export async function getValidTimesFromSchedule(
  times: Date[],
  event: ScheduleEvent,
  calendarEvents: Array<{ start: Date; end: Date }>,
) {
  const schedule = await db.query.ScheduleTable.findFirst({
    where: ({ clerkUserId: userIdCol }, { eq }) => eq(userIdCol, event.clerkUserId),
    with: { availabilities: true },
  });

  if (schedule == null) return [];

  // Get scheduling settings for minimum notice period
  const settings = await db.query.schedulingSettings.findFirst({
    where: ({ userId: userIdCol }, { eq }) => eq(userIdCol, event.clerkUserId),
  });

  const minimumNotice = settings?.minimumNotice ?? 1440; // Default to 24 hours if not set
  const now = new Date();
  const earliestPossibleTime = addMinutes(now, minimumNotice);

  // Calculate if we should use day-level granularity
  // If minimum notice is 24 hours or more, we'll use day-level granularity
  const useDayGranularity = minimumNotice >= 1440;

  // For day-level granularity, calculate the earliest possible day
  const earliestStartOfDay = startOfDay(earliestPossibleTime);

  const validTimes = [];
  for (const time of times) {
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

    // Check if time conflicts with any calendar event
    const hasCalendarConflict = calendarEvents.some((calendarEvent) => {
      const meetingEnd = addMinutes(time, event.durationInMinutes);
      return (
        (time >= calendarEvent.start && time < calendarEvent.end) ||
        (meetingEnd > calendarEvent.start && meetingEnd <= calendarEvent.end) ||
        (time <= calendarEvent.start && meetingEnd >= calendarEvent.end)
      );
    });

    if (hasCalendarConflict) continue;

    const groupedAvailabilities = Object.groupBy(schedule.availabilities, (a) => a.dayOfWeek);

    const availabilities = getAvailabilities(groupedAvailabilities, time, schedule.timezone);
    const eventInterval = {
      start: time,
      end: addMinutes(time, event.durationInMinutes),
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
