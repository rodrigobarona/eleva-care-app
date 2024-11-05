import { EventForm } from "@/components/forms/EventForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/drizzle/db";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import React from "react";

export const revalidate = 0;

export default async function EditEventPage({
  params: { eventSlug },
}: {
  params: { eventSlug: string };
}) {
  const { userId, redirectToSignIn } = auth();

  if (userId == null) return redirectToSignIn();

  const event = await db.query.EventTable.findFirst({
    where: ({ slug, clerkUserId }, { and, eq }) =>
      and(eq(clerkUserId, userId), eq(slug, eventSlug)),
  });

  if (event == null) return notFound();

  return (
    <Card className="max-w-md max-auto">
      <CardHeader>
        <CardTitle>Edit Event</CardTitle>
      </CardHeader>
      <CardContent>
        <EventForm
          event={{ ...event, description: event.description || undefined }}
        />
      </CardContent>
    </Card>
  );
}
