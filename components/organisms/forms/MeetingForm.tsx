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
import { Calendar as CalendarIcon, Check, Clock, Globe, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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

interface MeetingFormProps {
  validTimes: Date[];
  eventId: string;
  clerkUserId: string;
  price: number;
  username: string;
  eventSlug: string;
}

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
          className="bg-eleva-primary text-white hover:bg-eleva-primary/80"
        >
          Connect Google Calendar
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form className="booking-interface">
        {/* Left sidebar with step indicators */}
        <div className="hidden flex-col space-y-1 border-r border-eleva-neutral-200 bg-eleva-neutral-100 p-6 md:flex">
          <div className="mb-6">
            <h2 className="mb-1 text-xl font-semibold text-eleva-primary">Book Your Session</h2>
            <p className="text-sm text-eleva-neutral-900/70">
              Select a date and time that works best for you
            </p>
          </div>

          {/* Step indicators */}
          <div className="mt-6 space-y-4">
            <div className="step-indicator">
              <div
                className={cn(
                  'step-indicator-circle',
                  currentStep === '1'
                    ? 'active'
                    : Number.parseInt(currentStep) > 1
                      ? 'completed'
                      : 'inactive',
                )}
              >
                {Number.parseInt(currentStep) > 1 ? <Check className="h-4 w-4" /> : '1'}
              </div>
              <span
                className={cn(
                  'step-indicator-text',
                  currentStep === '1'
                    ? 'active'
                    : Number.parseInt(currentStep) > 1
                      ? 'completed'
                      : 'inactive',
                )}
              >
                Date & Time
              </span>
            </div>
            <div className="step-indicator">
              <div
                className={cn(
                  'step-indicator-circle',
                  currentStep === '2'
                    ? 'active'
                    : Number.parseInt(currentStep) > 2
                      ? 'completed'
                      : 'inactive',
                )}
              >
                {Number.parseInt(currentStep) > 2 ? <Check className="h-4 w-4" /> : '2'}
              </div>
              <span
                className={cn(
                  'step-indicator-text',
                  currentStep === '2'
                    ? 'active'
                    : Number.parseInt(currentStep) > 2
                      ? 'completed'
                      : 'inactive',
                )}
              >
                Your Details
              </span>
            </div>
            {price > 0 && (
              <div className="step-indicator">
                <div
                  className={cn(
                    'step-indicator-circle',
                    currentStep === '3' ? 'active' : 'inactive',
                  )}
                >
                  3
                </div>
                <span
                  className={cn('step-indicator-text', currentStep === '3' ? 'active' : 'inactive')}
                >
                  Payment
                </span>
              </div>
            )}
          </div>

          {/* Meeting summary info */}
          {(date || startTime) && (
            <div className="mt-auto pt-6">
              <h3 className="mb-2 text-sm font-medium text-eleva-neutral-900">Session Summary</h3>
              <div className="space-y-2 rounded-md border border-eleva-neutral-200 bg-white p-4">
                {date && (
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="h-4 w-4 text-eleva-primary" />
                    <span>{format(date, 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                )}
                {startTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-eleva-primary" />
                    <span>
                      {formatInTimeZone(startTime, timezone, use24Hour ? 'HH:mm' : 'h:mm a')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-eleva-primary" />
                  <span>{timezone.replace('_', ' ')}</span>
                </div>
                {price > 0 && (
                  <div className="mt-2 flex items-center gap-2 border-t border-eleva-neutral-200 pt-2 text-sm font-medium">
                    <span>Price:</span>
                    <span className="text-eleva-primary">${price.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content area with step content */}
        <div className="bg-white p-4 md:p-6">
          {/* Mobile step indicator */}
          <div className="mb-6 flex items-center space-x-3 md:hidden">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                currentStep === '1'
                  ? 'bg-eleva-primary text-white'
                  : Number.parseInt(currentStep) > 1
                    ? 'border border-eleva-primary bg-eleva-primary/10 text-eleva-primary'
                    : 'bg-eleva-neutral-200/50 text-eleva-neutral-900/70',
              )}
            >
              {Number.parseInt(currentStep) > 1 ? <Check className="h-4 w-4" /> : '1'}
            </div>
            <div className="h-0.5 w-6 bg-eleva-neutral-200" />
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                currentStep === '2'
                  ? 'bg-eleva-primary text-white'
                  : Number.parseInt(currentStep) > 2
                    ? 'border border-eleva-primary bg-eleva-primary/10 text-eleva-primary'
                    : 'bg-eleva-neutral-200/50 text-eleva-neutral-900/70',
              )}
            >
              {Number.parseInt(currentStep) > 2 ? <Check className="h-4 w-4" /> : '2'}
            </div>
            {price > 0 && (
              <>
                <div className="h-0.5 w-6 bg-eleva-neutral-200" />
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    currentStep === '3'
                      ? 'bg-eleva-primary text-white'
                      : 'bg-eleva-neutral-200/50 text-eleva-neutral-900/70',
                  )}
                >
                  3
                </div>
              </>
            )}
          </div>

          {/* Animated steps */}
          <AnimatePresence mode="wait">
            {currentStep === '1' && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{
                  duration: 0.3,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-eleva-neutral-900">
                    Select a date and time
                  </h2>
                  <p className="mt-1 text-sm text-eleva-neutral-900/70">
                    Choose from available time slots
                  </p>
                </div>

                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="flex-1 rounded-lg border border-eleva-neutral-200 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-base font-medium">Calendar</h3>
                      <FormField
                        control={form.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem className="flex-shrink-0">
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-9 w-60 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-eleva-primary" />
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
                            className="relative w-full rounded-md border p-3"
                            classNames={{
                              months:
                                'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                              month: 'space-y-4 w-full',
                              month_caption: 'flex justify-start pt-1 relative items-center gap-1',
                              caption_label: 'text-base font-medium',
                              dropdowns: 'flex gap-1',
                              nav: 'flex items-center gap-1 absolute right-2 top-1 z-10',
                              button_previous:
                                'h-8 w-8 bg-transparent p-0 hover:opacity-100 opacity-75 relative',
                              button_next:
                                'h-8 w-8 bg-transparent p-0 hover:opacity-100 opacity-75 relative ml-1',
                              month_grid: 'w-full border-collapse',
                              weekdays: 'flex w-full',
                              weekday:
                                'h-6 w-10 font-normal text-xs text-eleva-neutral-900/60 uppercase',
                              week: 'flex w-full',
                              day: 'h-10 w-10 relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md [&:has([aria-selected])]:rounded-md',
                              day_button:
                                'text-center h-10 w-10 p-0 font-normal text-sm aria-selected:opacity-100 hover:bg-eleva-neutral-100 hover:text-eleva-neutral-900 transition-colors duration-200',
                              range_start: 'day-range-start',
                              range_end: 'day-range-end',
                              selected:
                                'bg-eleva-primary text-white hover:bg-eleva-primary hover:text-white focus:bg-eleva-primary focus:text-white after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-white',
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

                  <div className="rounded-lg border border-eleva-neutral-200 p-4 lg:w-[240px]">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-base font-medium">
                        {date ? format(date, 'MMMM d') : 'Time Slots'}
                      </h3>
                      <div className="flex rounded-full bg-eleva-neutral-100 p-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'rounded-full px-3 text-xs',
                            !use24Hour
                              ? 'bg-white text-eleva-neutral-900 shadow-sm'
                              : 'text-eleva-neutral-900/60 hover:bg-transparent hover:text-eleva-neutral-900',
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
                            'rounded-full px-3 text-xs',
                            use24Hour
                              ? 'bg-white text-eleva-neutral-900 shadow-sm'
                              : 'text-eleva-neutral-900/60 hover:bg-transparent hover:text-eleva-neutral-900',
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
                            className="grid gap-2 overflow-y-auto pr-2"
                            style={{
                              maxHeight: 'calc(100vh - 300px)',
                              minHeight: '250px',
                              scrollbarGutter: 'stable',
                            }}
                          >
                            {date ? (
                              timesByDate[startOfDay(date).toISOString()]?.map(
                                ({ utcDate, displayTime }) => (
                                  <Button
                                    key={utcDate.toISOString()}
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                      'h-10 justify-center text-center text-sm font-normal',
                                      field.value?.toISOString() === utcDate.toISOString()
                                        ? 'border-eleva-primary bg-eleva-primary/5 font-medium text-eleva-primary'
                                        : 'hover:border-eleva-primary/50',
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
                              )
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center text-sm text-eleva-neutral-900/50">
                                <CalendarIcon className="mb-2 h-8 w-8 opacity-40" />
                                <p>Select a date first</p>
                              </div>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === '2' && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{
                  duration: 0.3,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-eleva-neutral-900">Your details</h2>
                  <p className="mt-1 text-sm text-eleva-neutral-900/70">
                    Please provide your information for the session
                  </p>
                </div>

                <div className="rounded-lg border border-eleva-neutral-200 p-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="guestName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-eleva-neutral-900">
                            Your Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setQueryStates({ name: e.target.value });
                              }}
                              placeholder="Enter your full name"
                              className="border-eleva-neutral-200 focus-visible:border-eleva-primary focus-visible:ring-eleva-primary"
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
                          <FormLabel className="font-medium text-eleva-neutral-900">
                            Your Email
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setQueryStates({ email: e.target.value });
                              }}
                              placeholder="you@example.com"
                              className="border-eleva-neutral-200 focus-visible:border-eleva-primary focus-visible:ring-eleva-primary"
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
                          <FormLabel className="font-medium text-eleva-neutral-900">
                            Additional Notes
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Share anything that will help prepare for our meeting..."
                              className="min-h-32 border-eleva-neutral-200 focus-visible:border-eleva-primary focus-visible:ring-eleva-primary"
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
                      className="border-eleva-neutral-200 text-eleva-neutral-900 hover:bg-eleva-neutral-100 hover:text-eleva-neutral-900"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleNextStep('3')}
                      disabled={isSubmitting}
                      className="bg-eleva-primary text-white hover:bg-eleva-primary/90"
                    >
                      {price > 0 ? 'Continue to Payment' : 'Schedule Meeting'}
                      {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === '3' && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{
                  duration: 0.3,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex min-h-[300px] flex-col items-center justify-center"
              >
                <div className="text-center">
                  <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-eleva-primary" />
                  <h2 className="text-xl font-semibold text-eleva-neutral-900">
                    Preparing payment...
                  </h2>
                  <p className="mt-2 text-sm text-eleva-neutral-900/70">
                    You&apos;ll be redirected to complete your payment shortly
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </Form>
  );
}

export function MeetingForm(props: MeetingFormProps) {
  return (
    <Suspense
      fallback={
        <div className="booking-interface flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-eleva-neutral-200 bg-white p-8">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-eleva-primary" />
          <p className="text-eleva-neutral-900/70">Loading meeting form...</p>
        </div>
      }
    >
      <MeetingFormContent {...props} />
    </Suspense>
  );
}
