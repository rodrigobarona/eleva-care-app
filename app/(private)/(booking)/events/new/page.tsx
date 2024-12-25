import { EventForm } from "@/components/organisms/forms/EventForm";
import React from "react";

export default function NewEventPage() {
  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">New Event</h2>
        <p className="text-muted-foreground">
          Create a new event that users can book appointments for.
        </p>
      </div>
      <EventForm />
    </div>
  );
}
