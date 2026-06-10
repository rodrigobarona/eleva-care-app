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
import { generateFormCacheKey } from '@/lib/utils/cache-keys';
import { sha256Hex } from '@/lib/utils/idempotency';
import { meetingFormSchema } from '@/schema/meetings';
import { createMeeting } from '@/server/actions/meetings';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, startOfDay } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { CalendarIcon, Clock, Globe, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  createParser,
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import { Suspense } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

// Stripe checkout URL validation
const ALLOWED_CHECKOUT_HOSTS = new Set(['checkout.stripe.com']);

const SLOT_ERROR_CODES = new Set([
  'SLOT_TEMPORARILY_RESERVED',
  'SLOT_ALREADY_BOOKED',
  'ALREADY_BOOKED_BY_YOU',
]);

const NON_RETRYABLE_ERROR_CODES = new Set([
  ...SLOT_ERROR_CODES,
  'CONNECT_ACCOUNT_NOT_READY',
  'EVENT_OWNERSHIP_MISMATCH',
  'EVENT_NOT_PAYABLE',
]);

/**
 * Validates a Stripe checkout URL
 * @param url - The URL to validate
 * @throws Error if the URL is invalid, not HTTPS, or not from an allowed host
 */
export function validateCheckoutUrl(url: string): void {
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

/**
 * Custom date parser that serializes/parses using local date methods
 * instead of UTC. Fixes the off-by-one day bug where parseAsIsoDate
 * uses .toISOString() (UTC) causing dates to shift back one day
 * for users in UTC+ timezones.
 */
const parseAsLocalDate = createParser({
  parse: (v: string) => {
    const [year, month, day] = v.split('-').map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  },
  serialize: (v: Date) => {
    const year = v.getFullYear();
    const month = String(v.getMonth() + 1).padStart(2, '0');
    const day = String(v.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  eq: (a: Date, b: Date) => a.getTime() === b.getTime(),
});

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
  phone: string;
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
  handleNextStepRef: React.MutableRefObject<((nextStep: '1' | '2' | '3') => Promise<void>) | null>;
  isSubmitting: boolean;
  isProcessing: boolean;
  isProcessingRef: React.MutableRefObject<boolean>;
  price: number;
  use24Hour: boolean;
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
    handleNextStepRef,
    isSubmitting,
    isProcessing,
    isProcessingRef,
    price,
    use24Hour,
  }) => {
    // Subscribe to root form errors so they trigger re-renders
    const { errors } = useFormState({ control: form.control });

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
      const phone = form.getValues('guestPhone')?.trim();

      const updates: Record<string, string | undefined> = {};
      if (name) updates.name = name;
      if (email) updates.email = email;
      if (phone) updates.phone = phone;

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
            name="guestPhone"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="font-semibold">Phone Number (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+351 912 345 678"
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

        {errors.root?.message && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {errors.root.message}
          </div>
        )}

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
              if (isSubmitting || isProcessingRef.current) {
                return;
              }
              handleNextStepRef.current?.('3');
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
    if (
      prevProps.isSubmitting !== nextProps.isSubmitting ||
      prevProps.isProcessing !== nextProps.isProcessing
    ) {
      return false;
    }

    const propsChanged =
      prevProps.price !== nextProps.price ||
      prevProps.timezone !== nextProps.timezone ||
      prevProps.eventDuration !== nextProps.eventDuration ||
      prevProps.beforeEventBuffer !== nextProps.beforeEventBuffer ||
      prevProps.afterEventBuffer !== nextProps.afterEventBuffer ||
      prevProps.use24Hour !== nextProps.use24Hour ||
      prevProps.queryStates.date?.getTime() !== nextProps.queryStates.date?.getTime() ||
      prevProps.queryStates.time?.getTime() !== nextProps.queryStates.time?.getTime() ||
      prevProps.queryStates.timezone !== nextProps.queryStates.timezone;

    return !propsChanged;
  },
);

// Add display name for debugging
Step2Content.displayName = 'Step2Content';

// Step3Content extracted as a stable component to avoid remounting on parent re-renders
interface Step3ContentProps {
  isCreatingCheckout: boolean;
  isProcessing: boolean;
  checkoutUrl: string | null;
}

const Step3Content = React.memo<Step3ContentProps>(
  ({ isCreatingCheckout, isProcessing, checkoutUrl }) => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-lg font-medium">
          {isCreatingCheckout || isProcessing
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
  ),
);
Step3Content.displayName = 'Step3Content';

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
  const [checkoutUrl, setCheckoutUrl] = React.useState<string | null>(null);
  const [isCreatingCheckout, setIsCreatingCheckout] = React.useState(false);

  // **RENDERING STATE: Use state for UI updates**
  const [isProcessing, setIsProcessing] = React.useState(false);

  // **CRITICAL: Use ref for immediate duplicate prevention in event handlers**
  const isProcessingRef = React.useRef(false);

  // **CLIENT-SIDE DUPLICATE PREVENTION: Track request timestamps and IDs**
  const lastRequestTimestamp = React.useRef<number>(0);
  const activeRequestId = React.useRef<string | null>(null);
  const isPrefetchRequest = React.useRef(false);
  const isPrefetchingRef = React.useRef(false);
  const prefetchPromiseRef = React.useRef<Promise<string | null> | null>(null);
  const prefetchFailureRef = React.useRef<{ code: string; message: string } | null>(null);
  const checkoutUrlRef = React.useRef<string | null>(null);
  const requestCooldownMs = 2000; // 2 seconds minimum between requests

  // **STRIPE IDEMPOTENCY KEY CACHE**: Derived once per booking context so that
  // prefetch and explicit submit send the SAME key to Stripe (within its 24h
  // retention window). Without this, prior code generated a fresh UUID per
  // call, defeating idempotency and allowing two Checkout Sessions to be
  // created for the same booking if the calls overlapped.
  const idempotencyKeyCache = React.useRef<{ signature: string; key: string } | null>(null);

  // Per-attempt nonce included in the idempotency signature so that
  // retries after going back to step 2 produce a NEW Stripe key. Without
  // this, the deterministic hash of (eventId|email|startTime) stays the
  // same across attempts, but the Stripe request body changes (transfer
  // schedule depends on Date.now()), causing StripeIdempotencyError.
  const checkoutAttemptNonce = React.useRef<string>(crypto.randomUUID());

  // **REF: Store handleNextStep to break circular dependency**
  const handleNextStepRef = React.useRef<((nextStep: '1' | '2' | '3') => Promise<void>) | null>(
    null,
  );

  // Query state configuration
  const queryStateParsers = React.useMemo(
    () => ({
      step: parseAsStringLiteral(['1', '2', '3'] as const).withDefault('1'),
      date: parseAsLocalDate,
      time: parseAsIsoDateTime,
      name: parseAsString.withDefault(''),
      email: parseAsString.withDefault(''),
      phone: parseAsString.withDefault(''),
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
      phone: 'p',
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
      guestPhone: queryStates.phone || '',
      guestNotes: '',
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

  // **IDEMPOTENCY: Generate deterministic request key for deduplication**
  const generateRequestKey = React.useCallback(() => {
    const formValues = form.getValues();
    return `${eventId}-${formValues.guestEmail}-${formValues.startTime?.toISOString()}`;
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

  const resetPrefetchState = React.useCallback(() => {
    prefetchFailureRef.current = null;
    isPrefetchingRef.current = false;
    isPrefetchRequest.current = false;
    activeRequestId.current = null;
    prefetchPromiseRef.current = null;
    idempotencyKeyCache.current = null;
    checkoutAttemptNonce.current = crypto.randomUUID();
    setCheckoutUrl(null);
    checkoutUrlRef.current = null;
    form.clearErrors('root');
  }, [form]);

  // Enhanced step transition with validation
  const transitionToStep = React.useCallback(
    (nextStep: typeof currentStep) => {
      // Special handling for transition to step 2
      if (nextStep === '2') {
        resetPrefetchState();

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
    [setQueryStates, form, queryStates.date, queryStates.time, resetPrefetchState],
  );

  const redirectToCheckout = React.useCallback(
    (targetUrl: string, invalidUrlMessage: string) => {
      try {
        validateCheckoutUrl(targetUrl);

        // Re-enable the submit UI only if the browser is still on this page
        // well after the redirect was initiated (e.g., user tapped Back before
        // Stripe loaded, or the navigation was blocked). The previous 3s
        // unconditional timer caused a regression on slow mobile redirects:
        // the button re-enabled mid-navigation, the user tapped again, and
        // the second request always hit a 409 because the first had already
        // reserved the slot.
        const FALLBACK_REENABLE_MS = 15000;

        const resetSubmitState = () => {
          isProcessingRef.current = false;
          setIsProcessing(false);
          setIsSubmitting(false);
        };

        // Declared up front so cancelFallback can reference it without TDZ.
        let fallbackTimer: number | null = null;

        const onVisibilityChange = () => {
          if (document.hidden) {
            cancelFallback();
          }
        };

        const cancelFallback = () => {
          if (fallbackTimer !== null) {
            window.clearTimeout(fallbackTimer);
            fallbackTimer = null;
          }
          window.removeEventListener('pagehide', cancelFallback);
          document.removeEventListener('visibilitychange', onVisibilityChange);
        };

        fallbackTimer = window.setTimeout(() => {
          // If we're still on this page 15s later, the navigation almost
          // certainly failed — release the UI so the user can retry. Clean
          // up the listeners first to avoid stale references lingering in
          // memory on long-lived SPA sessions.
          cancelFallback();
          if (!document.hidden) {
            resetSubmitState();
          }
        }, FALLBACK_REENABLE_MS);

        window.addEventListener('pagehide', cancelFallback, { once: true });
        document.addEventListener('visibilitychange', onVisibilityChange);

        window.location.href = targetUrl;
        return true;
      } catch (validationError) {
        console.error('[MeetingForm] invalid checkout URL', validationError);
        setCheckoutUrl(null);
        checkoutUrlRef.current = null;
        isProcessingRef.current = false;
        setIsProcessing(false);
        setIsSubmitting(false);
        form.setError('root', { message: invalidUrlMessage });
        return false;
      }
    },
    [form],
  );

  const getCreateMeetingErrorMessage = React.useCallback((code?: string, fallback?: string) => {
    switch (code) {
      case 'ALREADY_BOOKED_BY_YOU':
        return 'You already have a confirmed booking for this time. Check your email for the meeting details, or pick a different time.';
      case 'SLOT_ALREADY_BOOKED':
        return 'This time slot has been booked. Please choose a different time.';
      case 'SLOT_TEMPORARILY_RESERVED':
        return 'This time slot is temporarily reserved by another user. Please pick a different time or try again in a few minutes.';
      case 'INVALID_TIME_SLOT':
        return 'This time is no longer available. Please pick another slot.';
      case 'CONNECT_ACCOUNT_NOT_READY':
        return 'This expert cannot accept payments right now. Please try again later.';
      case 'EVENT_OWNERSHIP_MISMATCH':
        return 'There was an issue verifying this event. Please refresh the page and try again.';
      case 'EVENT_NOT_PAYABLE':
        return 'This event is not configured for payment. Please contact the expert.';
      case 'PRICE_MISMATCH':
        return 'The price has been updated. Please refresh the page to see the latest price.';
      case 'VALIDATION_ERROR':
        return 'Some required information is missing. Please check your details and try again.';
      case 'IDEMPOTENCY_MISMATCH':
        return 'Your payment session expired. Please try again.';
      default:
        return fallback || 'Something went wrong. Please try again or choose a different time.';
    }
  }, []);

  /**
   * Creates a Stripe Checkout Session via /api/create-payment-intent and
   * returns the hosted checkout URL. Named "createPaymentIntent" for legacy
   * reasons; the server creates a Checkout Session with payment_intent_data,
   * not a standalone PaymentIntent.
   */
  const createPaymentIntent = React.useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      console.log('[MeetingForm] createPaymentIntent called', {
        silent,
        hasCheckoutUrl: !!checkoutUrl,
        hasCheckoutUrlRef: !!checkoutUrlRef.current,
      });

      const cachedCheckoutUrl = checkoutUrl || checkoutUrlRef.current;
      if (cachedCheckoutUrl) {
        console.log('[MeetingForm] createPaymentIntent: returning cached checkout URL');
        return cachedCheckoutUrl;
      }

      const formValues = form.getValues();

      if (!formValues.guestEmail || !formValues.startTime) {
        console.log('[MeetingForm] createPaymentIntent: missing required form data');
        throw new Error('Missing required form data');
      }

      const formCacheKey = generateFormCacheKey(
        eventId,
        formValues.guestEmail,
        formValues.startTime.toISOString(),
      );

      const currentRequestId = generateRequestKey();

      // Derive a Stripe idempotency key from the booking context + attempt
      // nonce. The nonce ensures retries after going back to step 2 get a
      // fresh key (avoiding StripeIdempotencyError when time-sensitive params
      // like transfer schedule change). Within a single attempt, prefetch +
      // submit share the same key so Stripe deduplicates them.
      const idempotencySignature = `${eventId}|${formValues.guestEmail.toLowerCase().trim()}|${formValues.startTime.toISOString()}|${checkoutAttemptNonce.current}`;
      let stripeIdempotencyKey: string;
      if (idempotencyKeyCache.current?.signature === idempotencySignature) {
        stripeIdempotencyKey = idempotencyKeyCache.current.key;
      } else {
        stripeIdempotencyKey = await sha256Hex(idempotencySignature);
        idempotencyKeyCache.current = {
          signature: idempotencySignature,
          key: stripeIdempotencyKey,
        };
      }

      console.log(
        '[MeetingForm] createPaymentIntent: requestId=%s, cacheKey=%s, stripeKey=%s',
        currentRequestId,
        formCacheKey,
        stripeIdempotencyKey,
      );

      if (activeRequestId.current !== null) {
        console.log(
          '[MeetingForm] createPaymentIntent: BLOCKED - different request active (id=%s)',
          activeRequestId.current,
        );
        return null;
      }

      activeRequestId.current = currentRequestId;
      setIsCreatingCheckout(true);

      try {
        const userLocale = locale || 'en';

        console.log('[MeetingForm] createPaymentIntent: sending POST /api/create-payment-intent');

        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': stripeIdempotencyKey,
          },
          body: JSON.stringify({
            eventId,
            clerkUserId,
            price,
            meetingData: {
              guestName: formValues.guestName,
              guestEmail: formValues.guestEmail,
              guestPhone: formValues.guestPhone,
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
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorCode = (errorData.code as string) || undefined;
          const errorMessage: string = errorData.error || 'Failed to create payment intent';

          console.log(
            '[MeetingForm] createPaymentIntent: API error status=%d code=%s',
            response.status,
            errorCode,
            errorData,
          );

          if (errorCode === 'IDEMPOTENCY_MISMATCH') {
            checkoutAttemptNonce.current = crypto.randomUUID();
            idempotencyKeyCache.current = null;
          }

          if (errorCode && NON_RETRYABLE_ERROR_CODES.has(errorCode)) {
            prefetchFailureRef.current = { code: errorCode, message: errorMessage };
          }

          if (errorCode && SLOT_ERROR_CODES.has(errorCode)) {
            form.setError('root', {
              message: getCreateMeetingErrorMessage(errorCode, errorMessage),
            });
          }

          if (response.status === 403 && errorData.error === 'Access denied') {
            throw new Error(errorData.message || 'Request blocked for security reasons');
          }

          throw new Error(errorMessage);
        }

        const { url } = await response.json();

        if (!url) {
          throw new Error('No checkout URL received from server');
        }

        try {
          validateCheckoutUrl(url);
        } catch (validationError) {
          console.error(
            '[MeetingForm] createPaymentIntent: invalid checkout URL received',
            url,
            validationError,
          );
          throw new Error(
            validationError instanceof Error
              ? validationError.message
              : 'Invalid checkout URL received from server',
          );
        }

        console.log('[MeetingForm] createPaymentIntent: SUCCESS - checkout URL obtained');

        setCheckoutUrl(url);
        checkoutUrlRef.current = url;
        return url;
      } catch (error) {
        console.error('[MeetingForm] createPaymentIntent: FAILED', error);

        if (!silent) {
          form.setError('root', {
            message:
              error instanceof Error
                ? error.message
                : 'Something went wrong setting up your payment. Please try again.',
          });
        }
        return null;
      } finally {
        setIsCreatingCheckout(false);
        if (isPrefetchRequest.current || activeRequestId.current === currentRequestId) {
          activeRequestId.current = null;
        }
        console.log('[MeetingForm] createPaymentIntent: cleanup done, activeRequestId cleared');
      }
    },
    [
      checkoutUrl,
      clerkUserId,
      eventId,
      eventSlug,
      form,
      locale,
      price,
      username,
      generateRequestKey,
      getCreateMeetingErrorMessage,
    ],
  );

  // Helper to handle submission logic for Step 1 keyboard/click submissions
  const submitMeeting = React.useCallback(
    async (values: z.infer<typeof meetingFormSchema>) => {
      console.log('[MeetingForm] submitMeeting called', {
        price,
        isProcessing: isProcessingRef.current,
      });

      if (isProcessingRef.current) {
        console.log('[MeetingForm] submitMeeting: BLOCKED - already processing');
        return;
      }

      isProcessingRef.current = true;
      setIsProcessing(true);
      setIsSubmitting(true);

      try {
        if (price === 0) {
          console.log('[MeetingForm] submitMeeting: FREE path');
          const data = await createMeeting({
            ...values,
            eventId,
            clerkUserId,
            locale: locale || 'en',
          });

          if (data?.error) {
            form.setError('root', {
              message: getCreateMeetingErrorMessage(data.code, data.message),
            });
          } else {
            router.push(
              `/${locale || 'en'}/${username}/${eventSlug}/success?startTime=${encodeURIComponent(
                values.startTime.toISOString(),
              )}&timezone=${encodeURIComponent(values.timezone)}`,
            );
          }
          return;
        }

        console.log('[MeetingForm] submitMeeting: PAID path - creating payment intent');
        const checkoutUrl = await createPaymentIntent();
        if (checkoutUrl) {
          setCheckoutUrl(checkoutUrl);
          transitionToStep('3');
          redirectToCheckout(
            checkoutUrl,
            'Your payment session has expired. Please try again to get a new one.',
          );
          return;
        }

        form.setError('root', {
          message: "We couldn't set up your payment. Please try again or choose a different time.",
        });
      } catch (error) {
        console.error('[MeetingForm] submitMeeting: exception', error);
        form.setError('root', {
          message:
            error instanceof Error
              ? error.message
              : 'Something went wrong. Please try again or choose a different time.',
        });
      } finally {
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
      getCreateMeetingErrorMessage,
      locale,
      price,
      router,
      redirectToCheckout,
      transitionToStep,
      username,
      eventSlug,
    ],
  );

  const onSubmit: (
    values: z.infer<typeof meetingFormSchema>,
    event?: React.BaseSyntheticEvent,
  ) => Promise<void> = React.useCallback(
    async (values: z.infer<typeof meetingFormSchema>, event?: React.BaseSyntheticEvent) => {
      event?.preventDefault();
      console.log('[MeetingForm] onSubmit called', { currentStep, price });

      if (currentStep === '3' && price > 0) {
        console.log('[MeetingForm] onSubmit: BLOCKED - step 3 paid (Stripe handles submission)');
        return;
      }

      if (currentStep === '2') {
        console.log('[MeetingForm] onSubmit: funneling to handleNextStep("3")');
        if (handleNextStepRef.current) {
          await handleNextStepRef.current('3');
        }
        return;
      }

      console.log('[MeetingForm] onSubmit: step 1 - calling submitMeeting');
      await submitMeeting(values);
    },
    [currentStep, price, submitMeeting],
  );

  // Prefetch checkout URL when step 2 is filled out - use watched values
  const watchedGuestName = useWatch({ control: form.control, name: 'guestName' });
  const watchedGuestEmail = useWatch({ control: form.control, name: 'guestEmail' });

  React.useEffect(() => {
    const hasCompletedForm =
      watchedGuestName?.length > 2 &&
      watchedGuestEmail?.length > 5 &&
      watchedGuestEmail.includes('@');

    const canPrefetch =
      currentStep === '2' &&
      hasCompletedForm &&
      price > 0 &&
      !checkoutUrl &&
      !isPrefetchingRef.current &&
      !prefetchFailureRef.current;

    if (!canPrefetch) return;

    const timer = setTimeout(() => {
      if (isPrefetchingRef.current || prefetchFailureRef.current) return;

      isPrefetchingRef.current = true;
      isPrefetchRequest.current = true;
      const promise = createPaymentIntent({ silent: true });
      prefetchPromiseRef.current = promise;
      promise
        .then((url) => {
          console.log('[MeetingForm] prefetch: %s', url ? 'success' : 'returned null');
        })
        .catch((error) => {
          console.error('[MeetingForm] prefetch: failed', error);
        })
        .finally(() => {
          prefetchPromiseRef.current = null;
          isPrefetchRequest.current = false;
          isPrefetchingRef.current = false;
        });
    }, 800);

    return () => clearTimeout(timer);
  }, [currentStep, watchedGuestName, watchedGuestEmail, price, checkoutUrl, createPaymentIntent]);

  // Handle next step with improved checkout flow
  const handleNextStep = React.useCallback(
    async (nextStep: typeof currentStep) => {
      console.log('[MeetingForm] handleNextStep called', {
        nextStep,
        price,
        isProcessing: isProcessingRef.current,
        hasCheckoutUrl: !!checkoutUrl,
        hasCheckoutUrlRef: !!checkoutUrlRef.current,
      });

      if (nextStep !== '3') {
        transitionToStep(nextStep);
        return;
      }

      if (isProcessingRef.current) {
        console.log('[MeetingForm] handleNextStep: BLOCKED - already processing');
        return;
      }

      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTimestamp.current;
      if (timeSinceLastRequest < requestCooldownMs) {
        const remainingMs = requestCooldownMs - timeSinceLastRequest;
        console.log(
          '[MeetingForm] handleNextStep: BLOCKED - cooldown (%dms remaining)',
          remainingMs,
        );
        form.setError('root', {
          message: 'Please wait a moment before trying again...',
        });
        setTimeout(() => {
          form.clearErrors('root');
        }, remainingMs);
        return;
      }

      isProcessingRef.current = true;
      setIsProcessing(true);

      const isValid = await form.trigger();
      if (!isValid) {
        console.log(
          '[MeetingForm] handleNextStep: BLOCKED - form validation failed',
          form.formState.errors,
        );
        form.setError('root', {
          message: 'Please fill in all required fields correctly.',
        });
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }

      lastRequestTimestamp.current = Date.now();

      // Free meeting path: create the meeting directly (not via submitMeeting,
      // which has its own isProcessingRef guard that would conflict)
      if (price === 0) {
        console.log('[MeetingForm] handleNextStep: FREE path - creating meeting directly');
        try {
          const formValues = form.getValues();
          const data = await createMeeting({
            ...formValues,
            eventId,
            clerkUserId,
            locale: locale || 'en',
          });

          if (data?.error) {
            console.log('[MeetingForm] handleNextStep: FREE path - createMeeting returned error');
            form.setError('root', {
              message: getCreateMeetingErrorMessage(data.code, data.message),
            });
          } else {
            const successUrl = `/${locale || 'en'}/${username}/${eventSlug}/success?startTime=${encodeURIComponent(
              formValues.startTime.toISOString(),
            )}&timezone=${encodeURIComponent(formValues.timezone)}`;
            console.log(
              '[MeetingForm] handleNextStep: FREE path - success, redirecting to',
              successUrl,
            );
            router.push(successUrl);
          }
        } catch (error) {
          console.error('[MeetingForm] handleNextStep: FREE path - exception', error);
          form.setError('root', {
            message: getCreateMeetingErrorMessage(),
          });
        } finally {
          isProcessingRef.current = false;
          setIsProcessing(false);
        }
        return;
      }

      // Paid flow
      console.log('[MeetingForm] handleNextStep: PAID path');
      const guestEmail = form.getValues().guestEmail;
      if (guestEmail) {
        document.cookie = `eleva_booking_email=${encodeURIComponent(guestEmail)}; path=/; max-age=3600; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
      }
      setIsSubmitting(true);

      // Fast path: reuse existing checkout URL
      const existingCheckoutUrl = checkoutUrl || checkoutUrlRef.current;
      if (existingCheckoutUrl) {
        console.log('[MeetingForm] handleNextStep: PAID path - reusing existing checkoutUrl');
        console.log(
          '[MeetingForm] handleNextStep: PAID path - redirecting to',
          existingCheckoutUrl,
        );
        if (
          redirectToCheckout(
            existingCheckoutUrl,
            'Your payment session has expired. Please try again to get a new one.',
          )
        ) {
          return;
        }
      }

      // Slow path: create new payment intent
      try {
        // If a prefetch is in-flight, wait for it instead of making a duplicate request
        // that would be rejected by the server's FormCache (429)
        if (prefetchPromiseRef.current) {
          console.log('[MeetingForm] handleNextStep: PAID path - waiting for in-flight prefetch');
          try {
            const prefetchUrl = await prefetchPromiseRef.current;
            const prefetchRedirectUrl = prefetchUrl || checkoutUrlRef.current;
            if (prefetchRedirectUrl) {
              console.log(
                '[MeetingForm] handleNextStep: PAID path - prefetch completed, redirecting',
              );
              if (
                redirectToCheckout(
                  prefetchRedirectUrl,
                  'Your payment session has expired. Please try again to get a new one.',
                )
              ) {
                return;
              }
            }
          } catch {
            console.log(
              '[MeetingForm] handleNextStep: PAID path - prefetch failed, creating new request',
            );
          }
        }

        activeRequestId.current = null;
        isPrefetchRequest.current = false;

        console.log('[MeetingForm] handleNextStep: PAID path - calling createPaymentIntent');
        const url = await createPaymentIntent();

        const redirectUrl = url || checkoutUrlRef.current;
        console.log('[MeetingForm] handleNextStep: PAID path - createPaymentIntent returned', {
          directUrl: !!url,
          refFallback: !!checkoutUrlRef.current,
          redirectUrl: !!redirectUrl,
        });

        if (redirectUrl) {
          console.log('[MeetingForm] handleNextStep: PAID path - redirecting to checkout');
          if (
            redirectToCheckout(
              redirectUrl,
              'Your payment session has expired. Please try again to get a new one.',
            )
          ) {
            return;
          }
          throw new Error('The checkout URL could not be verified. Please try again.');
        } else {
          throw new Error(
            "We couldn't set up your payment. Please try again or choose a different time.",
          );
        }
      } catch (error) {
        console.error('[MeetingForm] handleNextStep: PAID path - exception', error);
        form.setError('root', {
          message:
            error instanceof Error
              ? error.message
              : 'Something went wrong setting up your payment. Please try again.',
        });
        isProcessingRef.current = false;
        setIsProcessing(false);
        setIsSubmitting(false);
      }
    },
    [
      form,
      price,
      createPaymentIntent,
      redirectToCheckout,
      transitionToStep,
      checkoutUrl,
      router,
      clerkUserId,
      eventId,
      getCreateMeetingErrorMessage,
      locale,
      username,
      eventSlug,
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
      prefetchFailureRef.current = null;
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
                  handleNextStepRef={handleNextStepRef}
                  isSubmitting={isSubmitting}
                  isProcessing={isProcessing}
                  isProcessingRef={isProcessingRef}
                  price={price}
                  use24Hour={use24Hour}
                />
              )}
              {currentStep === '3' && (
                <Step3Content
                  isCreatingCheckout={isCreatingCheckout}
                  isProcessing={isProcessing}
                  checkoutUrl={checkoutUrl}
                />
              )}
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
