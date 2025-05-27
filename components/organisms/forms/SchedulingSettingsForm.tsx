/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */
'use client';

import * as z from 'zod';
import { Button } from '@/components/atoms/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/molecules/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Divider, Select, SelectItem, TextInput } from '@tremor/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

/**
 * SchedulingSettingsForm Component
 *
 * A form for managing scheduling settings like buffer times, minimum notice, and time slot intervals.
 * Similar to Cal.com's approach to managing availability and scheduling.
 */

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
    .min(0, 'Minimum notice cannot be negative')
    .max(7200, 'Minimum notice cannot exceed 5 days (7200 minutes)'),
  timeSlotInterval: z.coerce
    .number()
    .refine((val) => val % 5 === 0, 'Time slot interval must be in 5-minute increments')
    .refine((val) => val >= 5, 'Time slot interval must be at least 5 minutes')
    .refine((val) => val <= 60, 'Time slot interval cannot exceed 60 minutes'),
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

// Default values if the API fetch fails
const DEFAULT_VALUES: FormValues = {
  beforeEventBuffer: 15,
  afterEventBuffer: 15,
  minimumNotice: 60,
  timeSlotInterval: 15,
  bookingWindowDays: 60, // Default 2 months (60 days)
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
      <div className="mb-6">
        <h4 className="text-tremor-default text-tremor-content-strong dark:text-dark-tremor-content-strong font-semibold">
          Scheduling Settings
        </h4>
        <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content mt-1">
          Configure buffer times, minimum notice period, and time slot intervals for your calendar
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Buffer Time Before Event */}
            <FormField
              control={form.control}
              name="beforeEventBuffer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-tremor-default text-tremor-content-strong dark:text-dark-tremor-content-strong font-medium">
                    Buffer Time Before Event
                  </FormLabel>
                  <FormControl>
                    <TextInput
                      type="number"
                      placeholder="15"
                      min={0}
                      max={120}
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(Number(value))}
                      className="[&>*]:rounded-tremor-small border-tremor-border"
                    />
                  </FormControl>
                  <FormDescription className="text-tremor-label text-tremor-content dark:text-dark-tremor-content">
                    Minutes to block before each event
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
                  <FormLabel className="text-tremor-default text-tremor-content-strong dark:text-dark-tremor-content-strong font-medium">
                    Buffer Time After Event
                  </FormLabel>
                  <FormControl>
                    <TextInput
                      type="number"
                      placeholder="15"
                      min={0}
                      max={120}
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(Number(value))}
                      className="[&>*]:rounded-tremor-small border-tremor-border"
                    />
                  </FormControl>
                  <FormDescription className="text-tremor-label text-tremor-content dark:text-dark-tremor-content">
                    Minutes to block after each event
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
                  <FormLabel className="text-tremor-default text-tremor-content-strong dark:text-dark-tremor-content-strong font-medium">
                    Minimum Notice
                  </FormLabel>
                  <FormControl>
                    <TextInput
                      type="number"
                      placeholder="60"
                      min={0}
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(Number(value))}
                      className="[&>*]:rounded-tremor-small border-tremor-border"
                    />
                  </FormControl>
                  <FormDescription className="text-tremor-label text-tremor-content dark:text-dark-tremor-content">
                    Minimum minutes required before booking
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
                  <FormLabel className="text-tremor-default text-tremor-content-strong dark:text-dark-tremor-content-strong font-medium">
                    Time Slot Interval
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => field.onChange(Number.parseInt(value, 10))}
                      defaultValue={field.value.toString()}
                      value={field.value.toString()}
                      enableClear={false}
                      className="[&>*]:rounded-tremor-small border-tremor-border"
                    >
                      {TIME_SLOT_INTERVALS.map((interval) => (
                        <SelectItem key={interval.value} value={interval.value.toString()}>
                          {interval.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormDescription className="text-tremor-label text-tremor-content dark:text-dark-tremor-content">
                    Frequency of available time slots
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Booking Window */}
            <FormField
              control={form.control}
              name="bookingWindowDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-tremor-default text-tremor-content-strong dark:text-dark-tremor-content-strong font-medium">
                    Booking Window
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => field.onChange(Number.parseInt(value, 10))}
                      defaultValue={field.value.toString()}
                      value={field.value.toString()}
                      enableClear={false}
                      className="[&>button]:border-input [&>button]:bg-background [&>button]:ring-offset-background [&>button]:hover:bg-accent [&>button]:focus:ring-2 [&>button]:focus:ring-ring [&>button]:focus:ring-offset-2"
                    >
                      {BOOKING_WINDOW_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value.toString()}
                          className="cursor-pointer hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormDescription className="text-tremor-label text-tremor-content dark:text-dark-tremor-content">
                    How far in advance users can book appointments
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Divider className="my-6" />

          <div className="rounded-tremor-small ring-tremor-ring dark:bg-dark-tremor-background-muted dark:ring-dark-tremor-ring bg-eleva-neutral-100 p-4 ring-1 ring-inset">
            <h5 className="text-tremor-default text-tremor-content-strong dark:text-dark-tremor-content-strong mb-2 font-medium">
              About these settings
            </h5>
            <ul className="text-tremor-default text-tremor-content dark:text-dark-tremor-content space-y-2">
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
                  <strong>Time Slot Interval:</strong> Controls how frequently booking slots appear
                  (e.g., every 15 minutes)
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

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-tremor-small text-tremor-default shadow-tremor-input whitespace-nowrap bg-eleva-primary px-4 py-2.5 font-medium text-white hover:bg-eleva-primary-light dark:bg-eleva-primary dark:text-white dark:hover:bg-eleva-primary-light"
            >
              {isLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
