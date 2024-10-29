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
} from "@/components/ui/form";
import { Input } from "../ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { meetingFormSchema } from "@/schema/meetings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDate,
  formatTimeString,
  formatTimezoneOffset,
} from "@/lib/formatters";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useMemo, useEffect, useState } from "react";
import { toZonedTime } from "date-fns-tz";
import { createMeeting } from "@/server/actions/meetings";

// Add timezone validation and normalization
const normalizeTimezone = (timezone: string) => {
  try {
    // Verify timezone is valid
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch (e) {
    // Fallback to UTC if invalid
    console.error("Invalid timezone, falling back to UTC", e);
    return "UTC";
  }
};

export function MeetingForm({
  validTimes,
  eventId,
  clerkUserId,
}: {
  validTimes: Date[];
  eventId: string;
  clerkUserId: string;
}) {
  const [isSubmitting] = useState(false);

  const form = useForm<z.infer<typeof meetingFormSchema>>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      timezone: normalizeTimezone(
        Intl.DateTimeFormat().resolvedOptions().timeZone
      ),
    },
  });

  const timezone = form.watch("timezone");
  const date = form.watch("date");
  const validTimesInTimezone = useMemo(() => {
    console.log("Debug: Converting times to timezone", {
      timezone,
      originalCount: validTimes.length,
    });

    const converted = validTimes.map((date) => {
      const zonedTime = toZonedTime(date, timezone);
      console.log("Debug: Time conversion", {
        original: date.toISOString(),
        converted: zonedTime.toISOString(),
      });
      return zonedTime;
    });

    console.log("Debug: Conversion complete", {
      convertedCount: converted.length,
    });

    return converted;
  }, [validTimes, timezone]);

  // Add this before your onSubmit function
  const ensureValidDate = (date: Date | null | undefined): Date | null => {
    if (!date) return null;
    const timestamp = date.getTime();
    return isNaN(timestamp) ? null : new Date(timestamp);
  };

  async function onSubmit(values: z.infer<typeof meetingFormSchema>) {
    try {
      const safeStartTime = ensureValidDate(values.startTime);
      if (!safeStartTime) {
        form.setError("startTime", {
          message: "Invalid date selected",
        });
        return;
      }

      console.log("Debug: Submitting form", {
        values,
        timezone: values.timezone,
        originalDate: safeStartTime.toISOString(),
        browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      const data = await createMeeting({
        ...values,
        startTime: safeStartTime,
        eventId,
        clerkUserId,
      });

      if (data?.error) {
        console.error("Debug: Submission error", {
          error: data.error,
          formData: values,
          timezone: values.timezone,
        });
        form.setError("root", {
          message: "There was an error saving your event. Please try again.",
        });
      }
    } catch (error) {
      console.error("Form submission error:", error);
      form.setError("root", {
        message: "An unexpected error occurred. Please try again.",
      });
    }
  }

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error);
      // Optionally reset form or show error message
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  onValueChange={(value) =>
                    field.onChange(new Date(Date.parse(value)))
                  }
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
                      .map((time) => (
                        <SelectItem
                          key={time.toISOString()}
                          value={time.toISOString()}
                        >
                          {formatTimeString(time)}
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
          <Button
            disabled={isSubmitting || form.formState.isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Scheduling..." : "Schedule"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
