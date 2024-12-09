import React from "react";
import { Button } from "@/components/atoms/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { db } from "@/drizzle/db";
import { formatEventDescription } from "@/lib/formatters";
import { createClerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";

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
    <>
      <h2 className="text-2xl font-semibold">Book a session</h2>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {events.map((event) => (
          <EventCard key={event.id} {...event} username={username} />
        ))}
      </div>
    </>
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
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-xl">{name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {formatEventDescription(durationInMinutes)}
        </p>
      </CardHeader>
      {description != null && (
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      )}
      <CardContent className="pt-0">
        <Button className="w-full" asChild>
          <Link href={`/${username}/${slug}`}>Select Time</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
