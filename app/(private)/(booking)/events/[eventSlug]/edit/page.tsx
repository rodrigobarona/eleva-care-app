import { EventFormWrapper } from '@/components/organisms/forms/EventFormWrapper';
import { db } from '@/drizzle/db';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

function LoadingState() {
  return (
    <div className="container max-w-3xl py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded bg-gray-200" />
        <div className="h-4 w-2/3 rounded bg-gray-200" />
        <div className="h-64 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export default async function EditEventPage(props: { params: Promise<{ eventSlug: string }> }) {
  const params = await props.params;

  const { eventSlug } = params;

  const { userId, redirectToSignIn } = await auth();

  if (userId == null) return redirectToSignIn();

  try {
    const event = await db.query.EventTable.findFirst({
      where: ({ slug, clerkUserId }, { and, eq }) =>
        and(eq(clerkUserId, userId), eq(slug, eventSlug)),
    });

    if (event == null) {
      return notFound();
    }

    return (
      <div className="container max-w-3xl space-y-6 py-8">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Edit Event</h2>
          <p className="text-muted-foreground">
            Make changes to your event settings and information.
          </p>
        </div>
        <Suspense fallback={<LoadingState />}>
          <EventFormWrapper event={event} />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error('Database error:', error);
    return (
      <div className="container max-w-3xl py-8">
        <h2 className="text-2xl font-bold tracking-tight text-red-600">
          Database Connection Error
        </h2>
        <p className="text-muted-foreground">
          Unable to connect to the database. Please try again later.
        </p>
      </div>
    );
  }
}
