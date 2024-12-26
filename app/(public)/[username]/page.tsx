import React from "react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { db } from "@/drizzle/db";
import { formatEventDescription } from "@/lib/formatters";
import { createClerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

export const revalidate = 0;

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
    orderBy: ({ name }, { asc, sql }) => asc(sql`lower(${name})`),
  });

  if (events.length === 0) return notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-12">Book a session</h1>
      <div className="space-y-6">
        {events.map((event) => (
          <EventCard key={event.id} {...event} username={username} />
        ))}
      </div>
    </div>
  );
}

type EventCardProps = {
  id: string;
  name: string;
  clerkUserId: string;
  description: string | null;
  durationInMinutes: number;
  slug: string;
  username: string;
};

function EventCard({
  name,
  description,
  durationInMinutes,
  slug,
  username,
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

          <div className="flex items-center gap-1 text-amber-400 mt-4">
            {"★".repeat(5)}
            <span className="text-black ml-1">5.0</span>
            <span className="text-muted-foreground">(10)</span>
          </div>
        </div>

        <div className="p-6 lg:p-8 lg:w-72 lg:border-l flex flex-col justify-between bg-gray-50">
          <div>
            <div className="text-lg font-semibold mb-1">Starting at</div>
            <div className="text-3xl font-bold mb-4">$100</div>
            <div className="text-sm text-muted-foreground mb-6">
              Next available — 5:00pm today
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
