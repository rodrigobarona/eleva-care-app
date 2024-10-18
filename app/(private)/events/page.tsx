import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function EventsPage() {
  return (
    <>
      <div>
        <h1>Events</h1>
        <Button asChild>
          <Link href="/events/new">
            <CalendarPlus className="mr-4 size-6 " />
            New event
          </Link>
        </Button>
      </div>
    </>
  );
}
