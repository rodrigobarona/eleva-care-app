// NextAvailableTimeClient.tsx
'use client';

import React from 'react';

import { formatInTimeZone } from 'date-fns-tz';
import { ErrorBoundary } from 'react-error-boundary';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/atoms/tooltip';

// NextAvailableTimeClient.tsx

// NextAvailableTimeClient.tsx

// NextAvailableTimeClient.tsx

interface NextAvailableTimeClientProps {
  date: Date | string | null;
  eventName: string;
  eventSlug: string;
  username: string;
  baseUrl?: string;
}

function NextAvailableTimeClient({
  date,
  eventName,
  eventSlug,
  username,
  baseUrl,
}: NextAvailableTimeClientProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  console.log('[NextAvailableTimeClient] Rendering with props:', {
    date,
    eventName,
    eventSlug,
    username,
    baseUrl,
  });

  // Ensure we have a Date instance even if a string was passed from the server.
  const parsedDate = React.useMemo(() => {
    try {
      setIsLoading(true);
      if (!date) return null;
      const dateInstance = typeof date === 'string' ? new Date(date) : date;
      console.log('[NextAvailableTimeClient] Parsed date:', dateInstance);
      return dateInstance;
    } catch (error) {
      console.error('[NextAvailableTimeClient] Error parsing date:', error);
      setError(error instanceof Error ? error : new Error('Failed to parse date'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  // Validate required props
  if (!username || !eventSlug) {
    console.error('[NextAvailableTimeClient] Missing required props:', {
      username,
      eventSlug,
    });
    return <div className="text-sm text-muted-foreground">No booking link available</div>;
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading next available time...</div>;
  }

  if (error) {
    console.error('[NextAvailableTimeClient] Error:', error);
    return <div className="text-sm text-muted-foreground">Unable to load next available time</div>;
  }

  if (parsedDate && Number.isNaN(parsedDate.getTime())) {
    console.error('[NextAvailableTimeClient] Invalid date:', date);
    return <div className="text-sm text-muted-foreground">No times available</div>;
  }

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log('[NextAvailableTimeClient] User timezone:', userTimeZone);

  const formatNextAvailable = (dateObj: Date) => {
    console.log('[NextAvailableTimeClient] Formatting date:', dateObj);
    try {
      const timeFormat = 'h:mm a';
      const now = new Date();

      const formattedTime = formatInTimeZone(dateObj, userTimeZone, timeFormat);
      console.log('[NextAvailableTimeClient] Formatted time:', formattedTime);

      const isToday = (date: Date, now: Date) =>
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();

      const isTomorrow = (date: Date, now: Date) => {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        return (
          date.getFullYear() === tomorrow.getFullYear() &&
          date.getMonth() === tomorrow.getMonth() &&
          date.getDate() === tomorrow.getDate()
        );
      };

      if (isToday(dateObj, now)) {
        return `Today at ${formattedTime}`;
      }
      if (isTomorrow(dateObj, now)) {
        return `Tomorrow at ${formattedTime}`;
      }
      return formatInTimeZone(dateObj, userTimeZone, `EEE, ${timeFormat}`);
    } catch (error) {
      console.error('[NextAvailableTimeClient] Error formatting date:', error);
      return dateObj.toLocaleString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZone: userTimeZone,
        timeZoneName: 'short',
      });
    }
  };

  const getBookingLink = (date: Date) => {
    console.log('[NextAvailableTimeClient] Generating booking link for date:', date);
    try {
      if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid date provided to getBookingLink');
      }

      const dateParam = date.toISOString().split('T')[0];
      const timeParam = date.toISOString();
      const basePath = baseUrl
        ? `${baseUrl}/${username}/${eventSlug}`
        : `/${username}/${eventSlug}`;
      const searchParams = new URLSearchParams({
        d: dateParam,
        t: timeParam,
        s: '2',
      });
      const finalUrl = `${basePath}?${searchParams.toString()}`;

      console.log('[NextAvailableTimeClient] Generated URL:', finalUrl);
      return finalUrl;
    } catch (error) {
      console.error('[NextAvailableTimeClient] Error generating booking link:', error);
      return '#';
    }
  };

  function ErrorFallback({ error }: { error: Error }) {
    console.error('[NextAvailableTimeClient] Error boundary caught error:', error);
    return <div className="text-sm text-muted-foreground">No times available</div>;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="mb-6 text-sm text-muted-foreground">
        {parsedDate ? (
          <TooltipProvider>
            <span>Next available — </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={getBookingLink(parsedDate)} className="cursor-pointer hover:underline">
                  {formatNextAvailable(parsedDate)}
                </a>
              </TooltipTrigger>
              <TooltipContent>
                {formatInTimeZone(
                  parsedDate,
                  userTimeZone,
                  `'Book' '${eventName}' 'on' EEEE, MMM d 'at' h:mm a '('z')'`,
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          'No times available'
        )}
      </div>
    </ErrorBoundary>
  );
}

export default NextAvailableTimeClient;
