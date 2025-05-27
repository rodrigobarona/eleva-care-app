'use client';

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */
import * as z from 'zod';
import { Button } from '@/components/atoms/button';
import { Card } from '@/components/atoms/card';
import {
  Form,
  FormControl,
  FormDescription,
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
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

// Define schema for scheduling settings form
const formSchema = z.object({
  beforeEventBuffer: z.coerce
    .number()
    .min(0, 'Buffer time cannot be negative')
    .max(120, 'Buffer time cannot exceed 2 hours'),
  afterEventBuffer: z.coerce
    .number()
    .min(0, 'Buffer time cannot be negative')
    .max(120, 'Buffer time cannot exceed 2 hours'),
  minimumNotice: z.coerce
    .number()
    .min(60, 'Minimum notice must be at least 1 hour')
    .max(20160, 'Minimum notice cannot exceed 2 weeks')
    .refine(
      (val) => MINIMUM_NOTICE_OPTIONS.some((option) => option.value === val),
      'Please select a valid minimum notice period',
    ),
  timeSlotInterval: z.coerce
    .number()
    .refine((val) => val % 5 === 0, 'Time slot interval must be in 5-minute increments')
    .refine((val) => val >= 5, 'Time slot interval must be at least 5 minutes')
    .refine((val) => val <= 120, 'Time slot interval cannot exceed 2 hours'),
  bookingWindowDays: z.coerce
    .number()
    .min(7, 'Booking window must be at least 1 week')
    .max(365, 'Booking window cannot exceed 1 year'),
});

type FormValues = z.infer<typeof formSchema>;

// Time slot interval options
const TIME_SLOT_INTERVALS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 20, label: '20 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
];

// Replace BOOKING_WINDOW_OPTIONS with the new options including weeks
const BOOKING_WINDOW_OPTIONS = [
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 60, label: '2 months' },
  { value: 90, label: '3 months' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
];

