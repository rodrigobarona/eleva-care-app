import React from "react";
import { Button } from "@/components/atoms/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/atoms/card";
import { db } from "@/drizzle/db";
import { formatEventDescription } from "@/lib/formatters";
import { createClerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule";
import { addMonths } from "date-fns";
import { Suspense } from "react";
import { Skeleton } from "@/components/atoms/skeleton";
import NextAvailableTimeClient from "@/lib/NextAvailableTimeClient";
import GoogleCalendarService from "@/server/googleCalendar";

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

async function getCalendarStatus(clerkUserId: string) {
  try {
    const calendarService = GoogleCalendarService.getInstance();
    const hasValidTokens = await calendarService.hasValidTokens(clerkUserId);

    if (!hasValidTokens) {
      return { isConnected: false, error: "Calendar not connected" };
    }

    // Verify we can actually access the calendar
    const now = new Date();
    const endDate = addMonths(now, 1);
    await calendarService.getCalendarEventTimes(clerkUserId, {
      start: now,
      end: endDate,
    });

    return { isConnected: true, error: null };
  } catch (error) {
    console.error("Calendar status check failed:", error);
    return { isConnected: false, error: "Calendar access error" };
  }
}

async function getValidTimesForEvent(eventId: string) {
  try {
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

    // Get calendar events for the time range
    const calendarService = GoogleCalendarService.getInstance();
    const calendarEvents = await calendarService.getCalendarEventTimes(
      event.clerkUserId,
      { start: startDate, end: endDate }
    );

    // Generate all possible time slots
    const timeSlots = [];
    let currentTime = startDate;
    while (currentTime < endDate) {
      timeSlots.push(new Date(currentTime));
      currentTime = new Date(currentTime.getTime() + 15 * 60000); // Add 15 minutes
    }

    // Use the working method from the page
    const validTimes = await getValidTimesFromSchedule(
      timeSlots,
      event,
      calendarEvents
    );

    console.log("[getValidTimesForEvent] Valid times found:", {
      eventId,
      count: validTimes.length,
      firstTime: validTimes[0]?.toISOString(),
    });

    return validTimes;
  } catch (error) {
    console.error("[getValidTimesForEvent] Error:", {
      eventId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

// Separate component for the event card
function EventCard({
  event,
  username,
  nextAvailable,
}: {
  event: Event;
  username: string;
  nextAvailable: Date | null;
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
            <NextAvailableTimeClient
              date={nextAvailable}
              eventName={event.name}
              eventSlug={event.slug}
              username={username}
            />
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

export default async function BookingPage({
  params: { username },
}: {
  params: { username: string };
}) {
  try {
    console.log("[BookingPage] Starting to load page for username:", username);
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const users = await clerk.users.getUserList({
      username: [username],
    });

    const user = users.data[0];
    if (!user) return notFound();

    console.log("[BookingPage] Found user:", user.id);

    // Check calendar status early
    const calendarStatus = await getCalendarStatus(user.id);
    console.log("[BookingPage] Calendar status:", calendarStatus);

    if (!calendarStatus.isConnected) {
      return (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Calendar Access Required</CardTitle>
            <CardDescription>
              {calendarStatus.error === "Calendar not connected"
                ? "The calendar owner needs to connect their Google Calendar to show available times."
                : "Unable to access calendar. Please try again later."}
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    const events = await db.query.EventTable.findMany({
      where: ({ clerkUserId: userIdCol, isActive }, { eq, and }) =>
        and(eq(userIdCol, user.id), eq(isActive, true)),
      orderBy: ({ order }, { asc }) => asc(order),
    });

    if (events.length === 0) return notFound();

    console.log("[BookingPage] Found events:", events.length);

    // Pre-fetch all valid times for each event
    const eventTimes = await Promise.all(
      events.map(async (event) => {
        console.log("[BookingPage] Getting times for event:", event.id);
        const validTimes = await getValidTimesForEvent(event.id);
        return {
          event,
          nextAvailable: validTimes.length > 0 ? validTimes[0] : null,
        };
      })
    );

    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-12">Book a session</h1>
        <div className="space-y-6">
          {eventTimes.map(({ event, nextAvailable }) => (
            <Suspense key={event.id} fallback={<LoadingEventCard />}>
              <EventCard
                event={event}
                username={username}
                nextAvailable={nextAvailable}
              />
            </Suspense>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error("[BookingPage] Error:", error);
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>
            An error occurred while loading the booking page. Please try again
            later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
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
