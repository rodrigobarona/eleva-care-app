import { EventsList } from '@/components/organisms/EventsList';
import { db } from '@/drizzle/db';
import { markStepComplete } from '@/server/actions/expert-setup';
import { auth, createClerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function EventsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/unauthorized');
  }

  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const user = await clerk.users.getUser(userId);
  const username = user.username ?? userId;

  const events = await db.query.EventTable.findMany({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
    orderBy: ({ order }, { asc }) => asc(order),
  });

  // If user has events, mark the events step as complete
  if (events.length > 0) {
    // Mark events step as complete (non-blocking)
    markStepComplete('events').catch((error) => {
      console.error('Failed to mark events step as complete:', error);
    });
  }

  return <EventsList initialEvents={events} username={username} />;
}
