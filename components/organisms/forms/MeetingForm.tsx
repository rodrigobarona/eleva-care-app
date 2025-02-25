'use client';

import * as React from 'react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { Calendar } from '@/components/molecules/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/molecules/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/molecules/select';
import { formatTimezoneOffset } from '@/lib/formatters';
import { hasValidTokens } from '@/lib/googleCalendarClient';
import { cn } from '@/lib/utils';
import { meetingFormSchema } from '@/schema/meetings';
import { createMeeting } from '@/server/actions/meetings';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, startOfDay } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { Calendar as CalendarIcon, Clock, Euro, Globe, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  parseAsIsoDate,
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

type MeetingFormProps = {
  validTimes: Date[];
  eventId: string;
  clerkUserId: string;
  price: number;
  username: string;
  eventSlug: string;
  eventName: string;
  eventDetails?: {
    expectations?: string[];
    idealFor?: string[];
    duration?: number;
  };
};

function MeetingFormContent({
  validTimes,
  eventId,
  clerkUserId,
  price,
  username,
  eventSlug,
  eventName,
  eventDetails,
}: MeetingFormProps) {
  const router = useRouter();

  // State management
  const [use24Hour, setUse24Hour] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCalendarSynced, setIsCalendarSynced] = React.useState(true);

  // Query state configuration
  const queryStateParsers = React.useMemo(
    () => ({
      step: parseAsStringLiteral(['1', '2', '3'] as const).withDefault('1'),
      date: parseAsIsoDate,
      time: parseAsIsoDateTime,
      name: parseAsString.withDefault(''),
      email: parseAsString.withDefault(''),
      timezone: parseAsString.withDefault(''),
    }),
    [],
  );

  const [queryStates, setQueryStates] = useQueryStates(queryStateParsers, {
    history: 'push',
    shallow: true,
    urlKeys: {
      step: 's',
      date: 'd',
      time: 't',
      name: 'n',
      email: 'e',
      timezone: 'tz',
    },
  });

  // Form initialization
  const form = useForm<z.infer<typeof meetingFormSchema>>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      timezone: queryStates.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  // Extract values we'll use in memos
  const timezone = form.watch('timezone');
  const date = form.watch('date');
  const startTime = form.watch('startTime');
  const currentStep = queryStates.step;

  // All memoized values
  const validTimesInTimezone = React.useMemo(() => {
    return validTimes.map((utcDate) => {
      const zonedDate = toZonedTime(utcDate, timezone);
      const displayTime = formatInTimeZone(utcDate, timezone, use24Hour ? 'HH:mm' : 'h:mm a');
      const localDateOnly = startOfDay(zonedDate);

      return {
        utcDate,
        localDate: zonedDate,
        localDateOnly,
        displayTime,
      };
    });
  }, [validTimes, timezone, use24Hour]);

  const timesByDate = React.useMemo(() => {
    return validTimesInTimezone.reduce(
      (acc, time) => {
        const dateKey = time.localDateOnly.toISOString();
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(time);
        return acc;
      },
      {} as Record<string, typeof validTimesInTimezone>,
    );
  }, [validTimesInTimezone]);

  const availableTimezones = React.useMemo(() => Intl.supportedValuesOf('timeZone'), []);

  const formattedTimezones = React.useMemo(() => {
    return availableTimezones.map((timezone) => ({
      value: timezone,
      label: `${timezone.replace('_', ' ').replace('/', ' - ')} (${formatTimezoneOffset(timezone)})`,
    }));
  }, [availableTimezones]);

  const onSubmit = React.useCallback(
    async (values: z.infer<typeof meetingFormSchema>) => {
      if (currentStep === '3' && price > 0) {
        return;
      }

      try {
        const data = await createMeeting({
          ...values,
          eventId,
          clerkUserId,
        });

        if (data?.error) {
          form.setError('root', {
            message: 'There was an error saving your event',
          });
        } else {
          const startTimeISO = values.startTime.toISOString();
          router.push(
            `${window.location.pathname}/success?startTime=${encodeURIComponent(startTimeISO)}`,
          );
        }
      } catch (error) {
        console.error('Error creating meeting:', error);
        form.setError('root', {
          message: 'There was an error saving your event',
        });
      }
    },
    [currentStep, price, eventId, clerkUserId, form, router],
  );

  const handleNextStep = React.useCallback(
    async (nextStep: typeof currentStep) => {
      setIsSubmitting(true);

      try {
        if (nextStep !== '3') {
          setQueryStates({ step: nextStep });
          return;
        }

        // Handle step 3
        if (price === 0) {
          await form.handleSubmit(onSubmit)();
          return;
        }

        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            price,
            username,
            eventSlug,
            meetingData: {
              ...form.getValues(),
              clerkUserId,
              startTime: form.getValues('startTime')?.toISOString(),
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create checkout session');
        }

        const { url } = await response.json();
        if (url) {
          // Use router.push for client-side navigation when possible
          // For external URLs (like Stripe), we still need to use window.location
          if (url.startsWith('/') || url.startsWith(window.location.origin)) {
            router.push(url);
          } else {
            window.location.href = url;
          }
        }
      } catch (error) {
        console.error('Error:', error);
        form.setError('root', {
          message: 'Failed to process request',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, price, eventId, clerkUserId, onSubmit, setQueryStates, username, eventSlug, router],
  );

  // Effects
  React.useEffect(() => {
    if (!validTimes.length || queryStates.date) return;

    const firstAvailableTime = validTimes[0];
    const zonedTime = toZonedTime(firstAvailableTime, form.getValues('timezone'));
    const localDate = startOfDay(zonedTime);

    form.setValue('date', localDate);
    setQueryStates({ date: localDate });
  }, [validTimes, queryStates.date, form, setQueryStates]);

  React.useEffect(() => {
    const checkCalendarAccess = async () => {
      try {
        const hasValidAccess = await hasValidTokens(clerkUserId);

        if (!hasValidAccess) {
          setIsCalendarSynced(false);
          router.push(
            `/settings/calendar?redirect=${encodeURIComponent(window.location.pathname)}`,
          );
        }
      } catch (error) {
        console.error('Error checking calendar access:', error);
        setIsCalendarSynced(false);
        router.push(`/settings/calendar?redirect=${encodeURIComponent(window.location.pathname)}`);
      }
    };

    checkCalendarAccess();
  }, [clerkUserId, router]);

  // Early return for calendar sync check
  if (!isCalendarSynced) {
    return (
      <div className="py-8 text-center">
        <h2 className="mb-4 text-lg font-semibold">Calendar Sync Required</h2>
        <p className="mb-4 text-muted-foreground">
          We need access to your Google Calendar to show available time slots.
        </p>
        <Button
          onClick={() =>
            router.push(
              `/settings/calendar?redirect=${encodeURIComponent(window.location.pathname)}`,
            )
          }
        >
          Connect Google Calendar
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form className="space-y-6">
        <div className="mb-8 rounded-lg border bg-background/50 p-6">
          <h1 className="mb-4 text-2xl font-bold">Book a video call: {eventName}</h1>

          <div className="mb-4">
            <h2 className="text-md mb-2 font-semibold">What to Expect:</h2>
            <ul className="space-y-1 text-muted-foreground">
              {eventDetails?.expectations?.map((item) => (
                <li key={item} className="flex items-start">
                  <span className="mr-2 mt-1 text-xs">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {eventDetails?.idealFor && (
            <div className="mb-4">
              <h2 className="text-md mb-2 font-semibold">Ideal for:</h2>
              <ul className="space-y-1 text-muted-foreground">
                {eventDetails.idealFor.map((item) => (
                  <li key={item} className="flex items-start">
                    <span className="mr-2 mt-1 text-xs">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex items-center gap-4 border-t pt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{eventDetails?.duration || 60} minutes</span>
            </div>
            {price > 0 && (
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4" />
                <span>€{price.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="mb-6 flex items-center">
          <div className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${currentStep === '1' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              1
            </div>
            <span
              className={`ml-2 ${currentStep === '1' ? 'font-medium' : 'text-muted-foreground'}`}
            >
              Select Date & Time
            </span>
          </div>
          <div className="mx-2 h-0.5 w-6 bg-muted" />
          <div className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${currentStep === '2' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              2
            </div>
            <span
              className={`ml-2 ${currentStep === '2' ? 'font-medium' : 'text-muted-foreground'}`}
            >
              Your Information
            </span>
          </div>
          {price > 0 && (
            <>
              <div className="mx-2 h-0.5 w-6 bg-muted" />
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${currentStep === '3' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  3
                </div>
                <span
                  className={`ml-2 ${currentStep === '3' ? 'font-medium' : 'text-muted-foreground'}`}
                >
                  Payment
                </span>
              </div>
            </>
          )}
        </div>
        {currentStep === '1' ? (
          <>
            <div className="grid gap-8 md:grid-cols-[minmax(auto,450px),350px]">
              <div className="rounded-lg border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Select a Date</h2>
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem className="flex-shrink-0">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 w-60 border-0 text-sm shadow-none">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                <SelectValue placeholder={timezone.replace('_', ' ')} />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {formattedTimezones.map((timezone) => (
                              <SelectItem
                                key={timezone.value}
                                value={timezone.value}
                                className="text-sm"
                              >
                                {timezone.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          if (date) {
                            setQueryStates({ date });
                          }
                        }}
                        disabled={(date) => {
                          if (!date) return true;
                          const dateKey = startOfDay(date).toISOString();
                          return !timesByDate[dateKey];
                        }}
                        showOutsideDays={false}
                        fixedWeeks
                        className="relative w-full rounded-md border p-4"
                        classNames={{
                          months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                          month: 'space-y-4 w-full',
                          month_caption: 'flex justify-start pt-1 relative items-center gap-1',
                          caption_label: 'text-lg font-semibold',
                          dropdowns: 'flex gap-1',
                          nav: 'flex items-center gap-1 absolute right-2 top-1 z-10',
                          button_previous:
                            'h-9 w-9 bg-transparent p-0 hover:opacity-100 opacity-75 relative',
                          button_next:
                            'h-9 w-9 bg-transparent p-0 hover:opacity-100 opacity-75 relative ml-1',
                          month_grid: 'w-full border-collapse',
                          weekdays: 'flex w-full',
                          weekday: 'h-6 w-14 font-normal text-sm text-muted-foreground uppercase',
                          week: 'flex w-full',
                          day: 'h-14 w-14 relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md [&:has([aria-selected])]:rounded-md',
                          day_button:
                            'text-center h-14 w-14 p-0 font-normal text-base aria-selected:opacity-100 hover:bg-eleva-neutral-100 hover:text-eleva-neutral-900 transition-colors duration-200',
                          range_start: 'day-range-start',
                          range_end: 'day-range-end',
                          selected:
                            'bg-eleva-primary text-white hover:bg-eleva-primary hover:text-white focus:bg-eleva-primary focus:text-white after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-white',
                          today: 'border-2 border-eleva-primary text-eleva-primary font-medium',
                          outside:
                            'text-eleva-neutral-200 hover:bg-transparent hover:cursor-default aria-selected:bg-eleva-neutral-100/30 aria-selected:text-eleva-neutral-200',
                          disabled:
                            'text-eleva-neutral-200/50 hover:bg-transparent hover:cursor-not-allowed line-through',
                          hidden: 'invisible',
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {date ? format(date, 'EEEE, MMMM d') : 'Available Times'}
                  </h2>
                  <div className="flex rounded-full bg-muted p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'rounded-full px-4 text-sm font-normal',
                        !use24Hour
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-transparent hover:text-foreground',
                      )}
                      onClick={() => setUse24Hour(false)}
                    >
                      12h
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'rounded-full px-4 text-sm font-normal',
                        use24Hour
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-transparent hover:text-foreground',
                      )}
                      onClick={() => setUse24Hour(true)}
                    >
                      24h
                    </Button>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <div
                        className="grid gap-2 overflow-y-auto pr-4"
                        style={{
                          maxHeight: 'calc(450px - 3rem)',
                          scrollbarGutter: 'stable',
                        }}
                      >
                        {date &&
                          timesByDate[startOfDay(date).toISOString()]?.map(
                            ({ utcDate, displayTime }) => (
                              <Button
                                key={utcDate.toISOString()}
                                type="button"
                                variant="outline"
                                className={cn(
                                  'h-12 justify-center text-center text-base font-normal',
                                  field.value?.toISOString() === utcDate.toISOString()
                                    ? 'border-primary bg-primary/5 font-medium text-primary'
                                    : 'hover:border-primary/50',
                                )}
                                onClick={() => {
                                  field.onChange(utcDate);
                                  setQueryStates({ time: utcDate });
                                  handleNextStep('2');
                                }}
                              >
                                {displayTime}
                              </Button>
                            ),
                          )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </>
        ) : currentStep === '2' ? (
          <>
            <div className="rounded-lg border p-6">
              <div className="mb-6">
                <h2 className="mb-3 text-xl font-semibold">Confirm your meeting details</h2>
                <div className="flex flex-col gap-1 rounded-md bg-muted/50 p-3 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{date && format(date, 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {startTime &&
                        formatInTimeZone(startTime, timezone, use24Hour ? 'HH:mm' : 'h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>{timezone.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="guestName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Your Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setQueryStates({ name: e.target.value });
                          }}
                          placeholder="Enter your full name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guestEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Your Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setQueryStates({ email: e.target.value });
                          }}
                          placeholder="you@example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guestNotes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold">Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Share anything that will help prepare for our meeting..."
                          className="min-h-32"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-6 flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQueryStates({ step: '1' })}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button type="button" onClick={() => handleNextStep('3')} disabled={isSubmitting}>
                  {price > 0 ? 'Continue to Payment' : 'Schedule Meeting'}
                  {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div>Redirecting to payment...</div>
        )}
      </form>
    </Form>
  );
}

export function MeetingForm(props: MeetingFormProps) {
  return (
    <Suspense fallback={<div>Loading meeting form...</div>}>
      <MeetingFormContent {...props} />
    </Suspense>
  );
}
