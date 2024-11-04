import "core-js/actual/object/group-by";
import { DAYS_OF_WEEK_IN_ORDER } from "@/app/data/constants";
import { db } from "@/drizzle/db";
import { ScheduleAvailabilityTable } from "@/drizzle/schema";
import { getCalendarEventTimes } from "@/server/googleCalendar";
import {
  addMinutes,
  areIntervalsOverlapping,
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
} from "date-fns";
import { fromZonedTime } from "date-fns-tz";

export async function getValidTimesFromSchedule(
  timesInOrder: Date[],
  event: { clerkUserId: string; durationInMinutes: number },
) {
  console.log("getValidTimes - Input:", {
    firstTime: timesInOrder[0],
    lastTime: timesInOrder.at(-1),
    eventDetails: event,
  });

  const start = timesInOrder[0];
  const end = timesInOrder.at(-1);

  if (start == null || end == null) return [];

  const schedule = await db.query.ScheduleTable.findFirst({
    where: ({ clerkUserId: userIdCol }, { eq }) =>
      eq(userIdCol, event.clerkUserId),
    with: { availabilities: true },
  });

  console.log("getValidTimes - Schedule Found:", {
    scheduleTimezone: schedule?.timezone,
    availabilitiesCount: schedule?.availabilities.length,
  });

  if (schedule == null) return [];

  const groupedAvailabilities = Object.groupBy(
    schedule.availabilities,
    (a) => a.dayOfWeek,
  );

  const eventTimes = await getCalendarEventTimes(event.clerkUserId, {
    start,
    end,
  });

  console.log("getValidTimes - Calendar Events:", {
    eventTimesCount: eventTimes.length,
  });

  const filteredTimes = timesInOrder.filter((intervalDate) => {
    const availabilities = getAvailabilities(
      groupedAvailabilities,
      intervalDate,
      schedule.timezone,
    );

    console.log("getValidTimes - Checking Interval:", {
      intervalDate: intervalDate.toISOString(),
      availabilitiesCount: availabilities.length,
    });

    const eventInterval = {
      start: intervalDate,
      end: addMinutes(intervalDate, event.durationInMinutes),
    };

    return (
      eventTimes.every((eventTime) => {
        return !areIntervalsOverlapping(eventTime, eventInterval);
      }) &&
      availabilities.some((availability) => {
        return (
          isWithinInterval(eventInterval.start, availability) &&
          isWithinInterval(eventInterval.end, availability)
        );
      })
    );
  });

  console.log("getValidTimes - Result:", {
    filteredTimesCount: filteredTimes.length,
    firstFilteredTime: filteredTimes[0],
  });

  return filteredTimes;
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
  let availabilities:
    | (typeof ScheduleAvailabilityTable.$inferSelect)[]
    | undefined;

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
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const start = new Date(date);
    start.setHours(startHour, startMinute, 0, 0);

    const end = new Date(date);
    end.setHours(endHour, endMinute, 0, 0);

    return { start, end };
  });
}
