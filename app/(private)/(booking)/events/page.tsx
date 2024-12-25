import { CopyEventButton } from "@/components/molecules/CopyEventButton";
import { Button } from "@/components/atoms/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { db } from "@/drizzle/db";
import { formatEventDescription } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { auth } from "@clerk/nextjs/server";
import { CalendarPlus, CalendarRange } from "lucide-react";
import Link from "next/link";
import React from "react";
import { createClerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Markdown from "react-markdown";

export const revalidate = 0;

export default async function EventsPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const user = await clerk.users.getUser(userId);
  const username = user.username ?? userId;

  const events = await db.query.EventTable.findMany({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
    orderBy: ({ createdAt }, { desc }) => desc(createdAt),
  });

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">
            Manage your booking events and availability.
          </p>
        </div>
        <Button asChild>
          <Link href="/events/new">
            <CalendarPlus className="mr-2 h-4 w-4" />
            New event
          </Link>
        </Button>
      </div>

      {events.length > 0 ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} username={username} {...event} />
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <CalendarRange className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No events yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first event to start accepting bookings.
          </p>
          <Button asChild>
            <Link href="/events/new">
              <CalendarPlus className="mr-2 h-4 w-4" />
              New event
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
}

type EventCardProps = {
  slug: string;
  isActive: boolean;
  name: string;
  description: string | null;
  durationInMinutes: number;
  username: string;
};

function EventCard({
  slug,
  isActive,
  name,
  description,
  durationInMinutes,
  username,
}: EventCardProps) {
  return (
    <Card className={cn("flex flex-col h-full", !isActive && "bg-muted/50")}>
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <CardTitle className={cn(!isActive && "text-muted-foreground")}>
              {name}
            </CardTitle>
            <CardDescription>
              {formatEventDescription(durationInMinutes)}
            </CardDescription>
          </div>
          {!isActive && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
              Inactive
            </span>
          )}
        </div>
      </CardHeader>
      {description && (
        <CardContent className={cn("prose prose-sm dark:prose-invert flex-grow", !isActive && "text-muted-foreground")}>
          <Markdown>{description}</Markdown>
        </CardContent>
      )}
      <CardFooter className="flex justify-end gap-2 mt-auto border-t pt-4">
        {isActive && (
          <CopyEventButton
            variant="outline"
            eventSlug={slug}
            username={username}
          />
        )}
        <Button asChild variant="default">
          <Link href={`/events/${slug}/edit`}>Edit</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
