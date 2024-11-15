import { EventForm } from "@/components/organisms/forms/EventForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import React from "react";

export default function NewEventPage() {
  return (
    <Card className="max-w-md max-auto">
      <CardHeader>
        <CardTitle>New Event</CardTitle>
      </CardHeader>
      <CardContent>
        <EventForm />
      </CardContent>
    </Card>
  );
}
