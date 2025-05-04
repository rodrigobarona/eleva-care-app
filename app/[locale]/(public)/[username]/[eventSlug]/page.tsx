import { Button } from '@/components/atoms/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/atoms/card';
import { Skeleton } from '@/components/atoms/skeleton';
import { MeetingForm } from '@/components/organisms/forms/MeetingForm';
import { db } from '@/drizzle/db';
import { getValidTimesFromSchedule } from '@/lib/getValidTimesFromSchedule';
import { Link } from '@/lib/i18n/navigation';
import GoogleCalendarService from '@/server/googleCalendar';
import { createClerkClient } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';
import { addMonths, eachMinuteOfInterval, endOfDay, roundToNearestMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

export const revalidate = 0;

// Updated PageProps type with proper next params - both params and searchParams as Promises
interface PageProps {
  params: Promise<{
    username: string;
    eventSlug: string;
    locale: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Define EventType to avoid conflict with DOM Event
interface EventType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationInMinutes: number;
  clerkUserId: string;
  isActive: boolean;
  order: number;
  price: number;
  currency: string;
  stripeProductId: string | null;
  stripePriceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default async function BookEventPage(props: PageProps) {
  const { username, eventSlug, locale } = await props.params;

  // Fetch basic user/event data first
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

  return (
    <div className="mx-auto mt-10 flex max-w-5xl flex-col items-center justify-center p-4 md:mt-0 md:h-dvh md:p-6">
      <CardContent className="p-0 pt-8">
        {/* Use Suspense to wrap the availability-dependent component */}
        <Suspense fallback={<CalendarLoadingSkeleton />}>
          <CalendarWithAvailability
            userId={user.id}
            eventId={event.id}
            username={username}
            eventSlug={eventSlug}
            price={event.price}
            event={event}
            calendarUser={calendarUser}
            locale={locale}
          />
        </Suspense>
      </CardContent>
    </div>
  );
}

// New component to handle availability data fetching
async function CalendarWithAvailability({
  userId,
  eventId,
  username,
  eventSlug,
  price,
  event,
  calendarUser,
  locale,
}: {
  userId: string;
  eventId: string;
  username: string;
  eventSlug: string;
  price: number;
  event: EventType;
  calendarUser: User;
  locale: string;
}) {
  const calendarService = GoogleCalendarService.getInstance();

  // Verify calendar access before fetching times
  const hasValidTokens = await calendarService.hasValidTokens(userId);
  if (!hasValidTokens) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Calendar Access Required</CardTitle>
          <CardDescription>
            The calendar owner needs to reconnect their Google Calendar to show available times.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const startDate = new Date(
    formatInTimeZone(
      roundToNearestMinutes(new Date(), {
        nearestTo: 15,
        roundingMethod: 'ceil',
      }),
      'UTC',
      "yyyy-MM-dd'T'HH:mm:ssX",
    ),
  );

  const endDate = new Date(
    formatInTimeZone(endOfDay(addMonths(startDate, 2)), 'UTC', "yyyy-MM-dd'T'HH:mm:ssX"),
  );

  // Get calendar events and calculate valid times
  const calendarEvents = await calendarService.getCalendarEventTimes(userId, {
    start: startDate,
    end: endDate,
  });

  const validTimes = await getValidTimesFromSchedule(
    eachMinuteOfInterval({ start: startDate, end: endDate }, { step: 15 }),
    event,
    calendarEvents,
  );

  if (validTimes.length === 0) {
    return <NoTimeSlots calendarUser={calendarUser} username={username} _locale={locale} />;
  }

  // Enhanced MeetingForm with better metadata
  return (
    <MeetingForm
      validTimes={validTimes}
      eventId={eventId}
      clerkUserId={userId}
      price={price}
      username={username}
      eventSlug={eventSlug}
      expertName={
        calendarUser.firstName
          ? `${calendarUser.firstName} ${calendarUser.lastName || ''}`.trim()
          : calendarUser.fullName || 'Expert'
      }
      expertImageUrl={calendarUser.imageUrl || '/placeholder-avatar.jpg'}
      eventTitle={event.name}
      eventDescription={event.description || 'Book a consultation session'}
      eventDuration={event.durationInMinutes}
      eventLocation="Google Meet"
      locale={locale}
    />
  );
}

// Add a loading skeleton for the calendar
function CalendarLoadingSkeleton() {
  // Generate non-index based keys for calendar days
  const generateCalendarDayKeys = () => {
    return Array.from({ length: 35 }).map(
      (_, i) => `cal-day-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
    );
  };

  // Generate non-index based keys for time slots
  const generateTimeSlotKeys = () => {
    return Array.from({ length: 6 }).map(
      (_, i) => `time-slot-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
    );
  };

  const calendarDayKeys = generateCalendarDayKeys();
  const timeSlotKeys = generateTimeSlotKeys();

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[300px,1fr,300px]">
      {/* Expert profile skeleton */}
      <div className="flex flex-col space-y-4 rounded-lg border p-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-1 h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Calendar skeleton */}
      <div className="rounded-lg border p-6">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-60" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={calendarDayKeys[i]} className="h-14 w-full rounded-md" />
          ))}
        </div>
      </div>

      {/* Time slots skeleton */}
      <div className="rounded-lg border p-6">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={timeSlotKeys[i]} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

function NoTimeSlots({
  calendarUser,
  username,
  _locale,
}: {
  calendarUser: { id: string; fullName: string | null };
  username: string;
  _locale: string;
}) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>No Available Time Slots</CardTitle>
        <CardDescription>
          {calendarUser.fullName || 'This expert'} doesn&apos;t have any available time slots in the
          next two months.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        <p>This could be because:</p>
        <ul className="ml-6 mt-2 list-disc">
          <li>Their calendar is fully booked</li>
          <li>They haven&apos;t set up their availability yet</li>
          <li>They&apos;re temporarily unavailable</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Link
          href={{
            pathname: '/[username]',
            params: { username },
          }}
        >
          <Button variant="secondary">View Profile</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
