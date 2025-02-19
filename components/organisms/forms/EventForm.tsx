'use client';

import { slugify } from '@/lib/validations/slug';
import { eventFormSchema } from '@/schema/events';
import { createEvent, deleteEvent, updateEvent } from '@/server/actions/events';
import { createStripeProduct, updateStripeProduct } from '@/server/actions/stripe';
import { useUser } from '@clerk/nextjs';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import React, { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '../../atoms/button';
import { Input } from '../../atoms/input';
import { Switch } from '../../atoms/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../molecules/alert-dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../molecules/form';
import SimpleRichTextEditor from '../../molecules/RichTextEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../molecules/select';

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
    price: number;
    stripeProductId?: string;
    stripePriceId?: string;
  };
}) {
  const { user } = useUser();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isStripeProcessing, setIsStripeProcessing] = React.useState(false);

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: event ?? {
      isActive: true,
      durationInMinutes: 30,
      price: 0,
      currency: 'eur',
      name: '',
      slug: '',
    },
  });

  const [description, setDescription] = React.useState(event?.description || '');

  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'name') {
        form.setValue('slug', slugify(value.name as string), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentValue = e.target.value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');

    form.setValue('slug', currentValue, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSlugKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      const newValue = `${input.value}-`;
      form.setValue('slug', newValue, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = newValue.length;
      }, 0);
    }
  };

  const handleSubmit = async (values: z.infer<typeof eventFormSchema>) => {
    try {
      setIsStripeProcessing(true);

      // First handle Stripe if price > 0
      let stripeData = null;
      if (values.price > 0) {
        if (!event?.stripeProductId) {
          stripeData = await createStripeProduct({
            name: values.name,
            description: values.description || undefined,
            price: values.price,
            currency: values.currency,
            clerkUserId: user?.id || '',
          });
        } else if (event.stripeProductId && event.stripePriceId) {
          stripeData = await updateStripeProduct({
            stripeProductId: event.stripeProductId,
            stripePriceId: event.stripePriceId,
            name: values.name,
            description: values.description || undefined,
            price: values.price,
            currency: values.currency,
            clerkUserId: user?.id || '',
          });
        } else {
          form.setError('root', {
            message: 'Invalid Stripe product configuration',
          });
          return;
        }

        if (stripeData?.error) {
          form.setError('root', {
            message: 'Failed to sync with Stripe: ' + stripeData.error,
          });
          return;
        }
      }

      // Then create/update the event
      const action = event == null ? createEvent : updateEvent.bind(null, event.id);
      const eventData = await action({
        ...values,
        stripeProductId: stripeData?.productId || event?.stripeProductId,
        stripePriceId: stripeData?.priceId || event?.stripePriceId,
      });

      if (eventData?.error) {
        form.setError('root', {
          message: 'Failed to save event',
        });
        return;
      }

      // Use router.push instead of window.location for better navigation
      window.location.href = '/events';
    } catch (error) {
      console.error('Form submission error:', error);
      form.setError('root', {
        message: 'An unexpected error occurred',
      });
    } finally {
      setIsStripeProcessing(false);
    }
  };

  // Update the price field to show loading state when processing Stripe
  const PriceField = () => (
    <FormField
      control={form.control}
      name="price"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Price</FormLabel>
          <div className="flex items-center gap-2">
            <FormControl>
              <Input
                type="number"
                min="0"
                step="0.01"
                {...field}
                disabled={isStripeProcessing}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  field.onChange(Math.round(value * 100));
                }}
                value={field.value / 100}
                className="w-32"
              />
            </FormControl>
            <span className="text-muted-foreground">EUR</span>
            {isStripeProcessing && (
              <span className="text-sm text-muted-foreground">Syncing with Stripe...</span>
            )}
          </div>
          <FormDescription>
            {event?.stripeProductId ? (
              <>Connected to Stripe Product: {event.stripeProductId.slice(0, 8)}...</>
            ) : (
              'Set to 0 for free events. Price in euros.'
            )}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {form.formState.errors.root && (
          <div className="text-sm text-destructive">{form.formState.errors.root.message}</div>
        )}

        <div className="space-y-6">
          <div className="space-y-4 rounded-lg border p-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>The name users will see when booking</FormDescription>
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
                    <SimpleRichTextEditor
                      value={description}
                      onChange={(value) => {
                        setDescription(value);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe your event. You can use formatting to make it more readable.
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
                  <FormLabel>URL</FormLabel>
                  <div className="flex w-full items-center overflow-hidden rounded-md border">
                    <div className="flex h-full items-center bg-muted px-3 py-2 text-sm text-muted-foreground">
                      eleva.care/{user?.username || 'username'}/
                    </div>
                    <div className="w-px self-stretch bg-border" />
                    <FormControl>
                      <Input
                        {...field}
                        onChange={onSlugChange}
                        onKeyDown={onSlugKeyDown}
                        className="flex-1 border-0 bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="event-name"
                      />
                    </FormControl>
                  </div>
                  <FormDescription>URL-friendly version of the event name</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 rounded-lg border p-4">
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
                  <FormDescription>Choose the appropriate session duration</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </div>
                  <FormDescription>
                    Inactive events will not be visible for users to book
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <PriceField />
          </div>
        </div>

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
                    This action cannot be undone. This will permanently delete your event.
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
                          form.setError('root', {
                            message: 'There was an error deleting your event',
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
          <Button
            type="button"
            asChild
            variant="outline"
            disabled={isStripeProcessing || form.formState.isSubmitting}
          >
            <Link href="/events">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isStripeProcessing || form.formState.isSubmitting}>
            {isStripeProcessing ? 'Processing...' : 'Save'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
