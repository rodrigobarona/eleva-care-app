import { EventForm } from "@/components/molecules/EventForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";

const NewEventPage = () => {
  // Your component logic here
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
};

export default NewEventPage;
