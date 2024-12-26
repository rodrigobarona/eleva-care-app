import { EventFormWrapper } from "@/components/organisms/forms/EventFormWrapper";
import { db } from "@/drizzle/db";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import React, { Suspense } from "react";

function LoadingState() {
  return (
    <div className="container max-w-3xl py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default async function EditEventPage({
  params: { eventSlug },
}: {
  params: { eventSlug: string };
}) {
  const { userId, redirectToSignIn } = auth();

  if (userId == null) return redirectToSignIn();

  try {
    const event = await db.query.EventTable.findFirst({
      where: ({ slug, clerkUserId }, { and, eq }) =>
        and(eq(clerkUserId, userId), eq(slug, eventSlug)),
    });

    if (event == null) {
      return notFound();
    }

    return (
      <div className="container max-w-3xl py-8 space-y-6">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Edit Event</h2>
          <p className="text-muted-foreground">
            Make changes to your event settings and information.
          </p>
        </div>
        <Suspense fallback={<LoadingState />}>
          <EventFormWrapper event={event} />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error("Database error:", error);
    return (
      <div className="container max-w-3xl py-8">
        <h2 className="text-2xl font-bold tracking-tight text-red-600">
          Database Connection Error
        </h2>
        <p className="text-muted-foreground">
          Unable to connect to the database. Please try again later.
        </p>
      </div>
    );
  }
}
