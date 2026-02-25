'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { CalendarInfo } from '@/lib/integrations/calendar';
import {
  getDestinationCalendar,
  listAvailableCalendars,
  removeDestinationCalendar,
  setDestinationCalendar,
} from '@/server/actions/calendar';
import { CalendarCheck, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

interface DestinationCalendarSelectorProps {
  onUpdate?: () => void;
}

export function DestinationCalendarSelector({
  onUpdate,
}: DestinationCalendarSelectorProps) {
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadCalendars = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cals, dest] = await Promise.all([
        listAvailableCalendars(),
        getDestinationCalendar(),
      ]);
      setCalendars(cals);
      if (dest) {
        setSelectedId(`${dest.provider}:${dest.externalId}`);
      }
    } catch {
      toast.error('Failed to load calendars');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalendars();
  }, [loadCalendars]);

  const handleSelect = (value: string) => {
    setSelectedId(value);
    const cal = calendars.find((c) => `${c.provider}:${c.id}` === value);
    if (!cal) return;

    startTransition(async () => {
      try {
        await setDestinationCalendar(cal.provider, cal.id, cal.name);
        toast.success(`Destination calendar set to "${cal.name}"`);
        onUpdate?.();
      } catch {
        toast.error('Failed to save destination calendar');
      }
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      try {
        await removeDestinationCalendar();
        setSelectedId(null);
        toast.success('Destination calendar removed');
        onUpdate?.();
      } catch {
        toast.error('Failed to remove destination calendar');
      }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5" />
          Destination Calendar
        </CardTitle>
        <CardDescription>
          Choose which calendar new booking events are saved to. If no
          destination is set, events are only saved in the app database.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {calendars.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No writable calendars found. Connect a calendar above to get
            started.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Select
              value={selectedId ?? undefined}
              onValueChange={handleSelect}
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a destination calendar" />
              </SelectTrigger>
              <SelectContent>
                {calendars.map((cal) => {
                  const value = `${cal.provider}:${cal.id}`;
                  const providerLabel =
                    cal.provider === 'google-calendar'
                      ? 'Google'
                      : 'Outlook';
                  return (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        {cal.color && (
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: cal.color }}
                          />
                        )}
                        {cal.name}
                        <span className="text-xs text-muted-foreground">
                          ({providerLabel})
                        </span>
                        {cal.primary && (
                          <span className="text-xs text-muted-foreground">
                            -- Primary
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {selectedId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemove}
                disabled={isPending}
                title="Remove destination calendar"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
