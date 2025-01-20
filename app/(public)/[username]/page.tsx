import React from "react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { db } from "@/drizzle/db";
import { formatEventDescription } from "@/lib/formatters";
import { createClerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Suspense } from "react";
import { Skeleton } from "@/components/atoms/skeleton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Event = {
  id: string;
  name: string;
  clerkUserId: string;
  description: string | null;
  durationInMinutes: number;
  slug: string;
  isActive: boolean;
  price: number;
};

export default async function BookingPage({
  params: { username },
}: {
  params: { username: string };
}) {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const users = await clerk.users.getUserList({
    username: [username],
  });

  const user = users.data[0];
  if (!user) return notFound();

  const events = await db.query.EventTable.findMany({
    where: ({ clerkUserId: userIdCol, isActive }, { eq, and }) =>
      and(eq(userIdCol, user.id), eq(isActive, true)),
    orderBy: ({ order }, { asc }) => asc(order),
  });

  if (events.length === 0) return notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-12">Book a session</h1>
      <div className="space-y-6">
        {events.map((event) => (
          <Suspense key={event.id} fallback={<LoadingEventCard />}>
            <EventCardWrapper event={event} username={username} />
          </Suspense>
        ))}
      </div>
    </div>
  );
}

async function EventCardWrapper({
  event,
  username,
}: {
  event: Event;
  username: string;
}) {
  return <EventCard {...event} username={username} />;
}

type EventCardProps = {
  id: string;
  name: string;
  clerkUserId: string;
  description: string | null;
  durationInMinutes: number;
  slug: string;
  username: string;
  price: number;
};

function EventCard({
  name,
  description,
  durationInMinutes,
  slug,
  username,
  price,
}: EventCardProps) {
  return (
    <Card className="overflow-hidden border-2 hover:border-primary/50 transition-colors duration-200">
      <div className="flex flex-col lg:flex-row">
        <div className="flex-grow p-6 lg:p-8">
          <div className="inline-block px-3 py-1 mb-4 text-sm font-medium bg-black text-white rounded-full">
            Book a video call
          </div>

          <h3 className="text-2xl font-bold mb-2">{name}</h3>

          {description ? (
            <ReactMarkdown className="prose text-muted-foreground mb-4 text-base">
              {description}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground mb-4 text-base">
              No description available.
            </p>
          )}

          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">Duration:</span>
            <span className="text-muted-foreground">
              {formatEventDescription(durationInMinutes)}
            </span>
          </div>
        </div>

        <div className="p-6 lg:p-8 lg:w-72 lg:border-l flex flex-col justify-between bg-gray-50">
          <div>
            <div className="text-lg font-semibold mb-1">Session</div>
            <div className="text-3xl font-bold mb-4">
              {price === 0 ? (
                "Free"
              ) : (
                <>
                  €{" "}
                  {(price / 100).toLocaleString("pt-PT", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </>
              )}
            </div>
          </div>

          <Button
            className="w-full py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            asChild
          >
            <Link href={`/${username}/${slug}`}>See times</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function LoadingEventCard() {
  return (
    <Card className="overflow-hidden border-2">
      <div className="flex flex-col lg:flex-row">
        <div className="flex-grow p-6 lg:p-8">
          <div className="inline-block w-32 h-7 bg-gray-200 rounded-full mb-4" />
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-20 w-full mb-4" />
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-6 w-32" />
        </div>

        <div className="p-6 lg:p-8 lg:w-72 lg:border-l flex flex-col justify-between bg-gray-50">
          <div>
            <Skeleton className="h-6 w-20 mb-2" />
            <Skeleton className="h-10 w-24 mb-4" />
            <Skeleton className="h-5 w-40 mb-6" />
          </div>
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </Card>
  );
}
