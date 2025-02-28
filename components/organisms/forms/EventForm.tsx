'use client';

import * as z from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/atoms/alert';
import { Button } from '@/components/atoms/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/atoms/form';
import { Input } from '@/components/atoms/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Textarea } from '@/components/atoms/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

// Define currency options
const currencies = [
  { value: 'eur', label: 'EUR (€)' },
  { value: 'usd', label: 'USD ($)' },
  { value: 'gbp', label: 'GBP (£)' },
];

// Define the form schema with Zod
const eventFormSchema = z.object({
  name: z
    .string()
    .min(3, { message: 'Event name must be at least 3 characters long' })
    .max(100, { message: 'Event name must be less than 100 characters' }),
  description: z
    .string()
    .min(20, { message: 'Description must be at least 20 characters long' })
    .max(1000, { message: 'Description must be less than 1000 characters' }),
  durationInMinutes: z.coerce
    .number()
    .int()
    .min(15, { message: 'Duration must be at least 15 minutes' })
    .max(240, { message: 'Duration must be less than 4 hours' }),
  price: z.coerce
    .number()
    .min(0, { message: 'Price cannot be negative' })
    .max(1000, { message: 'Price must be less than €1000' }),
  currency: z.enum(['eur', 'usd', 'gbp']).default('eur'),
  location: z.string().min(1, { message: 'Location is required' }),
  slug: z
    .string()
    .min(3, { message: 'Custom URL slug must be at least 3 characters' })
    .max(100, { message: 'Custom URL slug must be less than 100 characters' })
    .regex(/^[a-z0-9-]+$/, {
      message: 'Custom URL can only contain lowercase letters, numbers, and hyphens',
    })
    .optional(),
});

// Define the Event type based on the schema
export type EventFormValues = z.infer<typeof eventFormSchema>;

// Props for the EventForm component
interface EventFormProps {
  defaultValues?: Partial<EventFormValues>;
  eventId?: string;
  onSuccess?: () => void;
  isUpdate?: boolean;
}

export function EventForm({ defaultValues, eventId, onSuccess, isUpdate = false }: EventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [slugAvailabilityChecking, setSlugAvailabilityChecking] = useState(false);
  const [slugAvailabilityError, setSlugAvailabilityError] = useState<string | null>(null);
  const [slugAvailabilitySuccess, setSlugAvailabilitySuccess] = useState(false);

  // Initialize the form with default values
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: '',
      description: '',
      durationInMinutes: 60,
      price: 0,
      currency: 'eur',
      location: 'online',
      slug: '',
      ...defaultValues,
    },
  });

  // Watch values from the form
  const watchedName = form.watch('name');
  const watchedSlug = form.watch('slug');

  // Generate slug from name
  useEffect(() => {
    const name = watchedName;
    const currentSlug = watchedSlug;

    // Only auto-generate if slug is empty and we're not updating
    if (!isUpdate && name && !currentSlug) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      if (generatedSlug) {
        form.setValue('slug', generatedSlug, { shouldValidate: true });
      }
    }
  }, [watchedName, watchedSlug, form, isUpdate]);

  // Check slug availability
  const checkSlugAvailability = useCallback(
    async (slug: string) => {
      if (!slug || isUpdate) return;

      try {
        setSlugAvailabilityChecking(true);
        setSlugAvailabilityError(null);
        setSlugAvailabilitySuccess(false);

        const response = await fetch(`/api/events/check-slug?slug=${encodeURIComponent(slug)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to check slug availability');
        }

        if (data.available) {
          setSlugAvailabilitySuccess(true);
        } else {
          setSlugAvailabilityError('This URL is already taken. Please choose another one.');
          form.setError('slug', { message: 'This URL is already taken' });
        }
      } catch (error) {
        console.error('Error checking slug:', error);
      } finally {
        setSlugAvailabilityChecking(false);
      }
    },
    [isUpdate, form],
  );

  // Debounce slug check
  useEffect(() => {
    const slug = watchedSlug;
    if (!slug) return;

    const timer = setTimeout(() => {
      checkSlugAvailability(slug);
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedSlug, checkSlugAvailability]);

  // Handle form submission
  const onSubmit = async (data: EventFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const endpoint = eventId ? `/api/events/${eventId}` : '/api/events';
      const method = eventId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save event');
      }

      const result = await response.json();

      toast.success(eventId ? 'Event Updated' : 'Event Created', {
        description: eventId
          ? 'Your event has been updated successfully.'
          : 'Your new event has been created successfully.',
      });

      if (onSuccess) {
        onSuccess();
      } else {
        // Refresh the page or redirect
        router.refresh();
        if (!eventId) {
          router.push(`/events/${result.id}`);
        }
      }
    } catch (error) {
      console.error('Error saving event:', error);
      setServerError(error instanceof Error ? error.message : 'Failed to save your event');
      toast.error('Error', {
        description: 'Failed to save your event. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input placeholder="Initial Consultation" {...field} />
              </FormControl>
              <FormDescription>
                Give your session a clear, descriptive name that explains what clients will get.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom URL</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-2">
                  <Input placeholder="initial-consultation" {...field} value={field.value || ''} />
                  {slugAvailabilityChecking && <Loader2 className="h-4 w-4 animate-spin" />}
                  {slugAvailabilitySuccess && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
              </FormControl>
              <FormDescription>
                This will be used in your booking URL: /book/username/
                <strong>{field.value || 'your-event-url'}</strong>
              </FormDescription>
              {slugAvailabilityError && (
                <p className="mt-1 text-sm text-red-500">{slugAvailabilityError}</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Explain what this session includes and what clients can expect..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide details about what will happen during the session and why clients should
                book it.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="durationInMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(value) => field.onChange(Number.parseInt(value, 10))}
                    defaultValue={field.value.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="1" {...field} />
                </FormControl>
                <FormDescription>Set to 0 for free sessions.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online (Video)</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>Where the session will take place.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {eventId ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>{eventId ? 'Update Event' : 'Create Event'}</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
