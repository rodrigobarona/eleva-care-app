import { EventsList } from '@/components/organisms/EventsList';
import { db } from '@/drizzle/db';
import { auth, createClerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function EventsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
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

  return <EventsList initialEvents={events} username={username} />;
}
