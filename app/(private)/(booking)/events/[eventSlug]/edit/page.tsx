import { db } from '@/drizzle/db';
import { auth } from '@clerk/nextjs/server';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

// Create a client-side only wrapper component
const ClientEventFormWrapper = dynamic(() =>
  import('@/components/organisms/forms/EventFormWrapper').then((mod) => mod.EventFormWrapper),
);

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
        <ClientEventFormWrapper event={event} />
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
