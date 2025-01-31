"use client";
import * as React from "react";
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
import {
  useQueryStates,
  parseAsString,
  parseAsIsoDate,
  parseAsIsoDateTime,
  parseAsStringLiteral,
} from "nuqs";
import {
  getCalendarEventTimes,
  hasValidTokens,
} from "@/lib/googleCalendarClient";
import { useRouter } from "next/navigation";

type MeetingFormProps = {
  validTimes: Date[];
  eventId: string;
  clerkUserId: string;
  price: number;
  username: string;
  eventSlug: string;
};

export function MeetingForm({
  validTimes,
  eventId,
  clerkUserId,
  price,
  username,
  eventSlug,
}: MeetingFormProps) {
  const router = useRouter();

  // State management
  const [use24Hour, setUse24Hour] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCalendarSynced, setIsCalendarSynced] = React.useState(true);

  // Query state configuration
  const queryStateParsers = React.useMemo(
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
    urlKeys: {
      step: "s",
      date: "d",
      time: "t",
      name: "n",
      email: "e",
      timezone: "tz",
    },
  });

  // Form initialization
  const form = useForm<z.infer<typeof meetingFormSchema>>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      timezone:
        queryStates.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  // Extract values we'll use in memos
  const timezone = form.watch("timezone");
  const date = form.watch("date");
  const startTime = form.watch("startTime");
  const currentStep = queryStates.step;

  // All memoized values
  const validTimesInTimezone = React.useMemo(() => {
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

  const timesByDate = React.useMemo(() => {
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

  const availableTimezones = React.useMemo(
    () => Intl.supportedValuesOf("timeZone"),
    []
  );

  const formattedTimezones = React.useMemo(() => {
    return availableTimezones.map((timezone) => ({
      value: timezone,
      label: `${timezone.replace("_", " ").replace("/", " - ")} (${formatTimezoneOffset(timezone)})`,
    }));
  }, [availableTimezones]);

  const onSubmit = React.useCallback(
    async (values: z.infer<typeof meetingFormSchema>) => {
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
          const startTimeISO = values.startTime.toISOString();
          window.location.href = `${window.location.pathname}/success?startTime=${encodeURIComponent(startTimeISO)}`;
        }
      } catch (error) {
        console.error("Error creating meeting:", error);
        form.setError("root", {
          message: "There was an error saving your event",
        });
      }
    },
    [currentStep, price, eventId, clerkUserId, form]
  );

  const handleNextStep = React.useCallback(
    async (nextStep: typeof currentStep) => {
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
            username,
            eventSlug,
            meetingData: {
              ...form.getValues(),
              clerkUserId,
              startTime: form.getValues("startTime")?.toISOString(),
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create checkout session");
        }

        const { url } = await response.json();
        if (url) {
          window.location.href = url;
        }
      } catch (error) {
        console.error("Error:", error);
        form.setError("root", {
          message: "Failed to process request",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      form,
      price,
      eventId,
      clerkUserId,
      onSubmit,
      setQueryStates,
      username,
      eventSlug,
    ]
  );

  // Effects
  React.useEffect(() => {
    if (!validTimes.length || queryStates.date) return;

    const firstAvailableTime = validTimes[0];
    const zonedTime = toZonedTime(
      firstAvailableTime,
      form.getValues("timezone")
    );
    const localDate = startOfDay(zonedTime);

    form.setValue("date", localDate);
    setQueryStates({ date: localDate });
  }, [validTimes, queryStates.date, form, setQueryStates]);

  React.useEffect(() => {
    const checkCalendarAccess = async () => {
      try {
        const hasValidAccess = await hasValidTokens(clerkUserId);

        if (!hasValidAccess) {
          setIsCalendarSynced(false);
          router.push(
            `/settings/calendar?redirect=${encodeURIComponent(window.location.pathname)}`
          );
          return;
        }

        // Verify we can fetch calendar events
        const now = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 2);

        await getCalendarEventTimes(clerkUserId, {
          start: now,
          end: endDate,
        });

        setIsCalendarSynced(true);
      } catch (error) {
        console.error("Calendar sync error:", error);
        setIsCalendarSynced(false);
      }
    };

    checkCalendarAccess();
  }, [clerkUserId, router]);

  // Early return for calendar sync check
  if (!isCalendarSynced) {
    return (
      <div className="text-center py-8">
        <h2 className="text-lg font-semibold mb-4">Calendar Sync Required</h2>
        <p className="text-muted-foreground mb-4">
          We need access to your Google Calendar to show available time slots.
        </p>
        <Button
          onClick={() =>
            router.push(
              `/settings/calendar?redirect=${encodeURIComponent(window.location.pathname)}`
            )
          }
        >
          Connect Google Calendar
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form className="space-y-6">
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
        ) : (
          <div>Redirecting to payment...</div>
        )}
      </form>
    </Form>
  );
}
