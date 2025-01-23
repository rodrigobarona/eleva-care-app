// NextAvailableTimeClient.tsx
"use client";

import React from "react";
import { formatInTimeZone } from "date-fns-tz";

function NextAvailableTimeClient({ date }: { date: Date | null }) {
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
      const timezoneName =
        new Intl.DateTimeFormat("en", {
          timeZoneName: "short",
          timeZone: userTimeZone,
        })
          .formatToParts(date)
          .find((part) => part.type === "timeZoneName")?.value || "";

      if (isToday(date)) {
        return `Today at ${formattedTime} ${timezoneName}`;
      }
      if (isTomorrow(date)) {
        return `Tomorrow at ${formattedTime} ${timezoneName}`;
      }
      return `${formatInTimeZone(date, userTimeZone, `EEE, ${timeFormat}`)} ${timezoneName}`;
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

  return (
    <div className="text-sm text-muted-foreground mb-6">
      {date
        ? `Next available — ${formatNextAvailable(date)}`
        : "No times available"}
    </div>
  );
}

export default NextAvailableTimeClient;
