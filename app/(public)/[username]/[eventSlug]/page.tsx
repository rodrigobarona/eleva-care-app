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
import GoogleCalendarService from '@/server/googleCalendar';
import { createClerkClient } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';
import { addMonths, eachMinuteOfInterval, endOfDay, roundToNearestMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Clock as ClockIcon, WalletCards as WalletCardsIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import ReactMarkdown from 'react-markdown';

export const revalidate = 0;

type PageProps = {
  params: Promise<{ username: string; eventSlug: string }>;
};

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
  const params = await props.params;
  const { username, eventSlug } = params;

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
    <Card className="mx-auto max-w-4xl border-none p-0 shadow-none sm:rounded-none">
      <CardHeader className="gap-4 p-4 sm:p-0">
        <div>
          <CardTitle className="text-xl font-bold sm:text-2xl">
            Book a video call: {event.name}
          </CardTitle>
          {event.description && (
            <div className="prose mt-2 text-sm text-muted-foreground">
              <ReactMarkdown>{event.description}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-y py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            <span>{event.durationInMinutes} minutes</span>
          </div>
          {event.price > 0 && (
            <div className="flex items-center gap-2">
              <WalletCardsIcon className="h-4 w-4" />
              <span>€{(event.price / 100).toFixed(2)}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-0 sm:pt-8">
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
          />
        </Suspense>
      </CardContent>
    </Card>
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
}: {
  userId: string;
  eventId: string;
  username: string;
  eventSlug: string;
  price: number;
  event: EventType;
  calendarUser: User;
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
    return <NoTimeSlots event={event} calendarUser={calendarUser} />;
  }

  return (
    <MeetingForm
      validTimes={validTimes}
      eventId={eventId}
      clerkUserId={userId}
      price={price}
      username={username}
      eventSlug={eventSlug}
    />
  );
}

// Add a loading skeleton for the calendar
function CalendarLoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Calendar month grid skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <div className="grid grid-cols-7 gap-2">
          {Array(35)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={`calendar-day-${i}`} className="h-14 w-full rounded-md" />
            ))}
        </div>
      </div>

      {/* Time slots skeleton */}
      <div className="mt-6 space-y-2">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array(8)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={`time-slot-${i}`} className="h-10 w-full rounded-md" />
            ))}
        </div>
      </div>
    </div>
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
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>
          Book {event.name} with {calendarUser.fullName}
        </CardTitle>
        {event.description && (
          <CardDescription>
            <ReactMarkdown>{event.description}</ReactMarkdown>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <p>No available time slots were found in the next 2 months.</p>
        <p className="mt-2 text-muted-foreground">
          The expert may be fully booked or hasn&apos;t set their availability yet.
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href={`/${calendarUser.id}`}>Choose Another Event</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
