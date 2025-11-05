import { EventsList } from '@/components/features/booking/EventsList';
import { db } from '@/drizzle/db';
import { EventsTable, UserOrgMembershipsTable } from '@/drizzle/schema-workos';
import { markStepComplete } from '@/server/actions/expert-setup-workos';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';

// Note: Route is dynamic by default with cacheComponents enabled in Next.js 16

/**
 * Events List Page - AuthKit Implementation
 *
 * Lists all events for the authenticated expert.
 * Automatically marks the 'events' setup step as complete when an active event exists.
 * Uses organization slug as username for booking URLs.
 */
export default async function EventsPage() {
  // Require authentication - auto-redirects if not logged in
  const { user } = await withAuth({ ensureSignedIn: true });

  // Parallel fetch user's organization and events
  const [membership, events] = await Promise.all([
    db.query.UserOrgMembershipsTable.findFirst({
      where: eq(UserOrgMembershipsTable.workosUserId, user.id),
      with: {
        organization: {
          columns: {
            slug: true,
          },
        },
      },
    }),
    db.query.EventsTable.findMany({
      where: eq(EventsTable.workosUserId, user.id),
      orderBy: (events, { asc }) => [asc(events.order)],
    }),
  ]);

  // Use organization slug as username (org-per-user model)
  const username = membership?.organization?.slug || user.id;

  // Check if the expert has at least one published event
  if (events.some((event) => event.isActive)) {
    // Mark events step as complete (non-blocking)
    try {
      await markStepComplete('events');
    } catch (error) {
      console.error('Failed to mark events step as complete:', error);
    }
  }

  return <EventsList initialEvents={events} username={username} />;
}
