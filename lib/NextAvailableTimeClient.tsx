// NextAvailableTimeClient.tsx
"use client";

import React from "react";
import { formatInTimeZone } from "date-fns-tz";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/atoms/tooltip";

function NextAvailableTimeClient({
  date,
  eventName,
  eventSlug,
  username,
}: {
  date: Date | null;
  eventName: string;
  eventSlug: string;
  username: string;
}) {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatNextAvailable = (date: Date) => {
    const timeFormat = "h:mm a";
    const now = new Date();

    const isToday = (date: Date) => {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    };

    const isTomorrow = (date: Date) => {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return (
        date.getFullYear() === tomorrow.getFullYear() &&
        date.getMonth() === tomorrow.getMonth() &&
        date.getDate() === tomorrow.getDate()
      );
    };

    try {
      const formattedTime = formatInTimeZone(date, userTimeZone, timeFormat);

      if (isToday(date)) {
        return `Today at ${formattedTime}`;
      }
      if (isTomorrow(date)) {
        return `Tomorrow at ${formattedTime}`;
      }
      return `${formatInTimeZone(date, userTimeZone, `EEE, ${timeFormat}`)}`;
    } catch {
      return date.toLocaleString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        timeZone: userTimeZone,
        timeZoneName: "short",
      });
    }
  };

  const formatTooltip = (date: Date) => {
    return formatInTimeZone(
      date,
      userTimeZone,
      `'Book ${eventName} on' EEEE, MMM d 'at' h:mm a (z)`
    );
  };

  const getBookingLink = (date: Date) => {
    // Create URL object
    const url = new URL(`/${username}/${eventSlug}`, window.location.origin);

    // Format date exactly as nuqs expects it
    const dateParam = date.toISOString().split("T")[0]; // YYYY-MM-DD format
    const timeParam = date.toISOString(); // Full ISO string

    // Set parameters in the same order as nuqs
    url.searchParams.set("d", dateParam);
    url.searchParams.set("t", timeParam);
    url.searchParams.set("s", "2");

    // Return just the pathname and search
    const finalUrl = url.pathname + url.search;

    // Log for debugging
    console.log("Generated URL:", finalUrl);

    return finalUrl;
  };

  return (
    <div className="text-sm text-muted-foreground mb-6">
      {date ? (
        <TooltipProvider>
          <span>Next available — </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={getBookingLink(date)}
                className="hover:underline cursor-pointer"
              >
                {formatNextAvailable(date)}
              </a>
            </TooltipTrigger>
            <TooltipContent>{formatTooltip(date)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        "No times available"
      )}
    </div>
  );
}

export default NextAvailableTimeClient;
