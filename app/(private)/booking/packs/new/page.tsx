import { PackForm } from '@/components/features/forms/PackForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/drizzle/db';
import { auth } from '@clerk/nextjs/server';
import { CalendarPlus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function NewPackPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);
  }

  const events = await db.query.EventTable.findMany({
    where: ({ clerkUserId, isActive, price }, { eq, and, gt }) =>
      and(eq(clerkUserId, userId), eq(isActive, true), gt(price, 0)),
    orderBy: ({ name }, { asc }) => asc(name),
  });

  if (events.length === 0) {
    return (
      <div className="container max-w-3xl space-y-6 py-8">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>No Paid Events Available</CardTitle>
            <CardDescription>
              You need at least one active paid event before creating a session pack. Free events
              cannot be bundled into packs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/booking/events/new">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Create an Event
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
