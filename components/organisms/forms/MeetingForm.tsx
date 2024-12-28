"use client";
import React, { useMemo, useEffect, useCallback, useState } from "react";
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
import { createMeeting } from "@/server/actions/meetings";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { startOfDay } from "date-fns";
import { format } from "date-fns";
import { Globe } from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe";
import { PaymentStep } from "./PaymentStep";
import {
  useQueryStates,
  parseAsString,
  parseAsIsoDate,
  parseAsIsoDateTime,
  parseAsStringLiteral,
} from "nuqs";

// Replace the existing stripePromise initialization with:
const stripePromise = getStripePromise();

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
  price,
}: MeetingFormProps) {
  // State management
  const [use24Hour, setUse24Hour] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query state configuration
  const queryStateParsers = useMemo(
    () => ({
      step: parseAsStringLiteral(["1", "2", "3"] as const).withDefault("1"),
      date: parseAsIsoDate,
      time: parseAsIsoDateTime,
      name: parseAsString.withDefault(""),
      email: parseAsString.withDefault(""),
      timezone: parseAsString.withDefault(""),
    }),
    []
  );

  const [queryStates, setQueryStates] = useQueryStates(queryStateParsers, {
    history: "push",
    shallow: true,
    // Optional: Use shorter URL keys
    urlKeys: {
      step: "s",
      date: "d",
      time: "t",
      name: "n",
      email: "e",
      timezone: "tz",
    },
  });

  // Extract current step from queryStates
  const currentStep = queryStates.step;

  // Form initialization
  const form = useForm<z.infer<typeof meetingFormSchema>>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      // Use timezone from URL if available, otherwise use browser default
      timezone:
        queryStates.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  // Memoized values
  const timezone = form.watch("timezone");
  const date = form.watch("date");
  const startTime = form.watch("startTime");

  // Memoize timezone calculations
  const validTimesInTimezone = useMemo(() => {
    return validTimes.map((utcDate) => {
      const zonedDate = toZonedTime(utcDate, timezone);
      const displayTime = formatInTimeZone(
        utcDate,
        timezone,
        use24Hour ? "HH:mm" : "h:mm a"
      );
      const localDateOnly = startOfDay(zonedDate);

      return {
        utcDate,
        localDate: zonedDate,
        localDateOnly,
        displayTime,
      };
    });
  }, [validTimes, timezone, use24Hour]);

  // Memoize time grouping
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

  // Initialize form with first available date and timezone
  useEffect(() => {
    // Skip if already initialized with date
    if (!validTimes.length || queryStates.date) return;

    const firstAvailableDate = startOfDay(validTimes[0]);
    const initialTimezone =
      queryStates.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Set initial form values
    form.setValue("date", firstAvailableDate);
    form.setValue("timezone", initialTimezone);

    // Update URL with initial values
    setQueryStates({
      date: firstAvailableDate,
      timezone: initialTimezone,
      step: "1",
    });
  }, [
    validTimes,
    form,
    queryStates.date,
    queryStates.timezone,
    setQueryStates,
  ]);

  // Sync URL timezone to form
  useEffect(() => {
    if (
      queryStates.timezone &&
      queryStates.timezone !== form.getValues("timezone")
    ) {
      form.setValue("timezone", queryStates.timezone);
    }
  }, [queryStates.timezone, form]);

  // Helper function for date comparison
  const areDatesEqual = useCallback(
    (date1: Date | null | undefined, date2: Date | null | undefined) => {
      if (!date1 || !date2) return false;
      return date1.getTime() === date2.getTime();
    },
    []
  );

  // Sync form changes to URL - Add timezone to the existing effect
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === "change") {
        const updates: Partial<typeof queryStates> = {};

        switch (name) {
          case "date":
            if (value.date && !areDatesEqual(value.date, queryStates.date)) {
              updates.date = value.date;
            }
            break;
          case "startTime":
            if (
              value.startTime &&
              !areDatesEqual(value.startTime, queryStates.time)
            ) {
              updates.time = value.startTime;
            }
            break;
          case "guestName":
            if (value.guestName !== queryStates.name) {
              updates.name = value.guestName || "";
            }
            break;
          case "guestEmail":
            if (value.guestEmail !== queryStates.email) {
              updates.email = value.guestEmail || "";
            }
            break;
          case "timezone":
            if (value.timezone !== queryStates.timezone) {
              updates.timezone = value.timezone;
            }
            break;
        }

        if (Object.keys(updates).length > 0) {
          setQueryStates(updates);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [queryStates, form, setQueryStates, areDatesEqual]);

  // Sync URL params to form - Add timezone to the existing effect
  useEffect(() => {
    const { date, time, name, email, timezone } = queryStates;

    const currentDate = form.getValues("date");
    const currentTime = form.getValues("startTime");
    const currentName = form.getValues("guestName");
    const currentEmail = form.getValues("guestEmail");
    const currentTimezone = form.getValues("timezone");

    // Only update if values are different
    if (date && !areDatesEqual(date, currentDate)) {
      form.setValue("date", date);
    }
    if (time && !areDatesEqual(time, currentTime)) {
      form.setValue("startTime", time);
    }
    if (name !== currentName) {
      form.setValue("guestName", name);
    }
    if (email !== currentEmail) {
      form.setValue("guestEmail", email);
    }
    if (timezone && timezone !== currentTimezone) {
      form.setValue("timezone", timezone);
    }
  }, [queryStates, form, areDatesEqual]);

  const availableTimezones = useMemo(
    () => Intl.supportedValuesOf("timeZone"),
    []
  );

  const formattedTimezones = useMemo(() => {
    return availableTimezones.map((timezone) => ({
      value: timezone,
      label: `${timezone.replace("_", " ").replace("/", " - ")} (${formatTimezoneOffset(timezone)})`,
    }));
  }, [availableTimezones]);

  async function onSubmit(values: z.infer<typeof meetingFormSchema>) {
    if (currentStep === "3" && price > 0) {
      return;
    }

    try {
      const data = await createMeeting({
        ...values,
        eventId,
        clerkUserId,
      });

      if (data?.error) {
        form.setError("root", {
          message: "There was an error saving your event",
        });
      } else {
        // Ensure proper date formatting
        const startTimeISO = values.startTime.toISOString();
        window.location.href = `${window.location.pathname}/success?startTime=${encodeURIComponent(startTimeISO)}`;
      }
    } catch (error) {
      console.error("Error creating meeting:", error);
      form.setError("root", {
        message: "There was an error saving your event",
      });
    }
  }

  // Modified step handling
  const handleNextStep = async (nextStep: typeof currentStep) => {
    setIsSubmitting(true);

    try {
      if (nextStep !== "3") {
        setQueryStates({ step: nextStep });
        return;
      }

      // Handle step 3
      if (price === 0) {
        await form.handleSubmit(onSubmit)();
        return;
      }

      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          price,
          meetingData: {
            ...form.getValues(),
            clerkUserId,
            startTime: form.getValues("startTime")?.toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment intent");
      }

      const { clientSecret } = await response.json();
      if (clientSecret) {
        setClientSecret(clientSecret);
        setQueryStates({ step: "3" });
      }
    } catch (error) {
      console.error("Error:", error);
      form.setError("root", {
        message: "Failed to process request",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {currentStep === "1" ? (
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
                            {formattedTimezones.map((timezone) => (
                              <SelectItem
                                key={timezone.value}
                                value={timezone.value}
                                className="text-sm"
                              >
                                {timezone.label}
                              </SelectItem>
                            ))}
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
                        onSelect={(date) => {
                          field.onChange(date);
                          setQueryStates({ date });
                        }}
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
                                  setQueryStates({ time: utcDate });
                                  handleNextStep("2");
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
        ) : currentStep === "2" ? (
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
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setQueryStates({ name: e.target.value });
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
                  <FormItem className="flex-1">
                    <FormLabel className="font-semibold">Your Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setQueryStates({ email: e.target.value });
                        }}
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
                onClick={() => setQueryStates({ step: "1" })}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => handleNextStep("3")}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Processing..."
                  : price === 0
                    ? "Confirm Booking"
                    : "Continue to Payment"}
              </Button>
            </div>
          </>
        ) : currentStep === "3" && clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#1c1c1c",
                },
              },
            }}
          >
            <PaymentStep
              price={price}
              onBack={() => setQueryStates({ step: "2" })}
            />
          </Elements>
        ) : (
          <div>Loading payment form...</div>
        )}
      </form>
    </Form>
  );
}
