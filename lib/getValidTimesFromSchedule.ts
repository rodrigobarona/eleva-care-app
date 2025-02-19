import type { DAYS_OF_WEEK_IN_ORDER } from '@/app/data/constants';
import { db } from '@/drizzle/db';
import type { ScheduleAvailabilityTable } from '@/drizzle/schema';
import 'core-js/actual/object/group-by';
import {
  addMinutes,
  isFriday,
  isMonday,
  isSaturday,
  isSunday,
  isThursday,
  isTuesday,
  isWednesday,
  isWithinInterval,
  setHours,
  setMinutes,
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

  const validTimes = [];
  for (const time of times) {
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
