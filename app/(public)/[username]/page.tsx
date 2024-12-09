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
import Image from "next/image";

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

  const profile = await db.query.ProfileTable.findFirst({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, user.id),
  });

  const events = await db.query.EventTable.findMany({
    where: ({ clerkUserId: userIdCol, isActive }, { eq, and }) =>
      and(eq(userIdCol, user.id), eq(isActive, true)),
    orderBy: ({ name }, { asc, sql }) => asc(sql`lower(${name})`),
  });

  if (events.length === 0) return notFound();

  return (
    <div className="container max-w-7xl py-10">
      <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] gap-8">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg">
            <Image
              src={profile?.profilePicture || user.imageUrl}
              alt={user.fullName || "Profile picture"}
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold">{user.fullName}</h1>
              <p className="text-muted-foreground">@{user.username}</p>
            </div>
            {profile?.headline && (
              <p className="text-lg font-medium">{profile.headline}</p>
            )}
            {profile?.shortBio && (
              <p className="text-muted-foreground">{profile.shortBio}</p>
            )}
            {profile?.longBio && (
              <div className="prose prose-sm dark:prose-invert">
                <p>{profile.longBio}</p>
              </div>
            )}
            {profile?.socialLinks && profile.socialLinks.length > 0 && (
              <div className="flex gap-4">
                {profile.socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Booking Options */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Book a session</h2>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {events.map((event) => (
              <EventCard key={event.id} {...event} username={username} />
            ))}
          </div>
        </div>
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
