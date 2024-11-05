"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import Link from "next/link";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { meetingFormSchema } from "@/schema/meetings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  formatDate,
  formatTimeString,
  formatTimezoneOffset,
} from "@/lib/formatters";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useMemo, useEffect } from "react";
import { toZonedTime } from "date-fns-tz";
import { createMeeting } from "@/server/actions/meetings";

export function MeetingForm({
  validTimes,
  eventId,
  clerkUserId,
}: {
  validTimes: Date[];
  eventId: string;
  clerkUserId: string;
}) {
  // Get browser's timezone on client side
  const defaultTimezone = useMemo(() => {
    if (typeof window !== 'undefined') {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('[PROD] Initial browser timezone:', {
        timezone: browserTz,
        offset: formatTimezoneOffset(browserTz)
      });
      return browserTz;
    }
    return 'UTC';
  }, []);

  const form = useForm<z.infer<typeof meetingFormSchema>>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      timezone: defaultTimezone,
    },
  });

  // Watch for browser timezone changes
  useEffect(() => {
    const handleTimezoneChange = () => {
      const newBrowserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const currentTz = form.getValues('timezone');
      
      console.log('[PROD] Detected timezone change:', {
        from: `${currentTz} (${formatTimezoneOffset(currentTz)})`,
        to: `${newBrowserTz} (${formatTimezoneOffset(newBrowserTz)})`
      });

      // Update form timezone if it matches the previous browser timezone
      if (currentTz === defaultTimezone) {
        const currentStartTime = form.getValues('startTime');
        
        console.log('[PROD] Updating form timezone:', {
          startTimeBefore: currentStartTime ? {
            time: currentStartTime.toISOString(),
            formatted: formatTimeString(currentStartTime, currentTz)
          } : null
        });

        form.setValue('timezone', newBrowserTz);
        
        // Adjust the selected time if exists
        if (currentStartTime) {
          const adjustedTime = toZonedTime(currentStartTime, newBrowserTz);
          form.setValue('startTime', adjustedTime);
          
          console.log('[PROD] Time adjusted:', {
            startTimeAfter: {
              time: adjustedTime.toISOString(),
              formatted: formatTimeString(adjustedTime, newBrowserTz)
            }
          });
        }
      }
    };

    // Check for timezone changes when window regains focus
    window.addEventListener('focus', handleTimezoneChange);
    
    return () => {
      window.removeEventListener('focus', handleTimezoneChange);
    };
  }, [defaultTimezone, form]);

  const timezone = form.watch("timezone") || defaultTimezone;
  const date = form.watch("date");
  const validTimesInTimezone = useMemo(() => {
    return validTimes.map((date) => {
      console.log('[PROD] Time conversion:', {
        original: {
          date: date.toISOString(),
          timezone: 'UTC',
        },
        target: {
          timezone: timezone,
          offset: formatTimezoneOffset(timezone)
        }
      });

      const converted = toZonedTime(date, timezone);
      console.log('[PROD] Converted result:', {
        date: converted.toISOString(),
        formatted: formatTimeString(converted, timezone)
      });

      return converted;
    });
  }, [validTimes, timezone]);

  async function onSubmit(values: z.infer<typeof meetingFormSchema>) {
    const data = await createMeeting({
      ...values,
      eventId,
      clerkUserId,
    });

    if (data?.error) {
      form.setError("root", {
        message: "There was an error saving your event",
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex gap-6 flex-col"
      >
        {form.formState.errors.root && (
          <div className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </div>
        )}
        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <Select
                onValueChange={(value) => {
                  const oldOffset = formatTimezoneOffset(field.value);
                  const newOffset = formatTimezoneOffset(value);
                  console.log('[PROD] Timezone changed:', {
                    from: `${field.value} (${oldOffset})`,
                    to: `${value} (${newOffset})`
                  });
                  
                  console.log('[PROD] Current form values:', form.getValues());
                  field.onChange(value);
                  
                  const currentStartTime = form.getValues('startTime');
                  if (currentStartTime) {
                    console.log('[PROD] Time adjustment:', {
                      before: {
                        time: currentStartTime,
                        formatted: formatTimeString(currentStartTime, field.value),
                        timezone: `${field.value} (${oldOffset})`
                      },
                      after: {
                        time: toZonedTime(currentStartTime, value),
                        formatted: formatTimeString(currentStartTime, value),
                        timezone: `${value} (${newOffset})`
                      }
                    });
                    form.setValue('startTime', toZonedTime(currentStartTime, value));
                  }
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Intl.supportedValuesOf("timeZone").map((timezone) => (
                    <SelectItem key={timezone} value={timezone}>
                      {timezone}
                      {` (${formatTimezoneOffset(timezone)})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-4 flex-col md:flex-row">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <Popover>
                <FormItem className="flex-1">
                  <FormLabel>Date</FormLabel>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal flex w-full",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          formatDate(field.value)
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        !validTimesInTimezone.some((time) =>
                          isSameDay(date, time)
                        )
                      }
                      initialFocus
                    />
                  </PopoverContent>
                  <FormMessage />
                </FormItem>
              </Popover>
            )}
          />
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Time</FormLabel>
                <Select
                  disabled={date == null || timezone == null}
                  onValueChange={(value) => field.onChange(new Date(Date.parse(value)))}
                  defaultValue={field.value?.toISOString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          date == null || timezone == null
                            ? "Select a date/timezone first"
                            : "Select a meeting time"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {validTimesInTimezone
                      .filter((time) => isSameDay(time, date))
                      .map((time) => {
                        const localTime = formatTimeString(time, timezone);
                        console.log('[PROD] Time option:', {
                          utc: time.toISOString(),
                          localDisplay: localTime,
                          timezone: `${timezone} (${formatTimezoneOffset(timezone)})`
                        });
                        return (
                          <SelectItem
                            key={time.toISOString()}
                            value={time.toISOString()}
                          >
                            {localTime}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex gap-4 flex-col md:flex-row">
          <FormField
            control={form.control}
            name="guestName"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Your Name</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Your Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
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
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button
            disabled={form.formState.isSubmitting}
            type="button"
            asChild
            variant="outline"
          >
            <Link href={`/book/${clerkUserId}`}>Cancel</Link>
          </Button>
          <Button disabled={form.formState.isSubmitting} type="submit">
            Schedule
          </Button>
        </div>
      </form>
    </Form>
  );
}
