import React from "react";
import ReactMarkdown from "react-markdown";
import { MeetingForm } from "@/components/organisms/forms/MeetingForm";
import { Button } from "@/components/atoms/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { db } from "@/drizzle/db";
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule";
import { createClerkClient } from "@clerk/nextjs/server";
import {
  addMonths,
  eachMinuteOfInterval,
  endOfDay,
  roundToNearestMinutes,
} from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";

export const revalidate = 0;

export default async function BookEventPage({
  params: { username, eventSlug },
}: {
  params: { username: string; eventSlug: string };
}) {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const users = await clerk.users.getUserList({
    username: [username],
  });
  const user = users.data[0];
  if (!user) return notFound();

  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId: userIdCol, isActive, slug }, { eq, and }) =>
      and(eq(isActive, true), eq(userIdCol, user.id), eq(slug, eventSlug)),
  });

  if (event == null) return notFound();

  const calendarUser = await clerk.users.getUser(user.id);
  const startDate = new Date(
    formatInTimeZone(
      roundToNearestMinutes(new Date(), {
        nearestTo: 15,
        roundingMethod: "ceil",
      }),
      "UTC",
      "yyyy-MM-dd'T'HH:mm:ssX"
    )
  );

  const endDate = new Date(
    formatInTimeZone(
      endOfDay(addMonths(startDate, 2)),
      "UTC",
      "yyyy-MM-dd'T'HH:mm:ssX"
    )
  );

  const validTimes = await getValidTimesFromSchedule(
    eachMinuteOfInterval({ start: startDate, end: endDate }, { step: 15 }),
    event
  );

  if (validTimes.length === 0) {
    return <NoTimeSlots event={event} calendarUser={calendarUser} />;
  }

  return (
    <Card className="max-w-4xl mx-auto shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="bg-gray-100 p-6">
        <CardTitle className="text-2xl font-semibold text-gray-800">
          Book {event.name} with {calendarUser.fullName}
        </CardTitle>
        {event.description && (
          <CardDescription>
            <div className="text-gray-600 prose prose-sm">
              <ReactMarkdown>{event.description}</ReactMarkdown>
            </div>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <MeetingForm
          validTimes={validTimes}
          eventId={event.id}
          clerkUserId={user.id}
          username={username}
        />
      </CardContent>
      <CardFooter className="bg-gray-100 p-4">
        {/* Optional footer content */}
      </CardFooter>
    </Card>
  );
}

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
        {event.description && (
          <CardDescription>
            <div className="prose prose-sm">
              <ReactMarkdown>{event.description}</ReactMarkdown>
            </div>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {calendarUser.fullName} is currently booked up. Please check back later
        or choose a shorter event.
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href={`/${calendarUser.id}`}>Choose Another Event</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
