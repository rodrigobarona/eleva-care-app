import { DateTime, Interval } from "luxon";
import { DAYS_OF_WEEK_IN_ORDER } from "@/app/data/constants";
import { db } from "@/drizzle/db";
import { ScheduleAvailabilityTable } from "@/drizzle/schema";
import { getCalendarEventTimes } from "@/server/googleCalendar";

export async function getValidTimesFromSchedule(
  timesInOrder: Date[],
  event: { clerkUserId: string; durationInMinutes: number },
) {
  console.log("getValidTimes - Input:", {
    firstTime: timesInOrder[0]?.toISOString(),
    lastTime: timesInOrder.at(-1)?.toISOString(),
  });

  const start = timesInOrder[0];
  const end = timesInOrder.at(-1);

  if (start == null || end == null) return [];

  const schedule = await db.query.ScheduleTable.findFirst({
    where: ({ clerkUserId: userIdCol }, { eq }) =>
      eq(userIdCol, event.clerkUserId),
    with: { availabilities: true },
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

  return timesInOrder.filter((intervalDate) => {
    const dateTime = DateTime.fromJSDate(intervalDate);

    const availabilities = getAvailabilities(
      groupedAvailabilities,
      dateTime,
      schedule.timezone,
    );

    const eventInterval = Interval.fromDateTimes(
      dateTime,
      dateTime.plus({ minutes: event.durationInMinutes }),
    );

    if (!eventInterval.isValid) {
      console.log("getValidTimes - Invalid Interval:", {
        date: dateTime.toISO(),
        error: eventInterval.invalidReason,
      });
      return false;
    }

    console.log("getValidTimes - Checking Interval:", {
      date: dateTime.toISO(),
      timezone: schedule.timezone,
      availabilitiesCount: availabilities.length,
      eventInterval: {
        start: eventInterval.start?.toISO() ?? "invalid",
        end: eventInterval.end?.toISO() ?? "invalid",
        isValid: eventInterval.isValid,
      },
    });

    return (
      eventTimes.every((eventTime) => {
        const existingEventInterval = Interval.fromDateTimes(
          DateTime.fromJSDate(eventTime.start),
          DateTime.fromJSDate(eventTime.end),
        );

        if (!existingEventInterval.isValid) return true;

        return !eventInterval.overlaps(existingEventInterval);
      }) &&
      availabilities.some((availability) => {
        if (!availability.isValid) return false;
        return (
          availability.contains(eventInterval.start) &&
          availability.contains(eventInterval.end)
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
  date: DateTime,
  timezone: string,
) {
  let availabilities:
    | (typeof ScheduleAvailabilityTable.$inferSelect)[]
    | undefined;

  // Get day of week using Luxon
  const dayOfWeek = date.setZone(timezone).weekday;

  // Map Luxon's 1-7 to our day names
  switch (dayOfWeek) {
    case 1:
      availabilities = groupedAvailabilities.monday;
      break;
    case 2:
      availabilities = groupedAvailabilities.tuesday;
      break;
    case 3:
      availabilities = groupedAvailabilities.wednesday;
      break;
    case 4:
      availabilities = groupedAvailabilities.thursday;
      break;
    case 5:
      availabilities = groupedAvailabilities.friday;
      break;
    case 6:
      availabilities = groupedAvailabilities.saturday;
      break;
    case 7:
      availabilities = groupedAvailabilities.sunday;
      break;
  }

  if (availabilities == null) return [];

  return availabilities.map(({ startTime, endTime }) => {
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const start = date
      .setZone(timezone)
      .set({ hour: startHour, minute: startMinute });

    const end = date
      .setZone(timezone)
      .set({ hour: endHour, minute: endMinute });

    const interval = Interval.fromDateTimes(start, end);

    console.log("getAvailabilities - Slot:", {
      originalStart: startTime,
      originalEnd: endTime,
      convertedStart: start.toISO(),
      convertedEnd: end.toISO(),
      timezone,
      isValid: interval.isValid,
    });

    return interval;
  });
}
