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
      console.log('[PROD] Initial timezone detection:', {
        browser: {
          timezone: browserTz,
          offset: formatTimezoneOffset(browserTz)
        },
        server: {
          timezone: 'UTC',
          offset: formatTimezoneOffset('UTC')
        }
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
    console.log('[PROD] Current timezone context:', {
      default: {
        timezone: defaultTimezone,
        offset: formatTimezoneOffset(defaultTimezone)
      },
      selected: {
        timezone: timezone,
        offset: formatTimezoneOffset(timezone)
      }
    });

    return validTimes.map((utcDate) => {
      console.log('[PROD] Time conversion details:', {
        utc: {
          raw: utcDate.toISOString(),
          display: formatTimeString(utcDate, 'UTC'),
          offset: formatTimezoneOffset('UTC')
        },
        browserLocal: {
          timezone: defaultTimezone,
          display: formatTimeString(utcDate, defaultTimezone),
          offset: formatTimezoneOffset(defaultTimezone)
        },
        selected: {
          timezone: timezone,
          display: formatTimeString(utcDate, timezone),
          offset: formatTimezoneOffset(timezone)
        }
      });

      return {
        utcDate,
        displayTime: formatTimeString(utcDate, timezone)
      };
    });
  }, [validTimes, timezone, defaultTimezone]);

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
                onValueChange={(newTimezone) => {
                  const oldTimezone = field.value;
                  console.log('[PROD] Timezone selection changing:', {
                    from: {
                      timezone: oldTimezone,
                      offset: formatTimezoneOffset(oldTimezone),
                      example: formatTimeString(new Date(), oldTimezone)
                    },
                    to: {
                      timezone: newTimezone,
                      offset: formatTimezoneOffset(newTimezone),
                      example: formatTimeString(new Date(), newTimezone)
                    },
                    browser: {
                      timezone: defaultTimezone,
                      offset: formatTimezoneOffset(defaultTimezone),
                      example: formatTimeString(new Date(), defaultTimezone)
                    },
                    utc: {
                      timezone: 'UTC',
                      offset: formatTimezoneOffset('UTC'),
                      example: formatTimeString(new Date(), 'UTC')
                    }
                  });
                  
                  field.onChange(newTimezone);
                  
                  // If there's a selected time, keep the UTC value but update display
                  const currentStartTime = form.getValues('startTime');
                  if (currentStartTime) {
                    console.log('[PROD] Updating selected time display:', {
                      utc: currentStartTime.toISOString(),
                      oldDisplay: formatTimeString(currentStartTime, oldTimezone),
                      newDisplay: formatTimeString(currentStartTime, newTimezone)
                    });
                  }
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue>
                      {field.value && `${field.value} (${formatTimezoneOffset(field.value)})`}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Intl.supportedValuesOf("timeZone").map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {`${tz} (${formatTimezoneOffset(tz)})`}
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
                        !validTimesInTimezone.some(({ utcDate }) =>
                          isSameDay(date, utcDate)
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
                      .filter(({ utcDate }) => isSameDay(utcDate, date))
                      .map(({ utcDate, displayTime }) => (
                        <SelectItem
                          key={utcDate.toISOString()}
                          value={utcDate.toISOString()}
                        >
                          {displayTime}
                        </SelectItem>
                      ))}
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
