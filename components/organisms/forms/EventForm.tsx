"use client";

import React, { useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventFormSchema } from "@/schema/events";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "../../molecules/form";
import { Input } from "../../atoms/input";
import { Button } from "../../atoms/button";
import Link from "next/link";
import { Textarea } from "../../atoms/textarea";
import { Switch } from "../../atoms/switch";
import { createEvent, deleteEvent, updateEvent } from "@/server/actions/events";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTrigger,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../../molecules/alert-dialog";
import { slugify } from "@/lib/validations/slug";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../molecules/select";

export function EventForm({
  event,
}: {
  event?: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    durationInMinutes: number;
    isActive: boolean;
  };
}) {
  const [isDeletePending, startDeleteTransition] = useTransition();
  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: event ?? {
      isActive: true,
      durationInMinutes: 30,
    },
  });

  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "name") {
        form.setValue("slug", slugify(value.name as string), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentValue = e.target.value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");

    form.setValue("slug", currentValue, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSlugKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " ") {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      const newValue = `${input.value}-`;
      form.setValue("slug", newValue, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = newValue.length;
      }, 0);
    }
  };

  async function onSubmit(values: z.infer<typeof eventFormSchema>) {
    const action =
      event == null ? createEvent : updateEvent.bind(null, event.id);
    const data = await action(values);

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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                The name user will see when booking
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="durationInMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                defaultValue={field.value.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="10">10 minutes session</SelectItem>
                  <SelectItem value="30">30 minutes session</SelectItem>
                  <SelectItem value="45">45 minutes session</SelectItem>
                  <SelectItem value="60">60 minutes session</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the appropriate session duration based on the depth of
                discussion or activity required
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea className="resize-none h-32" {...field} />
              </FormControl>
              <FormDescription>
                Optinal description of the event
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>Active</FormLabel>
              </div>
              <FormDescription>
                Inactive events will not be visable for the users to book
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Slug</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={onSlugChange}
                  onKeyDown={onSlugKeyDown}
                />
              </FormControl>
              <FormDescription>
                URL-friendly version of the event name. Can contain lowercase
                letters, numbers, and hyphens.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {event && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructiveGhost"
                  disabled={isDeletePending || form.formState.isSubmitting}
                >
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action can not be undone. This will be permanently
                    delete your event.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isDeletePending || form.formState.isSubmitting}
                    variant="destructive"
                    onClick={() => {
                      startDeleteTransition(async () => {
                        const data = await deleteEvent(event.id);

                        if (data?.error) {
                          form.setError("root", {
                            message: "There was an error deleting your event",
                          });
                        }
                      });
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button type="button" asChild variant="outline">
            <Link href="/events">Cancel</Link>
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Form>
  );
}
