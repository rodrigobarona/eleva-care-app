import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/drizzle/db";
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule";
import { clerkClient } from "@clerk/nextjs/server";
import {
  addMonths,
  eachMinuteOfInterval,
  endOfDay,
  roundToNearestMinutes,
} from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MeetingForm } from "@/components/forms/MeetingForm";

// Disable page caching to always fetch fresh data
export const revalidate = 0;

// Main page component for booking an event with a specific user
export default async function BookEventPage({
  params: { clerkUserId, eventId },
}: {
  params: { clerkUserId: string; eventId: string };
}) {
  // Fetch the event from the database, ensuring it's active and matches both user and event IDs
  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId: userIdCol, isActive, id }, { eq, and }) =>
      and(eq(isActive, true), eq(userIdCol, clerkUserId), eq(id, eventId)),
  });

  // If event doesn't exist, show 404 page
  if (event == null) return notFound();

  // Fetch the calendar owner's user details from Clerk
  const calendarUser = await clerkClient().users.getUser(clerkUserId);

  // Calculate the booking time range
  const startDate = roundToNearestMinutes(new Date(), {
    nearestTo: 15,
    roundingMethod: "ceil",
  });

  const endDate = endOfDay(addMonths(startDate, 2));

  console.log('Debug: Calculating time range', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const timeSlots = eachMinuteOfInterval(
    { start: startDate, end: endDate },
    { step: 15 }
  );

  console.log('Debug: Generated time slots', {
    totalSlots: timeSlots.length,
    firstSlot: timeSlots[0]?.toISOString(),
    lastSlot: timeSlots[timeSlots.length - 1]?.toISOString(),
  });

  const validTimes = await getValidTimesFromSchedule(timeSlots, event);

  // If no time slots are available, show the NoTimeSlots component
  if (validTimes.length === 0) {
    return <NoTimeSlots event={event} calendarUser={calendarUser} />;
  }

  // Render the booking form if time slots are available
  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          Book {event.name} with {calendarUser.fullName}
        </CardTitle>
        {/* Show event description if it exists */}
        {event.description && (
          <CardDescription>{event.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <MeetingForm
          validTimes={validTimes}
          eventId={event.id}
          clerkUserId={clerkUserId}
        />
      </CardContent>
    </Card>
  );
}

// Component shown when no time slots are available
function NoTimeSlots({
  event,
  calendarUser,
}: {
  event: { name: string; description: string | null };
  calendarUser: { id: string; fullName: string | null };
}) {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          Book {event.name} with {calendarUser.fullName}
        </CardTitle>
        {/* Show event description if it exists */}
        {event.description && (
          <CardDescription>{event.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {calendarUser.fullName} is currently booked up. Please check back later
        or choose a shorter event.
      </CardContent>
      <CardFooter>
        {/* Button to return to event selection page */}
        <Button asChild>
          <Link href={`/book/${calendarUser.id}`}>Choose Another Event</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
