'use client';

import { DAYS_OF_WEEK_IN_ORDER } from '@/app/data/constants';
import { Button } from '@/components/atoms/button';
import { Separator } from '@/components/atoms/separator';
import { Switch } from '@/components/atoms/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/atoms/tooltip';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/molecules/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/molecules/select';
import { formatTimezoneOffset } from '@/lib/formatters';
import { timeToInt } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { scheduleFormSchema } from '@/schema/schedule';
import { saveSchedule } from '@/server/actions/schedule';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

// Generate time options in 15-minute intervals
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push({ value: time, label: time });
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

type Availability = {
  startTime: string;
  endTime: string;
  dayOfWeek: (typeof DAYS_OF_WEEK_IN_ORDER)[number];
};

// Add these helper functions before the ScheduleForm component
const CONTINENT_LABELS: Record<string, string> = {
  America: '🌎 Americas',
  Europe: '🌍 Europe',
  Asia: '🌏 Asia',
  Africa: '🌍 Africa',
  Pacific: '🌏 Pacific',
  Atlantic: '🌍 Atlantic',
  Indian: '🌏 Indian',
  Antarctica: '❄️ Antarctica',
  Australia: '🌏 Australia',
};

const getDisplayLabel = (continent: string): string => {
  return CONTINENT_LABELS[continent] ?? `�� ${continent}`;
};

interface GroupedTimezone {
  continent: string;
  timezones: { value: string; label: string; offset: string }[];
}

const groupTimezones = () => {
  const timezones = Intl.supportedValuesOf('timeZone');
  const grouped: Record<string, { value: string; label: string; offset: string }[]> = {};

  for (const timezone of timezones) {
    const [continent = 'Other'] = timezone.split('/');
    if (!grouped[continent]) {
      grouped[continent] = [];
    }

    const parts = timezone.split('/');
    const city = parts[parts.length - 1]?.replace(/_/g, ' ') || timezone;
    const offset = formatTimezoneOffset(timezone);

    grouped[continent].push({
      value: timezone,
      label: city,
      offset: offset,
    });
  }

  // Convert to array and sort continents
  return Object.entries(grouped)
    .map(
      ([continent, timezones]): GroupedTimezone => ({
        continent,
        timezones: timezones.sort((a, b) => {
          const offsetCompare = a.offset.localeCompare(b.offset);
          return offsetCompare !== 0 ? offsetCompare : a.label.localeCompare(b.label);
        }),
      }),
    )
    .sort((a, b) => a.continent.localeCompare(b.continent));
};

