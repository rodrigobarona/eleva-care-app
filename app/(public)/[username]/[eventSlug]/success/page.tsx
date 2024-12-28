import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { db } from "@/drizzle/db";
import { formatDateTime } from "@/lib/formatters";
import { createClerkClient } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

export const revalidate = 0;

export default async function SuccessPage({
  params: { username, eventSlug },
  searchParams: { startTime },
}: {
  params: { username: string; eventSlug: string };
  searchParams: { startTime: string };
}) {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  
  const users = await clerk.users.getUserList({
    username: [username],
  });
  const user = users.data[0];
  if (!user) return notFound();

  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId: userIdCol, isActive, slug }, { eq, and }) =>
      and(eq(isActive, true), eq(userIdCol, user.id), eq(slug, eventSlug)),
  });

  if (event == null) notFound();

  const calendarUser = await clerk.users.getUser(user.id);
  
  // Validate startTime before creating Date object
  let startTimeDate: Date;
  try {
    if (!startTime) throw new Error("Missing startTime");
    startTimeDate = new Date(startTime);
    if (Number.isNaN(startTimeDate.getTime())) throw new Error("Invalid date");
  } catch (error) {
    console.error("Invalid startTime:", startTime, error);
    return notFound();
  }

  // Verify that the meeting was actually created
  const meeting = await db.query.MeetingTable.findFirst({
    where: ({ eventId, startTime: meetingStartTime }, { eq, and }) =>
      and(
        eq(eventId, event.id),
        eq(meetingStartTime, startTimeDate)
      ),
  });

  // If paid event but no meeting found, payment might not be confirmed yet
  if (event.price > 0 && !meeting) {
    // Redirect to payment processing page
    redirect(`/${username}/${eventSlug}/payment-processing?startTime=${startTimeDate.toISOString()}`);
  }

  // If free event but no meeting, something went wrong
  if (event.price === 0 && !meeting) {
    redirect(`/${username}/${eventSlug}?error=meeting-not-created`);
  }

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>
          Successfully Booked {event.name} with {calendarUser.fullName}
        </CardTitle>
        <CardDescription>{formatDateTime(startTimeDate)}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>You should receive an email confirmation shortly.</p>
        {meeting && (
          <p className="text-muted-foreground mt-2">
            Meeting ID: {meeting.id}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
