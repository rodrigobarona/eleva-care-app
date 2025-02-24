import { Button } from '@/components/atoms/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/atoms/card';
import { MeetingForm } from '@/components/organisms/forms/MeetingForm';
import { db } from '@/drizzle/db';
import { getValidTimesFromSchedule } from '@/lib/getValidTimesFromSchedule';
import GoogleCalendarService from '@/server/googleCalendar';
import { createClerkClient } from '@clerk/nextjs/server';
import { addMonths, eachMinuteOfInterval, endOfDay, roundToNearestMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Clock as ClockIcon, WalletCards as WalletCardsIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

export const revalidate = 0;

type PageProps = {
  params: Promise<{ username: string; eventSlug: string }>;
};

export default async function BookEventPage(props: PageProps) {
  const params = await props.params;

  const { username, eventSlug } = params;

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
        roundingMethod: 'ceil',
      }),
      'UTC',
      "yyyy-MM-dd'T'HH:mm:ssX",
    ),
  );

  const endDate = new Date(
    formatInTimeZone(endOfDay(addMonths(startDate, 2)), 'UTC', "yyyy-MM-dd'T'HH:mm:ssX"),
  );

  const calendarService = GoogleCalendarService.getInstance();

  // Verify calendar access before fetching times
  const hasValidTokens = await calendarService.hasValidTokens(user.id);
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

  // Get calendar events and calculate valid times
  const calendarEvents = await calendarService.getCalendarEventTimes(user.id, {
    start: startDate,
    end: endDate,
  });

  const validTimes = await getValidTimesFromSchedule(
    eachMinuteOfInterval({ start: startDate, end: endDate }, { step: 15 }),
    event,
    calendarEvents, // Pass calendar events to consider when calculating valid times
  );

  if (validTimes.length === 0) {
    return <NoTimeSlots event={event} calendarUser={calendarUser} />;
  }

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
        <MeetingForm
          validTimes={validTimes}
          eventId={event.id}
          clerkUserId={user.id}
          price={event.price}
          username={username}
          eventSlug={eventSlug}
        />
      </CardContent>
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
        {calendarUser.fullName} is currently booked up. Please check back later or choose a shorter
        event.
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href={`/${calendarUser.id}`}>Choose Another Event</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