export function ScheduleForm({
  schedule,
}: {
  schedule?: {
    timezone: string;
    availabilities: Availability[];
  };
}) {
  const form = useForm<z.infer<typeof scheduleFormSchema>>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      timezone: schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      availabilities: schedule?.availabilities.toSorted((a, b) => {
        return timeToInt(a.startTime) - timeToInt(b.startTime);
      }),
    },
  });

  const {
    append: addAvailability,
    remove: removeAvailability,
    fields: availabilityFields,
  } = useFieldArray({ name: 'availabilities', control: form.control });

  const groupedAvailabilityFields = Object.groupBy(
    availabilityFields.map((field, index) => ({ ...field, index })),
    (availability) => availability.dayOfWeek,
  );

  // Add protection against unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form.formState.isDirty]);

  async function onSubmit(values: z.infer<typeof scheduleFormSchema>) {
    try {
      const data = await saveSchedule(values);
      if (data?.error) {
        toast.error('Failed to save schedule');
        form.setError('root', {
          message: 'There was an error saving your schedule',
        });
      } else {
        toast.success('Schedule saved successfully!');
        // Mark form as pristine with current values
        form.reset(values);
      }
    } catch {
      toast.error('An unexpected error occurred');
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="relative">
          <div className="space-y-8 pb-28">
            <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
              <div>
                <h3 className="font-serif text-xl font-medium tracking-tight text-eleva-primary">
                  Weekly hours
                </h3>
                <p className="mt-1 text-sm leading-6 text-eleva-neutral-900/60">
                  Configure times when you are available for bookings.
                </p>
              </div>

              <div className="lg:col-span-2">
                <div className="divide-y divide-eleva-neutral-200 rounded-lg border border-eleva-neutral-200">
                  {DAYS_OF_WEEK_IN_ORDER.map((dayOfWeek) => {
                    const dayFields = groupedAvailabilityFields[dayOfWeek] ?? [];
                    const hasAvailability = dayFields.length > 0;
                    return (
                      <div
                        key={dayOfWeek}
                        className="flex items-start gap-4 px-4 py-4 first:pt-4 last:pb-4"
                      >
                        <div className="w-40">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={hasAvailability}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  addAvailability({
                                    dayOfWeek,
                                    startTime: '09:00',
                                    endTime: '17:00',
                                  });
                                } else {
                                  for (const field of dayFields) {
                                    removeAvailability(field.index);
                                  }
                                }
                              }}
                            />
                            <span className="text-sm font-medium capitalize text-eleva-neutral-900">
                              {dayOfWeek}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1">
                          {hasAvailability ? (
                            <div className="space-y-3">
                              {dayFields.map((field, labelIndex) => (
                                <div key={field.id} className="group flex items-center gap-3">
                                  <FormField
                                    control={form.control}
                                    name={`availabilities.${field.index}.startTime`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                          >
                                            <SelectTrigger className="w-32 border-eleva-neutral-200 font-mono text-sm">
                                              <SelectValue placeholder="Start time" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {TIME_OPTIONS.map((option) => (
                                                <SelectItem
                                                  key={option.value}
                                                  value={option.value}
                                                  className="font-mono text-sm"
                                                >
                                                  {option.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </FormControl>
                                        <FormMessage className="text-xs text-eleva-highlight-red" />
                                      </FormItem>
                                    )}
                                  />
                                  <span className="text-xs text-eleva-neutral-900/60">to</span>
                                  <FormField
                                    control={form.control}
                                    name={`availabilities.${field.index}.endTime`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                          >
                                            <SelectTrigger className="w-32 border-eleva-neutral-200 font-mono text-sm">
                                              <SelectValue placeholder="End time" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {TIME_OPTIONS.map((option) => (
                                                <SelectItem
                                                  key={option.value}
                                                  value={option.value}
                                                  className="font-mono text-sm"
                                                >
                                                  {option.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </FormControl>
                                        <FormMessage className="text-xs text-eleva-highlight-red" />
                                      </FormItem>
                                    )}
                                  />
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="opacity-0 transition-opacity group-hover:opacity-100"
                                      onClick={() => removeAvailability(field.index)}
                                    >
                                      <Trash2 className="size-4 text-eleva-neutral-900/60 hover:text-eleva-highlight-red" />
                                    </Button>
                                    {labelIndex === dayFields.length - 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="opacity-0 transition-opacity group-hover:opacity-100"
                                        onClick={() => {
                                          addAvailability({
                                            dayOfWeek,
                                            startTime: '09:00',
                                            endTime: '17:00',
                                          });
                                        }}
                                      >
                                        <Plus className="size-4 text-eleva-neutral-900/60 hover:text-eleva-neutral-900" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-eleva-neutral-900/60">Unavailable</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <Separator className="my-8 bg-eleva-neutral-200" />

            <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
              <div>
                <h3 className="font-serif text-xl font-medium tracking-tight text-eleva-secondary">
                  Time zone
                </h3>
                <p className="mt-1 text-sm leading-6 text-eleva-neutral-900/60">
                  Select your timezone to ensure accurate scheduling.
                </p>
              </div>

              <div className="space-y-8 lg:col-span-2">
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-[360px] border-eleva-neutral-200">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[320px] overflow-hidden">
                            {groupTimezones().map((group) => (
                              <div key={group.continent} className="relative">
                                <div className="sticky -top-1 z-10 border-b border-eleva-neutral-200 bg-white px-2 py-1">
                                  <div className="font-serif text-sm font-medium tracking-tight text-eleva-primary">
                                    {getDisplayLabel(group.continent)}
                                  </div>
                                </div>
                                {group.timezones.map((timezone) => (
                                  <SelectItem
                                    key={timezone.value}
                                    value={timezone.value}
                                    className={cn(
                                      'cursor-pointer pl-4 pr-2',
                                      field.value === timezone.value && 'bg-eleva-primary/5',
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-sm">{timezone.label}</span>
                                      <span className="font-mono text-xs text-eleva-neutral-900/60">
                                        {timezone.offset}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-6">
                                <Info className="size-4 text-eleva-neutral-900/60" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-eleva-primary px-3 py-1.5 text-xs text-white">
                              Your timezone was automatically detected
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormMessage className="text-xs text-eleva-highlight-red" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          {form.formState.isDirty && (
            <div className="animate-in fade-in slide-in-from-bottom-4 fixed bottom-6 right-6 z-10">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="rounded-full bg-eleva-primary px-6 font-medium text-white shadow-lg transition-all hover:bg-eleva-primary-light hover:shadow-md focus:ring-2 focus:ring-eleva-primary/50"
              >
                {form.formState.isSubmitting ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </>
  );
}
