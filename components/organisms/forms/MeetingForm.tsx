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
  const [checkoutUrl, setCheckoutUrl] = React.useState<string | null>(null);
  const [isPrefetching, setIsPrefetching] = React.useState(false);

  // Refs for input focus management
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const emailInputRef = React.useRef<HTMLInputElement>(null);
  const notesInputRef = React.useRef<HTMLTextAreaElement>(null);

  // Keep track of whether we are currently typing (to prevent URL updates while typing)
  const isTypingRef = React.useRef(false);

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

  // Form initialization with enhanced defaults from URL including date and time
  const form = useForm<z.infer<typeof meetingFormSchema>>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      timezone: queryStates.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      guestName: queryStates.name || '',
      guestEmail: queryStates.email || '',
      guestNotes: '', // Initialize with empty string
      // Initialize with date and time from URL if they exist
      ...(queryStates.date && { date: queryStates.date }),
      ...(queryStates.time && { startTime: queryStates.time }),
    },
    // Don't validate on mount to avoid confusion
    mode: 'onBlur',
  });

  // Extract values we'll use in memos
  const timezone = form.watch('timezone');
  const date = form.watch('date');
  const startTime = form.watch('startTime');
  const currentStep = queryStates.step;

  // Enhanced step transition with validation
  const transitionToStep = React.useCallback(
    (nextStep: typeof currentStep) => {
      // Special handling for transition to step 2
      if (nextStep === '2') {
        // Check that we have the required date and time
        const hasDate = !!form.getValues('date');
        const hasTime = !!form.getValues('startTime');

        if (!hasDate || !hasTime) {
          console.log('Cannot transition to step 2: missing date or time', {
            hasDate,
            hasTime,
            urlDate: !!queryStates.date,
            urlTime: !!queryStates.time,
          });

          // If we have date/time in the URL but not in form, synchronize them
          if (!hasDate && queryStates.date) {
            form.setValue('date', queryStates.date);
          }

          if (!hasTime && queryStates.time) {
            form.setValue('startTime', queryStates.time);
          }

          // If we still don't have all required values, stay on step 1
          if (!form.getValues('date') || !form.getValues('startTime')) {
            setQueryStates({ step: '1' });
            return;
          }
        }
      }

      // Update the step in the URL
      setQueryStates({ step: nextStep });
    },
    [setQueryStates, form, queryStates.date, queryStates.time],
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

  // Function to create or get payment intent
  const createPaymentIntent = React.useCallback(async (): Promise<string | null> => {
    try {
      // If we already have a checkout URL, return it
      if (checkoutUrl) return checkoutUrl;

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
        setCheckoutUrl(url);
        return url;
      }
      return null;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return null;
    }
  }, [checkoutUrl, eventId, price, username, eventSlug, form, clerkUserId]);

  // Prefetch checkout URL when step 2 is filled out
  React.useEffect(() => {
    // Only prefetch if we're on step 2, have complete valid form data, price > 0, and not already fetched
    const hasCompletedForm =
      form.getValues('guestName')?.length > 2 &&
      form.getValues('guestEmail')?.length > 5 &&
      form.getValues('guestEmail').includes('@');

    const canPrefetch =
      currentStep === '2' && hasCompletedForm && price > 0 && !checkoutUrl && !isPrefetching;

    if (canPrefetch) {
      // Prefetch with a longer delay to avoid interfering with user typing
      const timer = setTimeout(() => {
        // Don't show UI indication during prefetch - do it silently
        setIsPrefetching(true);
        createPaymentIntent()
          .then(() => {
            // Successfully prefetched
            console.log('Checkout URL prefetched successfully');
          })
          .catch((error) => {
            // Prefetch failed, but we don't need to show an error to the user
            console.error('Prefetch failed:', error);
          })
          .finally(() => {
            setIsPrefetching(false);
          });
      }, 3000); // 3-second delay after user completes form

      return () => clearTimeout(timer);
    }
  }, [currentStep, form, price, checkoutUrl, isPrefetching, createPaymentIntent]);

  // Handle next step with improved checkout flow
  const handleNextStep = React.useCallback(
    async (nextStep: typeof currentStep) => {
      // If not going to step 3, just transition
      if (nextStep !== '3') {
        transitionToStep(nextStep);
        return;
      }

      // For free sessions, handle differently
      if (price === 0) {
        setIsSubmitting(true);
        try {
          await form.handleSubmit(onSubmit)();
        } catch (error) {
          console.error('Error submitting form:', error);
          form.setError('root', {
            message: 'Failed to process request',
          });
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      // For paid sessions
      setIsSubmitting(true);
      try {
        // First move to step 3 immediately to show loading
        transitionToStep('3');

        // Then get or create checkout URL
        const url = await createPaymentIntent();

        if (url) {
          // Keep loading state active until navigation
          if (url.startsWith('/') || url.startsWith(window.location.origin)) {
            router.push(url);
          } else {
            window.location.href = url;
          }
        } else {
          throw new Error('Failed to get checkout URL');
        }
      } catch (error) {
        console.error('Error:', error);
        form.setError('root', {
          message: 'Failed to process request',
        });
        // Go back to step 2 on error
        transitionToStep('2');
        setIsSubmitting(false);
      }
    },
    [form, price, createPaymentIntent, onSubmit, router, transitionToStep],
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

  // Effect to sync form values with query params when they change
  React.useEffect(() => {
    // Skip if we're currently typing to avoid focus issues
    if (isTypingRef.current) return;

    // Synchronize name and email
    if (queryStates.name) {
      const currentName = form.getValues('guestName');
      if (queryStates.name !== currentName) {
        form.setValue('guestName', queryStates.name, {
          shouldValidate: false,
          shouldDirty: true,
          shouldTouch: false, // Prevents focus issues
        });
      }
    }

    if (queryStates.email) {
      const currentEmail = form.getValues('guestEmail');
      if (queryStates.email !== currentEmail) {
        form.setValue('guestEmail', queryStates.email, {
          shouldValidate: false,
          shouldDirty: true,
          shouldTouch: false, // Prevents focus issues
        });
      }
    }

    // Synchronize date and time - critical for returning from checkout or refresh
    if (queryStates.date) {
      const currentDate = form.getValues('date');
      const dateChanged = !currentDate || currentDate.getTime() !== queryStates.date.getTime();

      if (dateChanged) {
        console.log('Restoring date from URL:', queryStates.date);
        form.setValue('date', queryStates.date, {
          shouldValidate: false,
          shouldDirty: true,
        });
      }
    }

    if (queryStates.time) {
      const currentTime = form.getValues('startTime');
      const timeChanged = !currentTime || currentTime.getTime() !== queryStates.time.getTime();

      if (timeChanged) {
        console.log('Restoring time from URL:', queryStates.time);
        form.setValue('startTime', queryStates.time, {
          shouldValidate: false,
          shouldDirty: true,
        });
      }
    }
  }, [queryStates.name, queryStates.email, queryStates.date, queryStates.time, form]);

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

  // Add a debounced URL update function to avoid constant re-renders while typing
  const debouncedUpdateUrl = React.useCallback(() => {
    // Only run if we're on the contact info step
    if (currentStep !== '2') return;

    // Get current form values
    const formValues = form.getValues();
    const name = formValues.guestName?.trim();
    const email = formValues.guestEmail?.trim();

    // Only update URL if we have meaningful content
    if (name && name.length > 1) {
      setQueryStates((prev) => ({ ...prev, name }));
    }

    if (email && email.length > 3) {
      setQueryStates((prev) => ({ ...prev, email }));
    }
  }, [currentStep, form, setQueryStates]);

  // Enhanced focus management for input fields
  const [activeFieldId, setActiveFieldId] = React.useState<string | null>(null);

  // Effect to auto-focus name input field when step 2 is shown
  React.useEffect(() => {
    if (currentStep === '2' && nameInputRef.current) {
      // Set initial focus with a small delay to ensure the UI is ready
      setTimeout(() => {
        nameInputRef.current?.focus();
        setActiveFieldId('guestName');
      }, 100);
    }
  }, [currentStep]);

  // Function to restore focus when it might be lost
  const restoreFocus = React.useCallback(() => {
    if (activeFieldId === 'guestName' && nameInputRef.current) {
      nameInputRef.current.focus();
    } else if (activeFieldId === 'guestEmail' && emailInputRef.current) {
      emailInputRef.current.focus();
    } else if (activeFieldId === 'guestNotes' && notesInputRef.current) {
      notesInputRef.current.focus();
    }
  }, [activeFieldId]);

  // Restore focus after any state updates that might cause focus loss
  React.useEffect(() => {
    if (activeFieldId && currentStep === '2') {
      const timerId = setTimeout(restoreFocus, 0);
      return () => clearTimeout(timerId);
    }
  }, [activeFieldId, currentStep, restoreFocus]);

  // Modify the debounce behavior to prevent focus issues on the first keystroke
  const updateUrlDebounced = React.useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let isFirstKeystroke = true;

    return () => {
      // Clear previous timer
      if (timer) clearTimeout(timer);

      // For the first keystroke, use a longer delay and don't set the typing flag
      // This prevents focus issues when starting to type
      if (isFirstKeystroke) {
        isFirstKeystroke = false;
        timer = setTimeout(() => {
          debouncedUpdateUrl();
          // Reset first keystroke flag after a while
          setTimeout(() => {
            isFirstKeystroke = true;
          }, 5000); // Reset after 5 seconds of inactivity
        }, 2000); // Extra long delay for first keystroke
        return;
      }

      // After first keystroke, use normal debounce with typing flag
      isTypingRef.current = true;
      timer = setTimeout(() => {
        isTypingRef.current = false;
        debouncedUpdateUrl();
      }, 1500);
    };
  }, [debouncedUpdateUrl]);

  // Subscribe to form changes to update URL params in a controlled manner but skip first keystroke
  React.useEffect(() => {
    // Track the last values we've seen to avoid unnecessary updates
    const lastValues = {
      guestName: form.getValues('guestName'),
      guestEmail: form.getValues('guestEmail'),
    };

    const skipFirstKeystroke = {
      guestName: true,
      guestEmail: true,
    };

    const subscription = form.watch((value, { name }) => {
      // Only process for fields we care about
      if (name !== 'guestName' && name !== 'guestEmail') return;

      // Only run if we're on step 2
      if (currentStep !== '2') return;

      // Handle name/email updates for URL syncing
      if (name === 'guestName' && value.guestName) {
        // Skip very first keystroke for each field to avoid focus loss
        if (skipFirstKeystroke.guestName) {
          if (value.guestName.length === 1 && lastValues.guestName === '') {
            skipFirstKeystroke.guestName = false;
            lastValues.guestName = value.guestName;
            return; // Skip further processing
          }
        }

        if (value.guestName !== lastValues.guestName) {
          lastValues.guestName = value.guestName;
          updateUrlDebounced();
        }
      }

      if (name === 'guestEmail' && value.guestEmail) {
        // Skip very first keystroke for each field
        if (skipFirstKeystroke.guestEmail) {
          if (value.guestEmail.length === 1 && lastValues.guestEmail === '') {
            skipFirstKeystroke.guestEmail = false;
            lastValues.guestEmail = value.guestEmail;
            return; // Skip further processing
          }
        }

        if (value.guestEmail !== lastValues.guestEmail) {
          lastValues.guestEmail = value.guestEmail;
          updateUrlDebounced();
        }
      }
    });

    // Cleanup function
    return () => subscription.unsubscribe();
  }, [form, currentStep, updateUrlDebounced]);

  // Reset the form completely when URL parameters change drastically
  // This helps with shared URLs where all parameters change at once
  React.useEffect(() => {
    // Only run this when NOT typing to prevent focus issues
    if (isTypingRef.current) return;

    // Check if this looks like a completely new set of parameters
    // Only reset if multiple parameters changed at once
    const changesCount = [
      queryStates.name !== form.getValues('guestName') && !!queryStates.name,
      queryStates.email !== form.getValues('guestEmail') && !!queryStates.email,
      queryStates.timezone !== form.getValues('timezone') && !!queryStates.timezone,
    ].filter(Boolean).length;

    // If multiple parameters changed at once, this is likely a shared URL
    if (changesCount >= 2) {
      console.log('Resetting form with URL parameters', queryStates);

      // Reset the form with the new values
      form.reset({
        timezone: queryStates.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        guestName: queryStates.name || '',
        guestEmail: queryStates.email || '',
        guestNotes: form.getValues('guestNotes'), // Preserve notes
        // Use date and time from URL parameters if available, otherwise preserve current values
        date: queryStates.date || form.getValues('date'),
        startTime: queryStates.time || form.getValues('startTime'),
      });
    }
  }, [queryStates, form]);

  // Validate required data for the current step
  React.useEffect(() => {
    if (currentStep === '2') {
      const hasDate = !!form.getValues('date');
      const hasTime = !!form.getValues('startTime');

      // If we're on step 2 but missing date or time, go back to step 1
      if (!hasDate || !hasTime) {
        console.log('Step 2 requires date and time selection:', { hasDate, hasTime });

        // Check if we have these values in the URL params
        if (queryStates.date && queryStates.time) {
          // Apply the values from URL
          form.setValue('date', queryStates.date);
          form.setValue('startTime', queryStates.time);
        } else {
          // Go back to step 1 to select date and time
          transitionToStep('1');
        }
      }
    }
  }, [currentStep, queryStates.date, queryStates.time, form, transitionToStep]);

  // Log the form and URL state for debugging (outside of useEffect to avoid dependency issues)
  console.log('MeetingForm rendering with state:', {
    urlParameters: {
      step: queryStates.step,
      date: queryStates.date ? queryStates.date.toISOString() : null,
      time: queryStates.time ? queryStates.time.toISOString() : null,
      name: queryStates.name,
      email: queryStates.email,
    },
    formValues: {
      date: form.getValues('date') ? form.getValues('date').toISOString() : null,
      startTime: form.getValues('startTime') ? form.getValues('startTime').toISOString() : null,
      guestName: form.getValues('guestName'),
      guestEmail: form.getValues('guestEmail'),
    },
  });

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
  const Step2Content = () => {
    // Get values directly from form, not just watched values
    // This ensures we have access to them after refresh
    const currentDate = form.getValues('date');
    const currentTime = form.getValues('startTime');
    const currentTimezone = form.getValues('timezone');

    // If date or time is missing but present in URL, try to use those
    const displayDate = currentDate || queryStates.date;
    const displayTime = currentTime || queryStates.time;

    // No need for the effect here - we'll handle this in the main component function

    return (
      <div className="rounded-lg border p-6">
        <div className="mb-6">
          <h2 className="mb-3 text-xl font-semibold">Confirm your meeting details</h2>
          <div className="flex flex-col gap-1 rounded-md bg-muted/50 p-3 text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span>
                {displayDate ? (
                  format(displayDate, 'EEEE, MMMM d, yyyy')
                ) : (
                  <em className="text-red-500">Date not selected</em>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {displayTime ? (
                  formatInTimeZone(
                    displayTime,
                    currentTimezone || timezone,
                    use24Hour ? 'HH:mm' : 'h:mm a',
                  )
                ) : (
                  <em className="text-red-500">Time not selected</em>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>{(currentTimezone || timezone).replace('_', ' ')}</span>
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
                    ref={nameInputRef}
                    placeholder="Enter your full name"
                    onFocus={() => setActiveFieldId('guestName')}
                    onBlur={(e) => {
                      // Only clear active field if we're not clicking within the same form
                      // This prevents losing focus when clicking on a different part of the input
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        // Small delay to allow potential click events to finish
                        setTimeout(() => {
                          if (document.activeElement !== nameInputRef.current) {
                            setActiveFieldId(null);
                          }
                        }, 50);
                      }
                    }}
                    className="focus:z-10" // Ensure focused element is on top
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
                    ref={emailInputRef}
                    placeholder="you@example.com"
                    onFocus={() => setActiveFieldId('guestEmail')}
                    onBlur={(e) => {
                      // Only clear active field if we're not clicking within the same form
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        // Small delay to allow potential click events to finish
                        setTimeout(() => {
                          if (document.activeElement !== emailInputRef.current) {
                            setActiveFieldId(null);
                          }
                        }, 50);
                      }
                    }}
                    className="focus:z-10" // Ensure focused element is on top
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
                    ref={notesInputRef}
                    placeholder="Share anything that will help prepare for our meeting..."
                    className="min-h-32 focus:z-10"
                    onFocus={() => setActiveFieldId('guestNotes')}
                    onBlur={(e) => {
                      // Only clear active field if we're not clicking within the same form
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        // Small delay to allow potential click events to finish
                        setTimeout(() => {
                          if (document.activeElement !== notesInputRef.current) {
                            setActiveFieldId(null);
                          }
                        }, 50);
                      }
                    }}
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
          <Button
            type="button"
            onClick={() => handleNextStep('3')}
            disabled={isSubmitting}
            className="relative"
          >
            {price > 0 ? 'Continue to Payment' : 'Schedule Meeting'}
            {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </Button>
        </div>
      </div>
    );
  };

  // Content for Step 3
  const Step3Content = () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-lg font-medium">
          {checkoutUrl ? 'Redirecting to payment...' : 'Preparing checkout...'}
        </p>
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