// Add this constant near the other options constants
const MINIMUM_NOTICE_OPTIONS = [
  { value: 60, label: '1 hour' },
  { value: 180, label: '3 hours' },
  { value: 360, label: '6 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '24 hours' }, // 1 day (default)
  { value: 2880, label: '2 days' },
  { value: 4320, label: '3 days' },
  { value: 7200, label: '5 days' },
  { value: 10080, label: '1 week' },
  { value: 20160, label: '2 weeks' },
];

// Buffer time options in minutes
const BUFFER_TIME_OPTIONS = [
  { value: 0, label: 'No buffer' },
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 20, label: '20 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

// Update DEFAULT_VALUES
const DEFAULT_VALUES: FormValues = {
  beforeEventBuffer: 10,
  afterEventBuffer: 0,
  minimumNotice: 1440, // 24 hours in minutes
  timeSlotInterval: 15,
  bookingWindowDays: 60,
};

export function SchedulingSettingsForm() {
  const [isLoading, setIsLoading] = useState(true);

  // Initialize form with react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // Fetch current settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/scheduling-settings');

        if (!response.ok) {
          throw new Error('Failed to fetch scheduling settings');
        }

        const settings = await response.json();

        // Update form with fetched settings
        form.reset({
          beforeEventBuffer: settings.beforeEventBuffer,
          afterEventBuffer: settings.afterEventBuffer,
          minimumNotice: settings.minimumNotice,
          timeSlotInterval: settings.timeSlotInterval,
          bookingWindowDays: settings.bookingWindowDays,
        });
      } catch (error) {
        console.error('Error fetching scheduling settings:', error);
        toast.error('Failed to load scheduling settings. Using default values.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [form]);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/scheduling-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to update scheduling settings');
      }

      toast.success('Scheduling settings updated successfully.');
    } catch (error) {
      console.error('Error updating scheduling settings:', error);
      toast.error('Failed to update scheduling settings.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-background p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Buffer Time Before Event */}
            <FormField
              control={form.control}
              name="beforeEventBuffer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Buffer Time Before Event</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => field.onChange(Number.parseInt(value, 10))}
                      value={field.value.toString()}
                    >
                      <SelectTrigger className="w-full border-input bg-background transition-colors hover:bg-accent/50 focus:ring-2 focus:ring-ring">
                        <SelectValue placeholder="Select buffer time before event" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUFFER_TIME_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value.toString()}
                            className="cursor-pointer transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Minutes to block before each event for preparation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Buffer Time After Event */}
            <FormField
              control={form.control}
              name="afterEventBuffer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Buffer Time After Event</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => field.onChange(Number.parseInt(value, 10))}
                      value={field.value.toString()}
                    >
                      <SelectTrigger className="w-full border-input bg-background transition-colors hover:bg-accent/50 focus:ring-2 focus:ring-ring">
                        <SelectValue placeholder="Select buffer time after event" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUFFER_TIME_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value.toString()}
                            className="cursor-pointer transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Minutes to block after each event for notes and recap
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Minimum Notice */}
            <FormField
              control={form.control}
              name="minimumNotice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Minimum Notice</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => field.onChange(Number.parseInt(value, 10))}
                      value={field.value.toString()}
                    >
                      <SelectTrigger className="w-full border-input bg-background transition-colors hover:bg-accent/50 focus:ring-2 focus:ring-ring">
                        <SelectValue placeholder="Select minimum notice period" />
                      </SelectTrigger>
                      <SelectContent>
                        {MINIMUM_NOTICE_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value.toString()}
                            className="cursor-pointer transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    How much advance notice is required for bookings
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Slot Interval */}
            <FormField
              control={form.control}
              name="timeSlotInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Time Slot Interval</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => field.onChange(Number.parseInt(value, 10))}
                      value={field.value.toString()}
                    >
                      <SelectTrigger className="w-full border-input bg-background transition-colors hover:bg-accent/50 focus:ring-2 focus:ring-ring">
                        <SelectValue placeholder="Select time slot interval" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOT_INTERVALS.map((interval) => (
                          <SelectItem
                            key={interval.value}
                            value={interval.value.toString()}
                            className="cursor-pointer transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                          >
                            {interval.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>Frequency of available time slots</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Booking Window */}
            <FormField
              control={form.control}
              name="bookingWindowDays"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel className="font-medium">Booking Window</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => field.onChange(Number.parseInt(value, 10))}
                      value={field.value.toString()}
                    >
                      <SelectTrigger className="w-full border-input bg-background transition-colors hover:bg-accent/50 focus:ring-2 focus:ring-ring">
                        <SelectValue placeholder="Select booking window" />
                      </SelectTrigger>
                      <SelectContent>
                        {BOOKING_WINDOW_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value.toString()}
                            className="cursor-pointer transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>How far in advance users can book appointments</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* About these settings section */}
            <div className="col-span-2 rounded-lg border border-border bg-card p-4">
              <h3 className="font-serif text-base font-medium">About these settings</h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-eleva-primary">•</span>
                  <span>
                    <strong>Buffer Time:</strong> Adds padding before and after events to prevent
                    back-to-back meetings
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-eleva-primary">•</span>
                  <span>
                    <strong>Minimum Notice:</strong> Prevents last-minute bookings by requiring
                    advance notice
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-eleva-primary">•</span>
                  <span>
                    <strong>Time Slot Interval:</strong> Controls how frequently booking slots
                    appear (e.g., every 15 minutes)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-eleva-primary">•</span>
                  <span>
                    <strong>Booking Window:</strong> Controls how far in advance users can schedule
                    appointments
                  </span>
                </li>
              </ul>
            </div>

            <div className="col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-eleva-primary font-medium text-white transition-colors hover:bg-eleva-primary-light focus:ring-2 focus:ring-eleva-primary/50"
              >
                {isLoading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </Card>
  );
}
