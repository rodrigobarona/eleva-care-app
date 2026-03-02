import { PackForm } from '@/components/features/forms/PackForm';
import { db } from '@/drizzle/db';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function NewPackPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);
  }

  const events = await db.query.EventTable.findMany({
    where: ({ clerkUserId, isActive }, { eq, and }) =>
      and(eq(clerkUserId, userId), eq(isActive, true)),
    orderBy: ({ name }, { asc }) => asc(name),
  });

  return (
    <div className="container max-w-3xl space-y-6 py-8">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">New Session Pack</h2>
        <p className="text-muted-foreground">
          Create a bundle of sessions that customers can purchase at a discounted price.
        </p>
      </div>
      <PackForm events={events} />
    </div>
  );
}
