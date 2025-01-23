import React from "react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { db } from "@/drizzle/db";
import { formatEventDescription } from "@/lib/formatters";
import { createClerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule";
import { addMonths } from "date-fns";
import { eachMinuteOfInterval } from "date-fns";
import { Suspense } from "react";
import { Skeleton } from "@/components/atoms/skeleton";
import { formatInTimeZone } from "date-fns-tz";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Event = {
  id: string;
  name: string;
  clerkUserId: string;
  description: string | null;
  durationInMinutes: number;
  slug: string;
  isActive: boolean;
  price: number;
};

export default async function BookingPage({
  params: { username },
}: {
  params: { username: string };
}) {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const users = await clerk.users.getUserList({
    username: [username],
  });

  const user = users.data[0];
  if (!user) return notFound();

  const events = await db.query.EventTable.findMany({
    where: ({ clerkUserId: userIdCol, isActive }, { eq, and }) =>
      and(eq(userIdCol, user.id), eq(isActive, true)),
    orderBy: ({ order }, { asc }) => asc(order),
  });

  if (events.length === 0) return notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-12">Book a session</h1>
      <div className="space-y-6">
        {events.map((event) => (
          <Suspense key={event.id} fallback={<LoadingEventCard />}>
            <EventCardWrapper event={event} username={username} />
          </Suspense>
        ))}
      </div>
    </div>
  );
}

async function EventCardWrapper({
  event,
  username,
}: {
  event: Event;
  username: string;
}) {
  return (
    <Card className="overflow-hidden border-2 hover:border-primary/50 transition-colors duration-200">
      <div className="flex flex-col lg:flex-row">
        <EventCardDetails
          name={event.name}
          description={event.description}
          durationInMinutes={event.durationInMinutes}
        />
        <div className="p-6 lg:p-8 lg:w-72 lg:border-l flex flex-col justify-between bg-gray-50">
          <div>
            <div className="text-lg font-semibold mb-1">Session</div>
            <div className="text-3xl font-bold mb-4">
              {event.price === 0 ? (
                "Free"
              ) : (
                <>
                  €{" "}
                  {(event.price / 100).toLocaleString("pt-PT", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </>
              )}
            </div>
            <Suspense fallback={<Skeleton className="h-5 w-40 mb-6" />}>
              <NextAvailableTimeServer eventId={event.id} />
            </Suspense>
          </div>

          <Button
            className="w-full py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            asChild
          >
            <Link href={`/${username}/${event.slug}`}>See times</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

// New server component for next available time
async function NextAvailableTimeServer({ eventId }: { eventId: string }) {
  const validTimes = await getValidTimesForEvent(eventId);
  // Just pass the raw date to the client component
  const nextAvailable = validTimes.length > 0 ? validTimes[0] : null;
  return <NextAvailableTimeClient date={nextAvailable} />;
}

// Client component to handle timezone formatting

function NextAvailableTimeClient({ date }: { date: Date | null }) {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatNextAvailable = (date: Date) => {
    const timeFormat = "h:mm a";
    const now = new Date();

    const isToday = (date: Date) => {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    };

    const isTomorrow = (date: Date) => {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return (
        date.getFullYear() === tomorrow.getFullYear() &&
        date.getMonth() === tomorrow.getMonth() &&
        date.getDate() === tomorrow.getDate()
      );
    };

    const formattedTime = formatInTimeZone(date, userTimeZone, timeFormat);
    // Use 'z' instead of 'zzz' for timezone abbreviation
    const timezoneName = formatInTimeZone(date, userTimeZone, "z");

    if (isToday(date)) {
      return `Today at ${formattedTime} ${timezoneName}`;
    }
    if (isTomorrow(date)) {
      return `Tomorrow at ${formattedTime} ${timezoneName}`;
    }
    return formatInTimeZone(
      date,
      userTimeZone,
      `EEE, ${timeFormat} ${timezoneName}`
    );
  };

  return (
    <div className="text-sm text-muted-foreground mb-6">
      {date
        ? `Next available — ${formatNextAvailable(date)}`
        : "No times available"}
    </div>
  );
}

// Separate component for the main card details
function EventCardDetails({
  name,
  description,
  durationInMinutes,
}: {
  name: string;
  description: string | null;
  durationInMinutes: number;
}) {
  return (
    <div className="flex-grow p-6 lg:p-8">
      <div className="inline-block px-3 py-1 mb-4 text-sm font-medium bg-black text-white rounded-full">
        Book a {durationInMinutes} minute video call
      </div>

      <h3 className="text-2xl font-bold mb-2">{name}</h3>

      {description ? (
        <ReactMarkdown className="prose text-muted-foreground mb-4 text-base">
          {description}
        </ReactMarkdown>
      ) : (
        <p className="text-muted-foreground mb-4 text-base">
          No description available.
        </p>
      )}

      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold">Duration:</span>
        <span className="text-muted-foreground">
          {formatEventDescription(durationInMinutes)}
        </span>
      </div>

      <div className="flex items-center gap-1 text-amber-400 mt-4">
        {"★".repeat(5)}
        <span className="text-black ml-1">5.0</span>
        <span className="text-muted-foreground">(10)</span>
      </div>
    </div>
  );
}

async function getValidTimesForEvent(eventId: string) {
  const event = await db.query.EventTable.findFirst({
    where: ({ id }, { eq }) => eq(id, eventId),
  });

  if (!event) return [];

  const now = new Date();
  // Round up to the next 15 minutes
  const startDate = new Date(
    Math.ceil(now.getTime() / (15 * 60000)) * (15 * 60000)
  );
  const endDate = addMonths(startDate, 2);

  return getValidTimesFromSchedule(
    eachMinuteOfInterval({ start: startDate, end: endDate }, { step: 15 }),
    event
  );
}

function LoadingEventCard() {
  return (
    <Card className="overflow-hidden border-2">
      <div className="flex flex-col lg:flex-row">
        <div className="flex-grow p-6 lg:p-8">
          <div className="inline-block w-32 h-7 bg-gray-200 rounded-full mb-4" />
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-20 w-full mb-4" />
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-6 w-32" />
        </div>

        <div className="p-6 lg:p-8 lg:w-72 lg:border-l flex flex-col justify-between bg-gray-50">
          <div>
            <Skeleton className="h-6 w-20 mb-2" />
            <Skeleton className="h-10 w-24 mb-4" />
            <Skeleton className="h-5 w-40 mb-6" />
          </div>
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </Card>
  );
}
