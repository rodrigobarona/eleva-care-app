import { PackForm } from '@/components/features/forms/PackForm';
import { db } from '@/drizzle/db';
import { SessionPackTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';

export default async function EditPackPage({ params }: { params: Promise<{ packId: string }> }) {
  const { packId } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);
  }

  const [pack, events] = await Promise.all([
    db.query.SessionPackTable.findFirst({
      where: and(eq(SessionPackTable.id, packId), eq(SessionPackTable.clerkUserId, userId)),
    }),
    db.query.EventTable.findMany({
      where: ({ clerkUserId, isActive, price }, { eq: eqFn, and: andFn, gt: gtFn }) =>
        andFn(eqFn(clerkUserId, userId), eqFn(isActive, true), gtFn(price, 0)),
      orderBy: ({ name }, { asc }) => asc(name),
    }),
  ]);

  if (!pack) {
    notFound();
  }

  return (
    <div className="container max-w-3xl space-y-6 py-8">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Edit Session Pack</h2>
        <p className="text-muted-foreground">Update this session pack&apos;s details.</p>
      </div>
      <PackForm
        events={events}
        pack={{
          id: pack.id,
          eventId: pack.eventId,
          name: pack.name,
          description: pack.description ?? undefined,
          sessionsCount: pack.sessionsCount,
          price: pack.price,
          currency: pack.currency as 'eur',
          isActive: pack.isActive,
          expirationDays: pack.expirationDays ?? 180,
          stripeProductId: pack.stripeProductId ?? undefined,
          stripePriceId: pack.stripePriceId ?? undefined,
        }}
      />
    </div>
  );
}
