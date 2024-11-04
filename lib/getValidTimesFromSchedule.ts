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
    firstTime: timesInOrder[0]?.toISOString(),
    lastTime: timesInOrder.at(-1)?.toISOString(),
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

  // Add server environment logging
  console.log("getValidTimes - Server Environment:", {
    region: process.env.VERCEL_REGION ?? "local",
    serverTime: new Date().toISOString(),
    serverTimeLocal: new Date().toLocaleString(),
  });

  // Ensure UTC dates
  const utcTimes = timesInOrder.map((time) => new Date(time.toISOString()));

  console.log("getValidTimes - Time Normalization:", {
    originalFirstTime: timesInOrder[0]?.toISOString(),
    normalizedFirstTime: utcTimes[0]?.toISOString(),
  });

  return utcTimes.filter((intervalDate) => {
    // Ensure UTC for interval checks
    const utcIntervalDate = new Date(intervalDate.toISOString());

    const availabilities = getAvailabilities(
      groupedAvailabilities,
      utcIntervalDate,
      schedule.timezone,
    );

    console.log("getValidTimes - Interval Check:", {
      originalDate: intervalDate.toISOString(),
      utcDate: utcIntervalDate.toISOString(),
      scheduleTimezone: schedule.timezone,
      region: process.env.VERCEL_REGION ?? "local",
    });

    const eventInterval = {
      start: intervalDate,
      end: addMinutes(intervalDate, event.durationInMinutes),
    };

    console.log("getValidTimes - Checking Interval:", {
      intervalDate: intervalDate.toISOString(),
      availabilitiesCount: availabilities.length,
    });

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
  console.log("getAvailabilities - Input:", {
    date: date.toISOString(),
    timezone,
    dayOfWeek: date.getDay(),
  });

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

  // Ensure UTC date
  const utcDate = new Date(date.toISOString());

  console.log("getAvailabilities - Time Processing:", {
    inputDate: date.toISOString(),
    utcDate: utcDate.toISOString(),
    timezone,
    region: process.env.VERCEL_REGION ?? "local",
  });

  return availabilities.map(({ startTime, endTime }) => {
    // Explicit UTC conversion for availability times
    const start = new Date(
      fromZonedTime(
        setMinutes(
          setHours(utcDate, parseInt(startTime.split(":")[0])),
          parseInt(startTime.split(":")[1]),
        ),
        timezone,
      ).toISOString(),
    );

    const end = new Date(
      fromZonedTime(
        setMinutes(
          setHours(utcDate, parseInt(endTime.split(":")[0])),
          parseInt(endTime.split(":")[1]),
        ),
        timezone,
      ).toISOString(),
    );

    console.log("getAvailabilities - Slot:", {
      originalStart: startTime,
      originalEnd: endTime,
      convertedStart: start.toISOString(),
      convertedEnd: end.toISOString(),
    });

    return { start, end };
  });
}
