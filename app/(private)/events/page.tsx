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
import { clerkClient } from "@clerk/nextjs/server";

export const revalidate = 0;

export default async function EventsPage() {
  const { userId, redirectToSignIn } = auth();

  if (!userId) {
    return redirectToSignIn({
      returnBackUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    });
  }

  const user = await clerkClient.users.getUser(userId);
  const username = user.username ?? userId;

  const events = await db.query.EventTable.findMany({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
    orderBy: ({ createdAt }, { desc }) => desc(createdAt),
  });
  return (
    <>
      <div className="flex gap-4 items-baseline">
        <h1 className="text-3xl lg:text-4xl xl:text-5xl font-semibold mb-6">
          Events
        </h1>
        <Button asChild>
          <Link href="/events/new">
            <CalendarPlus className="mr-4 size-6 " />
            New event
          </Link>
        </Button>
      </div>
      {events.length > 0 ? (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(400px,1fr))]">
          {events.map((event) => (
            <EventCard key={event.id} username={username} {...event} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 ">
          <CalendarRange className="size-16 mx-auto" />
          You you do not have an event yet. Create your first event to get
          started!
          <Button size="lg" className="text-lg" asChild>
            <Link href="/events/new">
              <CalendarPlus className="mr-4 size-6 " />
              New event
            </Link>
          </Button>
        </div>
      )}
    </>
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
    <Card className={cn("flex flex-col", !isActive && "border-secondary/50")}>
      <CardHeader className={cn(!isActive && "opacity-50")}>
        <CardTitle>{name}</CardTitle>
        <CardDescription>
          {formatEventDescription(durationInMinutes)}
        </CardDescription>
      </CardHeader>
      {description != null && (
        <CardContent className={cn(!isActive && "opacity-50")}>
          {description}
        </CardContent>
      )}
      <CardFooter className=" flex justify-end gap-2 mt-auto">
        {isActive && (
          <CopyEventButton
            variant="outline"
            eventSlug={slug}
            username={username}
          />
        )}
        <Button asChild>
          <Link href={`/events/${slug}/edit`}>Edit</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
