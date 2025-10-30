'use client';

import * as React from 'react';
import { BookingLayout } from '@/components/features/booking/BookingLayout';
import { BookingLoadingSkeleton } from '@/components/features/booking/BookingLoadingSkeleton';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DEFAULT_AFTER_EVENT_BUFFER,
  DEFAULT_BEFORE_EVENT_BUFFER,
} from '@/lib/constants/scheduling';
import { hasValidTokens } from '@/lib/integrations/google/calendar';
import { generateFormCacheKey } from '@/lib/utils/cache-keys';
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
import { flushSync } from 'react-dom';
import { useForm, useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

// Stripe checkout URL validation
const ALLOWED_CHECKOUT_HOSTS = new Set(['checkout.stripe.com']);

/**
 * Validates a Stripe checkout URL
 * @param url - The URL to validate
 * @throws Error if the URL is invalid, not HTTPS, or not from an allowed host
 */
function validateCheckoutUrl(url: string): void {
  try {
    const urlObject = new URL(url);

    // Ensure HTTPS protocol
    if (urlObject.protocol !== 'https:') {
      throw new Error('Checkout URL must use HTTPS protocol');
    }

    // Ensure it's from an allowed host
    if (!ALLOWED_CHECKOUT_HOSTS.has(urlObject.hostname)) {
      throw new Error('Invalid checkout URL domain');
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Malformed checkout URL');
    }
    throw error;
  }
}

interface BlockedDate {
  id: number;
  date: Date;
  reason?: string;
  timezone: string;
}

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
  locale?: string;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  blockedDates?: BlockedDate[];
}

// Define the query state type for reuse
type QueryStates = {
  step: '1' | '2' | '3';
  date: Date | null;
  time: Date | null;
  name: string;
  email: string;
  timezone: string;
};

// Extract Step2Content as a separate component with props to reduce closure dependencies
interface Step2ContentProps {
  form: UseFormReturn<z.infer<typeof meetingFormSchema>>;
  queryStates: {
    date: Date | null;
    time: Date | null;
    timezone: string;
  };
  setQueryStates: (updater: (prev: QueryStates) => Partial<QueryStates>) => void;
  timezone: string;
  eventDuration: number;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  transitionToStep: (step: '1' | '2' | '3') => void;
  handleNextStep: (nextStep: '1' | '2' | '3') => Promise<void>;
  isSubmitting: boolean;
  isProcessing: boolean; // Use state for rendering
  isProcessingRef: React.MutableRefObject<boolean>; // Keep ref for event handler logic
  price: number;
  use24Hour: boolean;
  debugButtonClick: (action: string) => void;
}

