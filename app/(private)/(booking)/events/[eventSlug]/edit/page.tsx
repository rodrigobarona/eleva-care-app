import { EventForm } from "@/components/organisms/forms/EventForm";
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
    <div className="container max-w-3xl py-8 space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Edit Event</h2>
        <p className="text-muted-foreground">
          Make changes to your event settings and information.
        </p>
      </div>
      <EventForm
        event={{ ...event, description: event.description || undefined }}
      />
    </div>
  );
}
