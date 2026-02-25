'use client';

import { Pipes } from '@workos-inc/widgets';
import '@workos-inc/widgets/dist/css/widgets.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPipesWidgetToken, getCalendarConnectionStatus } from '@/server/actions/calendar';
import { CalendarDays } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { DestinationCalendarSelector } from './DestinationCalendarSelector';

export function CalendarIntegrations() {
  const [widgetToken, setWidgetToken] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    google: boolean;
    outlook: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [token, status] = await Promise.all([
        fetchPipesWidgetToken(),
        getCalendarConnectionStatus(),
      ]);
      setWidgetToken(token);
      setConnectionStatus(status);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load calendar settings',
      );
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasAnyConnection =
    connectionStatus?.google || connectionStatus?.outlook;

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Calendar Integrations
          </CardTitle>
          <CardDescription className="text-destructive">
            {error}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Calendar Integrations
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar or Outlook Calendar to sync
            appointments and check availability. This is optional -- your
            schedule works without a connected calendar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {widgetToken ? (
            <Pipes authToken={widgetToken} />
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {hasAnyConnection && (
        <DestinationCalendarSelector onUpdate={loadData} />
      )}
    </div>
  );
}
