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
import { Globe } from 'lucide-react';
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
};

function MeetingFormContent({
  validTimes,
  eventId,
  clerkUserId,
  price,
  username,
  eventSlug,
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
        {currentStep === '1' ? (
          <>
            <div className="grid gap-8 md:grid-cols-[minmax(auto,800px),300px]">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <FormLabel className="text-lg font-semibold">Select a Date</FormLabel>
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem className="flex-shrink-0">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-70 h-9 border-0 text-sm shadow-none">
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
                          setQueryStates({ date });
                        }}
                        disabled={(date) => {
                          const dateKey = startOfDay(date).toISOString();
                          return !timesByDate[dateKey];
                        }}
                        showOutsideDays={false}
                        showYearSwitcher={false}
                        fixedWeeks
                        className="!w-full"
                        monthsClassName="space-y-4"
                        weekdayClassName="w-14 text-sm font-normal text-muted-foreground"
                        dayClassName="flex h-14 w-14 items-center justify-center p-0 text-sm"
                        dayButtonClassName="h-12 w-12 rounded-md p-0 font-normal hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-0 disabled:opacity-50"
                        selectedClassName="[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground"
                        todayClassName="[&>button]:bg-accent/10"
                        captionClassName="relative flex h-7 items-center px-2 mb-4"
                        captionLabelClassName="text-lg font-medium"
                        navClassName="absolute right-2 flex items-center gap-1"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <FormLabel className="text-lg font-semibold">
                    {date ? format(date, 'EE, MMM d') : 'Available Times'}
                  </FormLabel>
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
                          maxHeight: 'calc(470px - 3rem)', // Increased height
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
                                  'h-12 justify-center text-center text-base',
                                  field.value?.toISOString() === utcDate.toISOString()
                                    ? 'border-primary bg-primary/5 font-medium'
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
            <div className="mb-8">
              <h2 className="mb-2 text-lg font-semibold">Confirm your meeting details</h2>
              <p className="text-muted-foreground">
                {date && format(date, 'EEEE, MMMM d')} at{' '}
                {startTime && formatInTimeZone(startTime, timezone, use24Hour ? 'HH:mm' : 'h:mm a')}
              </p>
            </div>

            <div className="flex flex-col gap-4 md:flex-row">
              <FormField
                control={form.control}
                name="guestName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="font-semibold">Your Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setQueryStates({ name: e.target.value });
                        }}
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
                  <FormItem className="flex-1">
                    <FormLabel className="font-semibold">Your Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setQueryStates({ email: e.target.value });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="guestNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">Notes</FormLabel>
                  <FormControl>
                    <Textarea className="resize-none rounded-md border" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQueryStates({ step: '1' })}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button type="button" onClick={() => handleNextStep('3')} disabled={isSubmitting}>
                {isSubmitting
                  ? 'Processing...'
                  : price === 0
                    ? 'Confirm Booking'
                    : 'Continue to Payment'}
              </Button>
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
