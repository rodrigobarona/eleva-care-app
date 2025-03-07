import { EventsList } from '@/components/organisms/EventsList';
import { db } from '@/drizzle/db';
import { markStepCompleteNoRevalidate } from '@/server/actions/expert-setup';
import { auth, createClerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function EventsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);
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

  // Check if the expert has at least one published event
  if (events.some((event) => event.isActive)) {
    // Mark events step as complete (non-blocking)
    try {
      await markStepCompleteNoRevalidate('events');
    } catch (error) {
      console.error('Failed to mark events step as complete:', error);
    }
  }

  return <EventsList initialEvents={events} username={username} />;
}
