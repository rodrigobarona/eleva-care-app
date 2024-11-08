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
import { formatDate, formatTimezoneOffset } from "@/lib/formatters";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { createMeeting } from "@/server/actions/meetings";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { startOfDay } from "date-fns";

export function MeetingForm({
  validTimes,
  eventId,
  clerkUserId,
  username,
}: {
  validTimes: Date[];
  eventId: string;
  clerkUserId: string;
  username: string;
}) {
  const [use24Hour, setUse24Hour] = React.useState(false);

  const form = useForm<z.infer<typeof meetingFormSchema>>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const timezone = form.watch("timezone");
  const date = form.watch("date");

  const validTimesInTimezone = useMemo(() => {
    return validTimes.map((utcDate) => {
      // Convert UTC date to target timezone
      const zonedDate = toZonedTime(utcDate, timezone);

      // Get the display time in the target timezone
      const displayTime = formatInTimeZone(
        utcDate, // Original UTC date
        timezone, // Target timezone
        use24Hour ? "HH:mm" : "h:mm a" // Changed format based on use24Hour
      );

      // Get the date in target timezone for grouping
      const localDateOnly = startOfDay(zonedDate);

      // Debug logging
      console.log("[DEBUG] Time conversion:", {
        originalUTC: utcDate.toISOString(),
        timezone,
        displayTime,
        zonedDate: zonedDate.toISOString(),
        localDateOnly: localDateOnly.toISOString(),
        offset: getTimezoneOffset(timezone),
      });

      return {
        utcDate, // Original UTC date for form submission
        localDate: zonedDate,
        localDateOnly,
        displayTime,
      };
    });
  }, [validTimes, timezone, use24Hour]);

  // Group times by local date
  const timesByDate = useMemo(() => {
    return validTimesInTimezone.reduce(
      (acc, time) => {
        const dateKey = time.localDateOnly.toISOString();
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(time);
        return acc;
      },
      {} as Record<string, typeof validTimesInTimezone>
    );
  }, [validTimesInTimezone]);

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

  const timeFormatToggle = (
    <div className="flex items-center justify-end space-x-2 mb-2">
      <div className="bg-muted p-1 rounded-full flex">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-full px-4 text-sm font-normal",
            !use24Hour
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:bg-transparent hover:text-foreground"
          )}
          onClick={() => setUse24Hour(false)}
        >
          12h
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-full px-4 text-sm font-normal",
            use24Hour
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:bg-transparent hover:text-foreground"
          )}
          onClick={() => setUse24Hour(true)}
        >
          24h
        </Button>
      </div>
    </div>
  );

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
                  console.log("Timezone changed to:", value);
                  console.log("Current date value:", date);
                  field.onChange(value);
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
                      disabled={(date) => {
                        const dateKey = startOfDay(date).toISOString();
                        return !timesByDate[dateKey];
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                  <FormMessage />
                </FormItem>
              </Popover>
            )}
          />
          <div className="flex-1">
            {timeFormatToggle}
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Time</FormLabel>
                  <Select
                    disabled={date == null || timezone == null}
                    onValueChange={(value) => field.onChange(new Date(value))}
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
                      {date &&
                        timesByDate[startOfDay(date).toISOString()]?.map(
                          ({ utcDate, displayTime }) => (
                            <SelectItem
                              key={utcDate.toISOString()}
                              value={utcDate.toISOString()}
                            >
                              {displayTime}
                            </SelectItem>
                          )
                        )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
            <Link href={`/${username}`}>Cancel</Link>
          </Button>
          <Button disabled={form.formState.isSubmitting} type="submit">
            Schedule
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Helper function to get timezone offset
function getTimezoneOffset(timeZone: string) {
  const now = new Date();
  const tzTime = new Date(now.toLocaleString("en-US", { timeZone }));
  return (tzTime.getTime() - now.getTime()) / (1000 * 60);
}
