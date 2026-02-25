import NextAvailableTimeClient from '@/components/features/booking/NextAvailableTimeClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/drizzle/db';
import { OrganizationsTable, UserOrgMembershipsTable } from '@/drizzle/schema';
import { CalendarService } from '@/lib/integrations/calendar';
import { formatEventDescription } from '@/lib/utils/formatters';
import { logger } from '@/lib/utils/logger';
import { getValidTimesFromSchedule } from '@/lib/utils/server/scheduling';
import { addMonths } from 'date-fns';
import { eq } from 'drizzle-orm';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import ReactMarkdown from 'react-markdown';

type Event = {
  id: string;
  name: string;
  workosUserId: string;
  description: string | null;
  durationInMinutes: number;
  slug: string;
  isActive: boolean;
  price: number;
};

interface EventBookingListProps {
  userId: string;
  username: string;
}

async function getValidTimesForEvent(eventId: string) {
  try {
    const event = await db.query.EventsTable.findFirst({
      where: ({ id }, { eq }) => eq(id, eventId),
    });

    if (!event) return [];

    const now = new Date();

    // Fetch scheduling settings for the user
    let timeSlotInterval = 15; // Default fallback value
    try {
      const settings = await db.query.SchedulingSettingsTable.findFirst({
        where: ({ workosUserId }, { eq }) => eq(workosUserId, event.workosUserId),
      });

      if (settings?.timeSlotInterval) {
        timeSlotInterval = settings.timeSlotInterval;
      }
    } catch (error) {
      logger.error('Error fetching scheduling settings', {
        eventId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with the default value
    }

    // Calculate start time that's properly aligned with the time slot interval
    const startTime: Date = (() => {
      // Get minutes since the epoch
      const nowMinutes = Math.floor(now.getTime() / 60000);
      // Round up to the next interval
      const roundedMinutes = Math.ceil(nowMinutes / timeSlotInterval) * timeSlotInterval;
      // Convert back to milliseconds for a Date object
      return new Date(roundedMinutes * 60000);
    })();

    const endDate = addMonths(startTime, 2);

    // External calendar free/busy (additive -- returns [] if no calendar connected)
    const membership = await db.query.UserOrgMembershipsTable.findFirst({
      where: eq(UserOrgMembershipsTable.workosUserId, event.workosUserId),
      columns: { orgId: true },
    });
    const org = membership?.orgId
      ? await db.query.OrganizationsTable.findFirst({
          where: eq(OrganizationsTable.id, membership.orgId),
          columns: { workosOrgId: true },
        })
      : null;

    const calendarEvents = org?.workosOrgId
      ? await CalendarService.getAllFreeBusy(
          event.workosUserId,
          org.workosOrgId,
          startTime,
          endDate,
        )
      : [];

    const timeSlots = [];
    let currentTime = startTime;
    while (currentTime < endDate) {
      timeSlots.push(new Date(currentTime));
      currentTime = new Date(currentTime.getTime() + timeSlotInterval * 60000);
    }

    const validTimes = await getValidTimesFromSchedule(timeSlots, event, calendarEvents);
    return validTimes;
  } catch (error) {
    logger.error('Error fetching valid times for event', {
      eventId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

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
    <div className="grow bg-gray-50 p-6 lg:p-8">
      <div className="mb-4 inline-block rounded-full bg-black px-3 py-1 text-sm font-medium text-white">
        Book a {durationInMinutes} minute video call
      </div>

      <h3 className="mb-2 text-2xl font-bold">{name}</h3>

      {description ? (
        <details className="group mb-4">
          <summary className="cursor-pointer list-none">
            <div className="prose text-base text-muted-foreground group-open:line-clamp-none group-[:not([open])]:line-clamp-6">
              <ReactMarkdown>{description}</ReactMarkdown>
            </div>
            {description.split('\n').length > 6 && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 hover:text-blue-700">
                <span className="group-open:hidden">Read more</span>
                <span className="hidden group-open:inline">Show less</span>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
              </div>
            )}
          </summary>
        </details>
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
        <div className="grow p-6 lg:p-8">
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

async function EventsList({ userId, username }: { userId: string; username: string }) {
  logger.info('Loading events', { userId, username });
  const events = await db.query.EventsTable.findMany({
    where: ({ workosUserId: userIdCol, isActive }, { eq, and }) =>
      and(eq(userIdCol, userId), eq(isActive, true)),
    orderBy: ({ order }, { asc }) => asc(order),
  });

  logger.info('Events retrieved', { userId, eventCount: events.length });

  if (events.length === 0) {
    logger.info('No events found, returning 404', { userId });
    return notFound();
  }

  return (
    <div className="space-y-6">
      {events.map((event) => (
        <Suspense key={event.id} fallback={<LoadingEventCard />}>
          <EventCardWithAvailability event={event} username={username} />
        </Suspense>
      ))}
    </div>
  );
}

/**
 * Renders an event card with availability information.
 *
 * Gracefully degrades by showing the card without availability if fetching times fails.
 * This intentional error handling ensures a single event's availability error doesn't
 * break the entire event list, providing a better user experience.
 *
 * @param event - The event to display
 * @param username - The username of the event owner
 */
async function EventCardWithAvailability({ event, username }: { event: Event; username: string }) {
  logger.info('Loading availability for event', { eventId: event.id, eventName: event.name });

  // Handle availability load errors here for graceful degradation - continue with empty availability
  // so the UI can still render the event card. This prevents a single event's error from breaking the entire list.
  let validTimes: Date[] = [];
  try {
    validTimes = await getValidTimesForEvent(event.id);
    logger.info('Valid times retrieved', { eventId: event.id, timeCount: validTimes.length });
  } catch (error) {
    logger.error('Error loading availability for event', {
      eventId: event.id,
      eventName: event.name,
      error: error instanceof Error ? error.message : String(error),
    });
    // Continue with empty validTimes, will show card without availability
  }

  const nextAvailable = validTimes.length > 0 ? validTimes[0] : null;
  return <EventCard event={event} username={username} nextAvailable={nextAvailable} />;
}

export async function EventBookingList({ userId, username }: EventBookingListProps) {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-12 text-4xl font-bold">Book a session</h1>
      <Suspense fallback={<LoadingEventCard />}>
        <EventsList userId={userId} username={username} />
      </Suspense>
    </div>
  );
}
