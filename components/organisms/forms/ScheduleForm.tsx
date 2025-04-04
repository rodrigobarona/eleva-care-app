'use client';

import { DAYS_OF_WEEK_IN_ORDER } from '@/app/data/constants';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import {
  Form,
  FormControl,
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
import { formatTimezoneOffset } from '@/lib/formatters';
import { timeToInt } from '@/lib/utils';
import { scheduleFormSchema } from '@/schema/schedule';
import { saveSchedule } from '@/server/actions/schedule';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { Fragment, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { z } from 'zod';

type Availability = {
  startTime: string;
  endTime: string;
  dayOfWeek: (typeof DAYS_OF_WEEK_IN_ORDER)[number];
};

export function ScheduleForm({
  schedule,
}: {
  schedule?: {
    timezone: string;
    availabilities: Availability[];
  };
}) {
  const [successMessage, setSuccessMessage] = useState<string>();
  const form = useForm<z.infer<typeof scheduleFormSchema>>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      timezone: schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      availabilities: schedule?.availabilities.toSorted((a, b) => {
        return timeToInt(a.startTime) - timeToInt(b.startTime);
      }),
    },
  });

  const {
    append: addAvailability,
    remove: removeAvailability,
    fields: availabilityFields,
  } = useFieldArray({ name: 'availabilities', control: form.control });

  const groupedAvailabilityFields = Object.groupBy(
    availabilityFields.map((field, index) => ({ ...field, index })),
    (availability) => availability.dayOfWeek,
  );

  async function onSubmit(values: z.infer<typeof scheduleFormSchema>) {
    const data = await saveSchedule(values);

    if (data?.error) {
      form.setError('root', {
        message: 'There was an error saving your schedule',
      });
    } else {
      setSuccessMessage('Schedule saved!');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {form.formState.errors.root && (
          <div className="text-sm text-destructive">{form.formState.errors.root.message}</div>
        )}
        {successMessage && <div className="text-sm text-green-500">{successMessage}</div>}
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
                  {Intl.supportedValuesOf('timeZone').map((timezone) => (
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

        <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-6">
          {DAYS_OF_WEEK_IN_ORDER.map((dayOfWeek) => (
            <Fragment key={dayOfWeek}>
              <div className="text-sm font-semibold capitalize">{dayOfWeek.substring(0, 3)}</div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  className="size-6 p-1"
                  variant="outline"
                  onClick={() => {
                    addAvailability({
                      dayOfWeek,
                      startTime: '9:00',
                      endTime: '17:00',
                    });
                  }}
                >
                  <Plus className="size-full" />
                </Button>
                {groupedAvailabilityFields[dayOfWeek]?.map((field, labelIndex) => (
                  <div className="flex flex-col gap-1" key={field.id}>
                    <div className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`availabilities.${field.index}.startTime`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                className="w-24"
                                aria-label={`${dayOfWeek} Start Time ${labelIndex + 1}`}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      -
                      <FormField
                        control={form.control}
                        name={`availabilities.${field.index}.endTime`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                className="w-24"
                                aria-label={`${dayOfWeek} End Time ${labelIndex + 1}`}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        className="size-6 p-1"
                        variant="destructiveGhost"
                        onClick={() => removeAvailability(field.index)}
                      >
                        <X />
                      </Button>
                    </div>
                    <FormMessage>
                      {form.formState.errors.availabilities?.at?.(field.index)?.root?.message}
                    </FormMessage>
                    <FormMessage>
                      {form.formState.errors.availabilities?.at?.(field.index)?.startTime?.message}
                    </FormMessage>
                    <FormMessage>
                      {form.formState.errors.availabilities?.at?.(field.index)?.endTime?.message}
                    </FormMessage>
                  </div>
                ))}
              </div>
            </Fragment>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button disabled={form.formState.isSubmitting} type="submit">
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}