const Step2Content = React.memo<Step2ContentProps>(
  ({
    form,
    queryStates,
    setQueryStates,
    timezone,
    eventDuration,
    beforeEventBuffer,
    afterEventBuffer,
    transitionToStep,
    handleNextStep,
    isSubmitting,
    isProcessing,
    isProcessingRef,
    price,
    use24Hour,
    debugButtonClick,
  }) => {
    // Get values directly from form for display
    const currentDate = form.getValues('date');
    const currentTime = form.getValues('startTime');
    const currentTimezone = form.getValues('timezone');

    // Use watched values or fallback to query states
    const displayDate = currentDate || queryStates.date;
    const displayTime = currentTime || queryStates.time;

    // Calculate total duration including buffer times
    const totalDuration = eventDuration + beforeEventBuffer + afterEventBuffer;
    const hasBufferTime = beforeEventBuffer > 0 || afterEventBuffer > 0;

    // Memoize updateURLOnBlur with proper dependencies
    const updateURLOnBlur = React.useCallback(() => {
      const name = form.getValues('guestName')?.trim();
      const email = form.getValues('guestEmail')?.trim();

      const updates: Record<string, string | undefined> = {};
      if (name) updates.name = name;
      if (email) updates.email = email;

      if (Object.keys(updates).length > 0) {
        setQueryStates((prev) => ({ ...prev, ...updates }));
      }
    }, [form, setQueryStates]);

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
            {hasBufferTime && (
              <div className="mt-2 text-sm">
                <p>Total time blocked: {totalDuration} minutes</p>
                {beforeEventBuffer > 0 && (
                  <p className="text-xs">({beforeEventBuffer} min buffer before)</p>
                )}
                {afterEventBuffer > 0 && (
                  <p className="text-xs">({afterEventBuffer} min buffer after)</p>
                )}
              </div>
            )}
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
                    placeholder="Enter your full name"
                    {...field}
                    onBlur={() => {
                      field.onBlur();
                      updateURLOnBlur();
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
              <FormItem>
                <FormLabel className="font-semibold">Your Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    {...field}
                    onBlur={() => {
                      field.onBlur();
                      updateURLOnBlur();
                    }}
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
                    placeholder="Share anything that will help prepare for our meeting..."
                    className="min-h-32"
                    {...field}
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
            onClick={() => transitionToStep('1')}
            disabled={isSubmitting || isProcessing}
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={() => {
              // **IMMEDIATE DUPLICATE PREVENTION**
              if (isSubmitting || isProcessingRef.current) {
                console.log('🚫 Button click blocked - already processing');
                return;
              }

              debugButtonClick('Continue to Payment clicked');
              handleNextStep('3');
            }}
            disabled={isSubmitting || isProcessing}
            className="relative"
          >
            {isSubmitting || isProcessing
              ? price > 0
                ? 'Creating Checkout...'
                : 'Scheduling...'
              : price > 0
                ? 'Continue to Payment'
                : 'Schedule Meeting'}
            {(isSubmitting || isProcessing) && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </Button>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function - return true to SKIP re-render, false to re-render
    // We need to re-render when processing state changes to update button states
    const processingStateChanged =
      prevProps.isSubmitting !== nextProps.isSubmitting ||
      prevProps.isProcessing !== nextProps.isProcessing;

    // Always re-render when processing state changes for immediate UI feedback
    if (processingStateChanged) {
      return false; // Force re-render for state changes
    }

    // For other props, only re-render if they actually changed
    const propsChanged =
      prevProps.price !== nextProps.price ||
      prevProps.timezone !== nextProps.timezone ||
      prevProps.eventDuration !== nextProps.eventDuration ||
      prevProps.beforeEventBuffer !== nextProps.beforeEventBuffer ||
      prevProps.afterEventBuffer !== nextProps.afterEventBuffer ||
      prevProps.use24Hour !== nextProps.use24Hour ||
      prevProps.queryStates.date?.getTime() !== nextProps.queryStates.date?.getTime() ||
      prevProps.queryStates.time?.getTime() !== nextProps.queryStates.time?.getTime() ||
      prevProps.queryStates.timezone !== nextProps.queryStates.timezone ||
      prevProps.debugButtonClick !== nextProps.debugButtonClick;

    return !propsChanged; // Skip re-render only if nothing important changed
  },
);

// Add display name for debugging
Step2Content.displayName = 'Step2Content';

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
  locale,
  beforeEventBuffer = DEFAULT_BEFORE_EVENT_BUFFER,
  afterEventBuffer = DEFAULT_AFTER_EVENT_BUFFER,
  blockedDates,
}: MeetingFormProps) {
  const router = useRouter();

  // State management
  const use24Hour = false;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCalendarSynced, setIsCalendarSynced] = React.useState(true);
  const [checkoutUrl, setCheckoutUrl] = React.useState<string | null>(null);
  const [isPrefetching, setIsPrefetching] = React.useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = React.useState(false);

  // **RENDERING STATE: Use state for UI updates**
  const [isProcessing, setIsProcessing] = React.useState(false);

  // **CRITICAL: Use ref for immediate duplicate prevention in event handlers**
  const isProcessingRef = React.useRef(false);

  // **CLIENT-SIDE DUPLICATE PREVENTION: Track request timestamps and IDs**
  const lastRequestTimestamp = React.useRef<number>(0);
  const activeRequestId = React.useRef<string | null>(null);
  const requestCooldownMs = 2000; // 2 seconds minimum between requests

  // **REF: Store handleNextStep to break circular dependency**
  const handleNextStepRef = React.useRef<((nextStep: '1' | '2' | '3') => Promise<void>) | null>(
    null,
  );

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

  // Use useWatch for specific field watching to optimize performance and prevent re-renders
  const watchedTimezone = useWatch({ control: form.control, name: 'timezone' });
  const watchedDate = useWatch({ control: form.control, name: 'date' });
  const watchedStartTime = useWatch({ control: form.control, name: 'startTime' });

  // Use the watched values or fallback to query states/form values
  const timezone =
    watchedTimezone || queryStates.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const selectedDateValue = watchedDate || queryStates.date;
  const selectedTimeValue = watchedStartTime || queryStates.time;
  const currentStep = queryStates.step;

  // **DEBUG: Add click debugging for troubleshooting**
  const debugButtonClick = React.useCallback(
    (action: string) => {
      console.log(`🔍 Button click debug: ${action}`, {
        isSubmitting,
        isProcessingRef: isProcessingRef.current,
        currentStep,
        formValid: form.formState.isValid,
        formErrors: form.formState.errors,
        timestamp: new Date().toISOString(),
      });
    },
    [isSubmitting, currentStep, form.formState.isValid, form.formState.errors],
  );

  // **IDEMPOTENCY: Generate unique request key for deduplication**
  const generateRequestKey = React.useCallback(() => {
    const formValues = form.getValues();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${eventId}-${formValues.guestEmail}-${formValues.startTime?.toISOString()}-${timestamp}-${random}`;
  }, [eventId, form]);

  // Function to check if a date is blocked
  const isDateBlocked = React.useCallback(
    (date: Date) => {
      if (!blockedDates || blockedDates.length === 0) return false;

      return blockedDates.some((blocked) => {
        const calendarDateInTz = toZonedTime(date, blocked.timezone);
        const blockedDateInTz = toZonedTime(blocked.date, blocked.timezone);

        return (
          formatInTimeZone(calendarDateInTz, blocked.timezone, 'yyyy-MM-dd') ===
          formatInTimeZone(blockedDateInTz, blocked.timezone, 'yyyy-MM-dd')
        );
      });
    },
    [blockedDates],
  );

  // Filter valid times to exclude blocked dates
  const filteredValidTimes = React.useMemo(() => {
    if (!blockedDates || blockedDates.length === 0) return validTimes;

    return validTimes.filter((time) => !isDateBlocked(time));
  }, [validTimes, isDateBlocked, blockedDates]);

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
            form.setValue('date', queryStates.date, { shouldValidate: false });
          }

          if (!hasTime && queryStates.time) {
            form.setValue('startTime', queryStates.time, { shouldValidate: false });
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

  // Function to create or get payment intent
  const createPaymentIntent = React.useCallback(async () => {
    // Don't recreate if already fetched
    if (checkoutUrl) {
      console.log('✅ Using existing checkout URL');
      return checkoutUrl;
    }

    const formValues = form.getValues();

    // **VALIDATION: Ensure required data is present**
    if (!formValues.guestEmail || !formValues.startTime) {
      throw new Error('Missing required form data');
    }

    // **CLIENT-SIDE DUPLICATE PREVENTION: Generate cache key for server-side use only**
    // Note: Email normalization is handled inside generateFormCacheKey
    const formCacheKey = generateFormCacheKey(
      eventId,
      formValues.guestEmail,
      formValues.startTime.toISOString(),
    );

    // **NOTE: Redis operations are handled server-side in the API endpoint**
    // Server-side duplicate prevention will be handled by the API endpoint
    console.log('🔍 Generated cache key for server-side deduplication:', formCacheKey);

    // **UNIQUE REQUEST ID: Generate and track current request**
    const currentRequestId = generateRequestKey();

    // **CLIENT-SIDE REQUEST TRACKING: Prevent duplicate requests with same ID**
    if (activeRequestId.current === currentRequestId) {
      console.log('🚫 Same request already in progress - blocking duplicate');
      return null;
    }

    if (activeRequestId.current !== null) {
      console.log('🚫 Different request already active - blocking new request');
      return null;
    }

    // **MARK REQUEST AS ACTIVE**
    activeRequestId.current = currentRequestId;
    setIsCreatingCheckout(true);

    // **ADDITIONAL PROTECTION: Check if we're already in a pending state**
    if (isSubmitting) {
      console.log('🚫 Form already in submitting state - blocking duplicate');
      activeRequestId.current = null;
      setIsCreatingCheckout(false);
      return null;
    }

    // **SMART CACHING: If we already have a valid checkout URL, return it immediately**
    if (checkoutUrl) {
      console.log('✅ Reusing existing valid checkout URL:', checkoutUrl);
      return checkoutUrl;
    }

    try {
      // **NOTE: Redis operations moved to server-side API endpoint**
      // The /api/create-payment-intent endpoint will handle FormCache operations

      // **IDEMPOTENCY: Use the current request ID for API deduplication**
      const requestKey = currentRequestId;

      // Get the locale for multilingual emails
      const userLocale = locale || 'en';

      console.log('🚀 Creating payment intent with Redis cache key:', formCacheKey);

      // Create payment intent using the new enhanced endpoint
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // **IDEMPOTENCY HEADER: Prevent server-side duplicates**
          'Idempotency-Key': requestKey,
        },
        body: JSON.stringify({
          eventId,
          clerkUserId,
          price,
          meetingData: {
            guestName: formValues.guestName,
            guestEmail: formValues.guestEmail,
            guestNotes: formValues.guestNotes,
            startTime: formValues.startTime.toISOString(),
            startTimeFormatted: formValues.startTime.toLocaleString(userLocale, {
              dateStyle: 'full',
              timeStyle: 'short',
            }),
            timezone: formValues.timezone || 'UTC',
            locale: userLocale,
            date: formValues.date?.toISOString() || '',
          },
          username,
          eventSlug,
          // **IDEMPOTENCY: Include request key in payload**
          requestKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle BotID protection responses
        if (response.status === 403 && errorData.error === 'Access denied') {
          throw new Error(errorData.message || 'Request blocked for security reasons');
        }

        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const { url } = await response.json();

      if (!url) {
        throw new Error('No checkout URL received from server');
      }

      // **SECURITY: Validate checkout URL before storing**
      try {
        validateCheckoutUrl(url);
        console.log('✅ Checkout URL validated');
      } catch (validationError) {
        console.error('❌ Invalid checkout URL received:', url, validationError);
        throw new Error(
          validationError instanceof Error
            ? validationError.message
            : 'Invalid checkout URL received from server',
        );
      }

      console.log('✅ Payment intent created successfully');

      // **NOTE: FormCache.markCompleted() will be handled server-side**
      setCheckoutUrl(url);
      return url;
    } catch (error) {
      console.error('❌ Payment creation error:', error);

      // **ERROR HANDLING: Reset state (server handles FormCache.markFailed)**

      form.setError('root', {
        message:
          error instanceof Error ? error.message : 'There was an error creating your payment.',
      });
      return null;
    } finally {
      // **CLEANUP: Reset creation state and clear active request ID**
      setIsCreatingCheckout(false);
      activeRequestId.current = null;
    }
  }, [
    checkoutUrl,
    clerkUserId,
    eventId,
    eventSlug,
    form,
    locale,
    price,
    username,
    generateRequestKey,
    isSubmitting,
  ]);

  // Helper to handle submission logic for both keyboard and click submissions
  const submitMeeting = React.useCallback(
    async (values: z.infer<typeof meetingFormSchema>) => {
      // Prevent double submissions
      if (isSubmitting || isProcessingRef.current) {
        return;
      }

      // **IMMEDIATE STATE UPDATE: Set processing flags**
      isProcessingRef.current = true;
      setIsProcessing(true);
      setIsSubmitting(true);

      try {
        // For free meetings, create the meeting directly
        if (price === 0) {
          const data = await createMeeting({
            ...values,
            eventId,
            clerkUserId,
            locale: locale || 'en',
          });

          if (data?.error) {
            form.setError('root', {
              message: 'There was an error saving your event',
            });
          } else {
            // Redirect to success page with locale path
            router.push(
              `/${locale || 'en'}/${username}/${eventSlug}/success?startTime=${encodeURIComponent(
                values.startTime.toISOString(),
              )}&timezone=${encodeURIComponent(values.timezone)}`,
            );
          }
          return;
        }

        // For paid meetings, generate checkout URL first
        const checkoutUrl = await createPaymentIntent();
        if (checkoutUrl) {
          setCheckoutUrl(checkoutUrl);
          transitionToStep('3');
          return;
        }

        form.setError('root', {
          message: 'Could not create payment checkout',
        });
      } catch (error) {
        console.error('Error creating meeting:', error);
        form.setError('root', {
          message: 'There was an error saving your event',
        });
      } finally {
        // **CLEANUP: Always reset processing state**
        isProcessingRef.current = false;
        setIsProcessing(false);
        setIsSubmitting(false);
      }
    },
    [
      createPaymentIntent,
      clerkUserId,
      eventId,
      form,
      locale,
      price,
      router,
      transitionToStep,
      username,
      eventSlug,
      isSubmitting,
    ],
  );

  const onSubmit: (
    values: z.infer<typeof meetingFormSchema>,
    event?: React.BaseSyntheticEvent,
  ) => Promise<void> = React.useCallback(
    async (values: z.infer<typeof meetingFormSchema>, event?: React.BaseSyntheticEvent) => {
      // Prevent default form submission behavior
      event?.preventDefault();

      if (currentStep === '3' && price > 0) {
        return;
      }

      // **STEP 2: Funnel through handleNextStep for consistent behavior**
      // This ensures keyboard (Enter) and click submissions use the same code path
      if (currentStep === '2') {
        if (handleNextStepRef.current) {
          await handleNextStepRef.current('3');
        }
        return;
      }

      // **CRITICAL: This should only be reached from Step 1**
      await submitMeeting(values);
    },
    [currentStep, price, submitMeeting],
  );

  // Prefetch checkout URL when step 2 is filled out - use watched values
  const watchedGuestName = useWatch({ control: form.control, name: 'guestName' });
  const watchedGuestEmail = useWatch({ control: form.control, name: 'guestEmail' });

  React.useEffect(() => {
    // Only prefetch if we're on step 2, have complete valid form data, price > 0, and not already fetched
    const hasCompletedForm =
      watchedGuestName?.length > 2 &&
      watchedGuestEmail?.length > 5 &&
      watchedGuestEmail.includes('@');

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
  }, [
    currentStep,
    watchedGuestName,
    watchedGuestEmail,
    price,
    checkoutUrl,
    isPrefetching,
    createPaymentIntent,
  ]);

  // Handle next step with improved checkout flow
  const handleNextStep = React.useCallback(
    async (nextStep: typeof currentStep) => {
      // If not going to step 3, just transition
      if (nextStep !== '3') {
        transitionToStep(nextStep);
        return;
      }

      // **CRITICAL: Prevent double submissions using multiple mechanisms**
      if (isProcessingRef.current) {
        console.log('🚫 Payment flow already in progress - blocking duplicate');
        return;
      }

      // **CLIENT-SIDE COOLDOWN: Prevent rapid successive clicks**
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTimestamp.current;
      if (timeSinceLastRequest < requestCooldownMs) {
        const remainingMs = requestCooldownMs - timeSinceLastRequest;
        console.log(`🚫 Request cooldown active - ${remainingMs}ms remaining`);

        // **USER FEEDBACK: Show brief message for too-fast clicks**
        form.setError('root', {
          message: 'Please wait a moment before trying again...',
        });

        // **AUTO-CLEAR ERROR: Remove error message after cooldown**
        setTimeout(() => {
          form.clearErrors('root');
        }, remainingMs);

        return;
      }
      lastRequestTimestamp.current = now;

      // **FIX: Validate form before processing payment**
      const isValid = await form.trigger(); // Validate all fields
      if (!isValid) {
        console.log('❌ Form validation failed for paid session');
        return;
      }

      // For free sessions, handle differently
      if (price === 0) {
        // **IMMEDIATE STATE UPDATE: Set processing flag for free sessions too**
        isProcessingRef.current = true;
        setIsProcessing(true);

        // **CRITICAL: Force immediate synchronous state update for free sessions**
        flushSync(() => {
          setIsSubmitting(true);
        });

        try {
          // Get current form values and submit directly (bypasses handleSubmit race condition)
          // Form validation already done above
          const formValues = form.getValues();
          await submitMeeting(formValues);
        } catch (error) {
          console.error('Error submitting form:', error);
          form.setError('root', {
            message: 'Failed to process request',
          });
        } finally {
          // **CLEANUP: Always reset processing state for free sessions**
          isProcessingRef.current = false;
          setIsProcessing(false);
          setIsSubmitting(false);
        }
        return;
      }

      // **IMMEDIATE STATE UPDATE: Set processing flag FIRST for instant UI feedback**
      isProcessingRef.current = true;
      setIsProcessing(true);

      // **CRITICAL: Force immediate synchronous state update and re-render**
      flushSync(() => {
        setIsSubmitting(true);
      });

      console.log(
        '🎯 UI state updated - isSubmitting:',
        true,
        'isProcessingRef:',
        isProcessingRef.current,
      );

      // **FIX: Small delay to ensure UI updates are visible before async operations**
      await new Promise((resolve) => setTimeout(resolve, 100));

      // **FIX: Check if we already have a checkout URL and redirect immediately**
      if (checkoutUrl) {
        console.log('✅ Using existing checkout URL for immediate redirect:', checkoutUrl);

        // **SECURITY: Validate existing URL before redirect**
        try {
          validateCheckoutUrl(checkoutUrl);
          console.log('🚀 Redirecting to existing checkout:', checkoutUrl);

          // **FIX: Add timeout fallback to reset state if redirect fails**
          setTimeout(() => {
            if (!document.hidden) {
              console.log('⚠️ Existing checkout redirect timeout - resetting state');
              isProcessingRef.current = false;
              setIsProcessing(false);
              setIsSubmitting(false);
            }
          }, 3000);

          window.location.href = checkoutUrl;
          return;
        } catch (validationError) {
          console.error('❌ Invalid existing checkout URL:', checkoutUrl, validationError);
          // Clear the invalid URL and reset state, then continue to create a new one
          setCheckoutUrl(null);
          isProcessingRef.current = false;
          setIsProcessing(false);
          setIsSubmitting(false);
          return;
        }
      }

      try {
        // Get or create checkout URL
        const url = await createPaymentIntent();

        if (url) {
          console.log('🚀 Redirecting to checkout:', url);

          // **SECURITY: Validate URL before redirect**
          try {
            validateCheckoutUrl(url);
          } catch (validationError) {
            console.error('❌ Refusing to redirect to invalid URL:', url, validationError);
            throw new Error(
              validationError instanceof Error
                ? validationError.message
                : 'Invalid checkout URL - redirect blocked for security',
            );
          }

          // **OPTIMIZED: Redirect immediately without transitioning to step 3**
          // This reduces delay and provides a smoother user experience
          console.log('Performing immediate redirect to Stripe checkout...');

          // **FIX: Add timeout fallback to reset state if redirect fails**
          setTimeout(() => {
            if (!document.hidden) {
              console.log('⚠️ Redirect timeout - resetting state');
              isProcessingRef.current = false;
              setIsProcessing(false);
              setIsSubmitting(false);
            }
          }, 3000);

          window.location.href = url;

          // The redirect will happen immediately, so we don't need to update UI further
          return;
        } else {
          throw new Error('Failed to get checkout URL');
        }
      } catch (error) {
        console.error('❌ Checkout flow error:', error);
        form.setError('root', {
          message: 'Failed to process request',
        });

        // **ERROR RECOVERY: Reset both processing flags**
        isProcessingRef.current = false;
        setIsProcessing(false);
        setIsSubmitting(false);
      }
    },
    [
      form,
      price,
      createPaymentIntent,
      submitMeeting,
      transitionToStep,
      checkoutUrl,
      setCheckoutUrl,
    ],
  );

  // **REF SYNC: Update ref whenever handleNextStep changes**
  React.useEffect(() => {
    handleNextStepRef.current = handleNextStep;
  }, [handleNextStep]);

  // Initialize first available date only once
  React.useEffect(() => {
    if (!validTimes.length || queryStates.date || form.getValues('date')) return;

    const firstAvailableTime = validTimes[0];
    const zonedTime = toZonedTime(firstAvailableTime, timezone);
    const localDate = startOfDay(zonedTime);

    form.setValue('date', localDate, { shouldValidate: false });
    setQueryStates({ date: localDate });
  }, [validTimes, queryStates.date, form, setQueryStates, timezone]);

  // Optimized URL synchronization - only run once on mount and when URL changes
  React.useEffect(() => {
    let hasChanges = false;
    const updates: Partial<z.infer<typeof meetingFormSchema>> = {};

    // Synchronize values from URL parameters to form only if they differ
    if (queryStates.name && queryStates.name !== form.getValues('guestName')) {
      updates.guestName = queryStates.name;
      hasChanges = true;
    }

    if (queryStates.email && queryStates.email !== form.getValues('guestEmail')) {
      updates.guestEmail = queryStates.email;
      hasChanges = true;
    }

    if (queryStates.date) {
      const currentDate = form.getValues('date');
      const dateChanged = !currentDate || currentDate.getTime() !== queryStates.date.getTime();
      if (dateChanged) {
        updates.date = queryStates.date;
        hasChanges = true;
      }
    }

    if (queryStates.time) {
      const currentTime = form.getValues('startTime');
      const timeChanged = !currentTime || currentTime.getTime() !== queryStates.time.getTime();
      if (timeChanged) {
        updates.startTime = queryStates.time;
        hasChanges = true;
      }
    }

    // Apply all updates at once to minimize re-renders
    if (hasChanges) {
      for (const [key, value] of Object.entries(updates)) {
        form.setValue(key as keyof typeof updates, value, {
          shouldValidate: false,
          shouldDirty: true,
        });
      }
    }
  }, [queryStates.name, queryStates.email, queryStates.date, queryStates.time, form]);

  // Check if user has valid calendar access
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
  const handleDateSelect = React.useCallback(
    (selectedDate: Date) => {
      form.setValue('date', selectedDate, { shouldValidate: false });
      setQueryStates({ date: selectedDate });
    },
    [form, setQueryStates],
  );

  // Handle time selection
  const handleTimeSelect = React.useCallback(
    (selectedTime: Date) => {
      form.setValue('startTime', selectedTime, { shouldValidate: false });
      setQueryStates({ time: selectedTime });
      transitionToStep('2'); // Automatically move to step 2 when time is selected
    },
    [form, setQueryStates, transitionToStep],
  );

  // Handle timezone change
  const handleTimezoneChange = React.useCallback(
    (newTimezone: string) => {
      form.setValue('timezone', newTimezone, { shouldValidate: false });
      setQueryStates({ timezone: newTimezone });
    },
    [form, setQueryStates],
  );

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
          form.setValue('date', queryStates.date, { shouldValidate: false });
          form.setValue('startTime', queryStates.time, { shouldValidate: false });
        } else {
          // Go back to step 1 to select date and time
          transitionToStep('1');
        }
      }
    }
  }, [currentStep, queryStates.date, queryStates.time, form, transitionToStep]);

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

  // Content for Step 3
  const Step3Content = () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-lg font-medium">
          {isCreatingCheckout || isProcessingRef.current
            ? 'Creating secure checkout...'
            : checkoutUrl
              ? 'Redirecting to payment...'
              : 'Preparing checkout...'}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Please do not close this window or navigate away
        </p>
      </div>
    </div>
  );

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
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
          validTimes={filteredValidTimes}
          onDateSelect={handleDateSelect}
          onTimeSlotSelect={handleTimeSelect}
          selectedDate={selectedDateValue}
          selectedTime={selectedTimeValue}
          timezone={timezone}
          onTimezoneChange={handleTimezoneChange}
          showCalendar={currentStep === '1'}
          blockedDates={blockedDates}
        >
          {currentStep !== '1' && (
            <div>
              {currentStep === '2' && (
                <Step2Content
                  form={form}
                  queryStates={{
                    date: queryStates.date,
                    time: queryStates.time,
                    timezone: queryStates.timezone,
                  }}
                  setQueryStates={setQueryStates}
                  timezone={timezone}
                  eventDuration={eventDuration}
                  beforeEventBuffer={beforeEventBuffer}
                  afterEventBuffer={afterEventBuffer}
                  transitionToStep={transitionToStep}
                  handleNextStep={handleNextStep}
                  isSubmitting={isSubmitting}
                  isProcessing={isProcessing}
                  isProcessingRef={isProcessingRef}
                  price={price}
                  use24Hour={use24Hour}
                  debugButtonClick={debugButtonClick}
                />
              )}
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
    <Suspense fallback={<BookingLoadingSkeleton />}>
      <MeetingFormContent {...props} />
    </Suspense>
  );
}
