import { DAYS_OF_WEEK_IN_ORDER } from "@/app/data/constants"; // Constants representing days of the week in order
import { db } from "@/drizzle/db"; // Database connection
import { ScheduleAvailabilityTable } from "@/drizzle/schema"; // Schema for schedule availability table
import { getCalendarEventTimes } from "@/server/googleCalendar"; // Function to retrieve calendar events for a user
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
} from "date-fns"; // Date utility functions for managing times and intervals
import { fromZonedTime } from "date-fns-tz"; // Utility for converting to zoned times

// Add this helper function at the top of the file
function groupBy<T>(
  array: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  return array.reduce(
    (groups, item) => {
      const key = keyFn(item);
      const group = groups[key] || [];
      group.push(item);
      return { ...groups, [key]: group };
    },
    {} as Record<string, T[]>
  );
}

interface EventType {
  id: string;
  clerkUserId: string;
  durationInMinutes: number;
  // add other event properties you need
}

// Main function to retrieve valid booking times based on schedule and availability
export async function getValidTimesFromSchedule(
  possibleTimes: Date[],
  event: EventType,
) {
  console.log('Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('First possible time:', possibleTimes[0]);
  console.log('Last possible time:', possibleTimes[possibleTimes.length - 1]);
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // Determine the start and end of the time range we're checking for availability
  const start = possibleTimes[0];
  const end = possibleTimes.at(-1);

  if (start == null || end == null) return []; // If no start or end, return an empty list

  // Fetch the user's schedule and associated availabilities from the database
  const schedule = await db.query.ScheduleTable.findFirst({
    where: ({ clerkUserId: userIdCol }, { eq }) =>
      eq(userIdCol, event.clerkUserId),
    with: { availabilities: true },
  });

  if (schedule == null) return []; // If no schedule found, return an empty list

  // Group availabilities by day of the week for easy access
  const groupedAvailabilities = groupBy(
    schedule.availabilities,
    (a) => a.dayOfWeek
  );

  // Get existing calendar events for the user within the specified date range
  const eventTimes = await getCalendarEventTimes(event.clerkUserId, {
    start,
    end,
  });

  // Filter the times to include only those that fit within availability and don’t overlap events
  return possibleTimes.filter((intervalDate) => {
    // Get the availabilities for the specific date
    const availabilities = getAvailabilities(
      groupedAvailabilities,
      intervalDate,
      schedule.timezone
    );

    // Define the time interval for the current event
    const eventInterval = {
      start: intervalDate,
      end: addMinutes(intervalDate, event.durationInMinutes),
    };

    // Return true only if no events overlap and the interval fits within availability
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

// Helper function to retrieve availabilities for a specific date
function getAvailabilities(
  groupedAvailabilities: Partial<
    Record<
      (typeof DAYS_OF_WEEK_IN_ORDER)[number],
      (typeof ScheduleAvailabilityTable.$inferSelect)[]
    >
  >,
  date: Date, // The specific date we're checking availability for
  timezone: string // User's timezone for adjusting times
) {
  let availabilities:
    | (typeof ScheduleAvailabilityTable.$inferSelect)[]
    | undefined;

  // Check the day of the week and assign the relevant availabilities
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

  // If no availabilities are set for this day, return an empty list
  if (availabilities == null) return [];

  // Map availability times to intervals with adjusted time zones
  return availabilities.map(({ startTime, endTime }) => {
    // Set the start time by adjusting the hours and minutes from availability to the given date
    const start = fromZonedTime(
      setMinutes(
        setHours(date, parseInt(startTime.split(":")[0])),
        parseInt(startTime.split(":")[1])
      ),
      timezone
    );

    // Set the end time similarly
    const end = fromZonedTime(
      setMinutes(
        setHours(date, parseInt(endTime.split(":")[0])),
        parseInt(endTime.split(":")[1])
      ),
      timezone
    );

    // Return the start and end as a time interval object
    return { start, end };
  });
}
