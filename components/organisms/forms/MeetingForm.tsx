"use client";
import React from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/molecules/form";
import { Input } from "@/components/atoms/input";
import { Button } from "@/components/atoms/button";
import { Textarea } from "@/components/atoms/textarea";
import { meetingFormSchema } from "@/schema/meetings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/select";
import { formatTimezoneOffset } from "@/lib/formatters";
import { Calendar } from "@/components/molecules/calendar";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { createMeeting } from "@/server/actions/meetings";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { startOfDay } from "date-fns";
import { format } from "date-fns";
import { Globe } from "lucide-react";

type MeetingFormProps = {
  validTimes: Date[];
  eventId: string;
  clerkUserId: string;
  price: number;
};

export function MeetingForm({
  validTimes,
  eventId,
  clerkUserId,
}: MeetingFormProps) {
  const [use24Hour, setUse24Hour] = React.useState(false);
  const [step, setStep] = React.useState(1);

  const form = useForm<z.infer<typeof meetingFormSchema>>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const timezone = form.watch("timezone");
  const date = form.watch("date");
  const startTime = form.watch("startTime");

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

  React.useEffect(() => {
    // Set the first available date as default when component mounts
    if (validTimes.length > 0 && !form.getValues("date")) {
      const firstAvailableDate = startOfDay(validTimes[0]);
      form.setValue("date", firstAvailableDate);
    }
  }, [validTimes, form]);

  // Watch for changes in date
  React.useEffect(() => {
    if (
      date &&
      form.getValues("date")?.toDateString() !== date.toDateString()
    ) {
      form.setValue("startTime", null as unknown as Date);
      if (step === 2) {
        setStep(1);
      }
    }
  }, [date, form, step]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {step === 1 ? (
          <>
            <div className="grid md:grid-cols-[minmax(auto,800px),300px] gap-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <FormLabel className="text-lg font-semibold">
                    Select a Date
                  </FormLabel>
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem className="flex-shrink-0">
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-70 h-9 text-sm border-0 shadow-none">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                <SelectValue
                                  placeholder={timezone.replace("_", " ")}
                                />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Intl.supportedValuesOf("timeZone").map(
                              (timezone) => (
                                <SelectItem
                                  key={timezone}
                                  value={timezone}
                                  className="text-sm"
                                >
                                  {timezone
                                    .replace("_", " ")
                                    .replace("/", " - ")}
                                  {` (${formatTimezoneOffset(timezone)})`}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => {
                          const dateKey = startOfDay(date).toISOString();
                          return !timesByDate[dateKey];
                        }}
                        showOutsideDays={false}
                        fixedWeeks
                        className="rounded-md border w-full p-4"
                        classNames={{
                          months:
                            "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                          month: "space-y-4 w-full",
                          caption:
                            "flex justify-start pt-1 relative items-center gap-1",
                          caption_label: "text-lg font-semibold",
                          caption_dropdowns: "flex gap-1",
                          nav: "flex items-center gap-1",
                          nav_button: cn(
                            "h-9 w-9 bg-transparent p-0 hover:opacity-100 opacity-75"
                          ),
                          nav_button_previous: "absolute right-7",
                          nav_button_next: "absolute right-0",
                          table: "w-full border-collapse",
                          head_row: "flex w-full",
                          head_cell:
                            "h-6 w-14 font-normal text-sm text-muted-foreground uppercase",
                          row: "flex w-full",
                          cell: "h-14 w-14 relative  p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md [&:has([aria-selected])]:rounded-md",

                          day: cn(
                            "h-14 w-14 p-0 font-normal text-base aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground"
                          ),
                          day_range_start: "day-range-start",
                          day_range_end: "day-range-end",
                          day_selected: cn(
                            "bg-[#1c1c1c] text-white hover:bg-[#1c1c1c] hover:text-white focus:bg-[#1c1c1c] focus:text-white",
                            "after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-white"
                          ),
                          day_today: "bg-accent text-accent-foreground",
                          day_outside:
                            "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                          day_disabled: "text-muted-foreground opacity-50",
                          day_hidden: "invisible",
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <FormLabel className="text-lg font-semibold">
                    {date ? format(date, "EE, MMM d") : "Available Times"}
                  </FormLabel>
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
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <div
                        className="grid gap-2 overflow-y-auto pr-4"
                        style={{
                          maxHeight: "calc(470px - 3rem)", // Increased height
                          scrollbarGutter: "stable",
                        }}
                      >
                        {date &&
                          timesByDate[startOfDay(date).toISOString()]?.map(
                            ({ utcDate, displayTime }) => (
                              <Button
                                key={utcDate.toISOString()}
                                type="button"
                                variant="outline"
                                className={cn(
                                  "justify-center text-center h-12 text-base",
                                  field.value?.toISOString() ===
                                    utcDate.toISOString()
                                    ? "border-primary bg-primary/5 font-medium"
                                    : "hover:border-primary/50"
                                )}
                                onClick={() => {
                                  field.onChange(utcDate);
                                  if (date) {
                                    setStep(2);
                                  }
                                }}
                              >
                                {displayTime}
                              </Button>
                            )
                          )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2">
                Confirm your meeting details
              </h2>
              <p className="text-muted-foreground">
                {date && format(date, "EEEE, MMMM d")} at{" "}
                {startTime &&
                  formatInTimeZone(
                    startTime,
                    timezone,
                    use24Hour ? "HH:mm" : "h:mm a"
                  )}
              </p>
            </div>

            <div className="flex gap-4 flex-col md:flex-row">
              <FormField
                control={form.control}
                name="guestName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="font-semibold">Your Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="border rounded-md" />
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
                    <FormLabel className="font-semibold">Your Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        className="border rounded-md"
                      />
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
                  <FormLabel className="font-semibold">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      className="resize-none border rounded-md"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button disabled={form.formState.isSubmitting} type="submit">
                Schedule
              </Button>
            </div>
          </>
        )}
      </form>
    </Form>
  );
}
