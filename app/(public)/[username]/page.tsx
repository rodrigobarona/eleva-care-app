import { Button } from '@/components/atoms/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Skeleton } from '@/components/atoms/skeleton';
import { db } from '@/drizzle/db';
import { formatEventDescription } from '@/lib/formatters';
import { getValidTimesFromSchedule } from '@/lib/getValidTimesFromSchedule';
import NextAvailableTimeClient from '@/lib/NextAvailableTimeClient';
import GoogleCalendarService from '@/server/googleCalendar';
import { auth, createClerkClient } from '@clerk/nextjs/server';
import { addMonths } from 'date-fns';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import ReactMarkdown from 'react-markdown';

export const dynamic = 'force-dynamic';
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
      return { isConnected: false, error: 'Calendar not connected' };
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
    console.error('Calendar status check failed:', error);
    return { isConnected: false, error: 'Calendar access error' };
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
    const startDate = new Date(Math.ceil(now.getTime() / (15 * 60000)) * (15 * 60000));
    const endDate = addMonths(startDate, 2);

    // Get calendar events for the time range
    const calendarService = GoogleCalendarService.getInstance();
    const calendarEvents = await calendarService.getCalendarEventTimes(event.clerkUserId, {
      start: startDate,
      end: endDate,
    });

    // Generate all possible time slots
    const timeSlots = [];
    let currentTime = startDate;
    while (currentTime < endDate) {
      timeSlots.push(new Date(currentTime));
      currentTime = new Date(currentTime.getTime() + 15 * 60000); // Add 15 minutes
    }

    // Use the working method from the page
    const validTimes = await getValidTimesFromSchedule(timeSlots, event, calendarEvents);

    console.log('[getValidTimesForEvent] Valid times found:', {
      eventId,
      count: validTimes.length,
      firstTime: validTimes[0]?.toISOString(),
    });

    return validTimes;
  } catch (error) {
    console.error('[getValidTimesForEvent] Error:', {
      eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
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
    <Card className="overflow-hidden border-2 transition-colors duration-200 hover:border-primary/50">
      <div className="flex flex-col lg:flex-row">
        <EventCardDetails
          name={event.name}
          description={event.description}
          durationInMinutes={event.durationInMinutes}
        />
        <div className="flex flex-col justify-between bg-gray-50 p-6 lg:w-72 lg:border-l lg:p-8">
          <div>
            <div className="mb-1 text-lg font-semibold">Session</div>
            <div className="mb-4 text-3xl font-bold">
              {event.price === 0 ? (
                'Free'
              ) : (
                <>
                  €{' '}
                  {(event.price / 100).toLocaleString('pt-PT', {
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
            className="w-full bg-blue-600 py-6 text-lg font-semibold text-white hover:bg-blue-700"
            asChild
          >
            <Link href={`/${username}/${event.slug}`}>See times</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default async function BookingPage(props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  const { username } = params;

  // Get user data early and pass to children
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const users = await clerk.users.getUserList({
    username: [username],
  });

  const user = users.data[0];
  if (!user) return notFound();

  // Get current user session for comparison with profile owner
  const { userId: currentUserId } = await auth();
  const isProfileOwner = currentUserId === user.id;

  // Get profile data to check if it's published
  const profile = await db.query.ProfileTable.findFirst({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, user.id),
  });

  // If profile doesn't exist or isn't published, require user to be the profile owner
  if (!profile || !profile.published) {
    if (!isProfileOwner) {
      return notFound();
    }

    // Display preview mode banner for the profile owner
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 rounded-md bg-yellow-50 p-4 text-yellow-800">
          <div className="flex items-center">
            <svg
              className="mr-3 h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="font-medium">
              Preview Mode - Your profile is {profile ? 'not published' : 'incomplete'}. Only you
              can see this page.
            </p>
          </div>
          <div className="mt-3 flex justify-end">
            <Link href="/account">
              <Button variant="outline" size="sm">
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>

        <h1 className="mb-12 text-4xl font-bold">Book a session</h1>

        {/* Use Suspense to stream in the events section */}
        <Suspense fallback={<EventsLoadingSkeleton />}>
          <EventsListWithAccessControl
            userId={user.id}
            username={username}
            isProfileOwner={isProfileOwner}
          />
        </Suspense>
      </div>
    );
  }

  // Public view for published profiles
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-12 text-4xl font-bold">Book a session</h1>

      {/* Use Suspense to stream in the events section */}
      <Suspense fallback={<EventsLoadingSkeleton />}>
        <EventsListWithAccessControl
          userId={user.id}
          username={username}
          isProfileOwner={isProfileOwner}
        />
      </Suspense>
    </div>
  );
}

// Added wrapper component to handle access control for events
async function EventsListWithAccessControl({
  userId,
  username,
  isProfileOwner,
}: {
  userId: string;
  username: string;
  isProfileOwner: boolean;
}) {
  // Check calendar status
  const calendarStatus = await getCalendarStatus(userId);

  if (!calendarStatus.isConnected) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Calendar Access Required</CardTitle>
          <CardDescription>
            {calendarStatus.error === 'Calendar not connected'
              ? 'The calendar owner needs to connect their Google Calendar to show available times.'
              : 'Unable to access calendar. Please try again later.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  try {
    // Get events with different filtering based on whether user is the profile owner or not
    const eventsQuery = isProfileOwner
      ? // For profile owner: show all events regardless of active status
        db.query.EventTable.findMany({
          where: ({ clerkUserId: userIdCol }, { eq }) => eq(userIdCol, userId),
          orderBy: ({ order }, { asc }) => asc(order),
        })
      : // For public: show only active events
        db.query.EventTable.findMany({
          where: ({ clerkUserId: userIdCol, isActive }, { eq, and }) =>
            and(eq(userIdCol, userId), eq(isActive, true)),
          orderBy: ({ order }, { asc }) => asc(order),
        });

    const events = await eventsQuery;

    if (events.length === 0) {
      return (
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>No Events Available</CardTitle>
            <CardDescription>
              {isProfileOwner
                ? "You haven't created any bookable events yet."
                : "This expert doesn't have any bookable events at the moment."}
            </CardDescription>
          </CardHeader>
          {isProfileOwner && (
            <div className="px-6 pb-6">
              <Link href="/events/new">
                <Button>Create Your First Event</Button>
              </Link>
            </div>
          )}
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {events.map((event) => (
          <div key={event.id} className="relative">
            {/* Show status badge for inactive events (only to profile owner) */}
            {isProfileOwner && !event.isActive && (
              <div className="absolute -right-2 -top-2 z-10 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 shadow">
                Not Active
              </div>
            )}

            {/* Use Suspense for each event card to stream in availability data */}
            <Suspense fallback={<LoadingEventCard />}>
              <EventCardWithAvailability event={event} username={username} />
            </Suspense>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    console.error('[EventsList] Error:', error);
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>
            An error occurred while loading the booking page. Please try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
}

// 3. Create a component that handles fetching availability for a single event
async function EventCardWithAvailability({ event, username }: { event: Event; username: string }) {
  // Fetch availability data asynchronously
  const validTimes = await getValidTimesForEvent(event.id);
  const nextAvailable = validTimes.length > 0 ? validTimes[0] : null;

  return <EventCard event={event} username={username} nextAvailable={nextAvailable} />;
}

// 4. Add a loading skeleton for the entire events list
function EventsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <LoadingEventCard />
      <LoadingEventCard />
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
      <div className="mb-4 inline-block rounded-full bg-black px-3 py-1 text-sm font-medium text-white">
        Book a {durationInMinutes} minute video call
      </div>

      <h3 className="mb-2 text-2xl font-bold">{name}</h3>

      {description ? (
        <ReactMarkdown className="prose mb-4 text-base text-muted-foreground">
          {description}
        </ReactMarkdown>
      ) : (
        <p className="mb-4 text-base text-muted-foreground">No description available.</p>
      )}

      <div className="mb-1 flex items-center gap-2">
        <span className="font-semibold">Duration:</span>
        <span className="text-muted-foreground">{formatEventDescription(durationInMinutes)}</span>
      </div>

      <div className="mt-4 flex items-center gap-1 text-amber-400">
        {'★'.repeat(5)}
        <span className="ml-1 text-black">5.0</span>
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
          <div className="mb-4 inline-block h-7 w-32 rounded-full bg-gray-200" />
          <Skeleton className="mb-4 h-8 w-3/4" />
          <Skeleton className="mb-4 h-20 w-full" />
          <Skeleton className="mb-4 h-6 w-40" />
          <Skeleton className="h-6 w-32" />
        </div>

        <div className="flex flex-col justify-between bg-gray-50 p-6 lg:w-72 lg:border-l lg:p-8">
          <div>
            <Skeleton className="mb-2 h-6 w-20" />
            <Skeleton className="mb-4 h-10 w-24" />
            <Skeleton className="mb-6 h-5 w-40" />
          </div>
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </Card>
  );
}
