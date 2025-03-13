'use client';

import * as React from 'react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/molecules/form';
import { BookingLayout } from '@/components/organisms/BookingLayout';
import { hasValidTokens } from '@/lib/googleCalendarClient';
import { cn } from '@/lib/utils';
import { meetingFormSchema } from '@/schema/meetings';
import { createMeeting } from '@/server/actions/meetings';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, startOfDay } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { CalendarIcon, Clock, Globe, Loader2 } from 'lucide-react';
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
  expertName?: string;
  expertImageUrl?: string;
  expertLocation?: string;
  eventTitle?: string;
  eventDescription?: string;
  eventDuration?: number;
  eventLocation?: string;
}

export function MeetingFormContent({
  validTimes,
  eventId,
  clerkUserId,
  price,
  username,
  eventSlug,
  expertName = 'Expert',
  expertImageUrl = '/placeholder-avatar.jpg',
  expertLocation,
  eventTitle = 'Consultation',
  eventDescription = 'Book a consultation session',
  eventDuration = 45,
  eventLocation = 'Google Meet',
}: MeetingFormProps) {
  const router = useRouter();

  // State management
  const use24Hour = false;
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

  // Simplify step transition
  const transitionToStep = React.useCallback(
    (nextStep: typeof currentStep) => {
      setQueryStates({ step: nextStep });
    },
    [setQueryStates],
  );

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
          transitionToStep(nextStep);
          setIsSubmitting(false);
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
    [form, price, eventId, clerkUserId, onSubmit, username, eventSlug, router, transitionToStep],
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

  // Handle date selection
  const handleDateSelect = (selectedDate: Date) => {
    form.setValue('date', selectedDate);
    setQueryStates({ date: selectedDate });
  };

  // Handle time selection
  const handleTimeSelect = (selectedTime: Date) => {
    form.setValue('startTime', selectedTime);
    setQueryStates({ time: selectedTime });
    handleNextStep('2'); // Automatically move to step 2 when time is selected
  };

  // Handle timezone change
  const handleTimezoneChange = (newTimezone: string) => {
    form.setValue('timezone', newTimezone);
    setQueryStates({ timezone: newTimezone });
  };

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

  // Content for Step 2
  const Step2Content = () => (
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
              {startTime && formatInTimeZone(startTime, timezone, use24Hour ? 'HH:mm' : 'h:mm a')}
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
                    const value = e.target.value;
                    field.onChange(value);
                    setQueryStates((prev) => ({ ...prev, name: value }));
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
                    const value = e.target.value;
                    field.onChange(value);
                    setQueryStates((prev) => ({ ...prev, email: value }));
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
          onClick={() => handleNextStep('1')}
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
  );

  // Content for Step 3
  const Step3Content = () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-lg font-medium">Redirecting to payment...</p>
      </div>
    </div>
  );

  return (
    <Form {...form}>
      <form className="space-y-6">
        <div className="mb-6 flex w-full flex-wrap items-center justify-center gap-4">
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
          <div className="mx-1 h-0.5 w-4 bg-muted md:mx-2 md:w-6" />
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
              <div className="mx-1 h-0.5 w-4 bg-muted md:mx-2 md:w-6" />
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

        <BookingLayout
          expert={{
            id: clerkUserId,
            name: expertName,
            imageUrl: expertImageUrl,
            location: expertLocation,
            username: username,
          }}
          event={{
            id: eventId,
            title: eventTitle,
            description: eventDescription,
            duration: eventDuration,
            price: price,
            location: eventLocation,
          }}
          validTimes={validTimes}
          onDateSelect={handleDateSelect}
          onTimeSlotSelect={handleTimeSelect}
          selectedDate={date}
          selectedTime={startTime}
          timezone={timezone}
          onTimezoneChange={handleTimezoneChange}
          showCalendar={currentStep === '1'}
        >
          {currentStep !== '1' && (
            <div>
              {currentStep === '2' && <Step2Content />}
              {currentStep === '3' && <Step3Content />}
            </div>
          )}
        </BookingLayout>
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
