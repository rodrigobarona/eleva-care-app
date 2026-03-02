'use client';

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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { packFormSchema } from '@/schema/packs';
import { createPack, deletePack, updatePack } from '@/server/actions/packs';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

interface PackFormProps {
  events: Array<{
    id: string;
    name: string;
    price: number;
    durationInMinutes: number;
  }>;
  pack?: {
    id: string;
    eventId: string;
    name: string;
    description?: string;
    sessionsCount: number;
    price: number;
    currency: 'eur';
    isActive: boolean;
    expirationDays: number;
    stripeProductId?: string;
    stripePriceId?: string;
  };
}

export function PackForm({ events, pack }: PackFormProps) {
  const router = useRouter();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof packFormSchema>>({
    resolver: zodResolver(packFormSchema),
    defaultValues: pack ?? {
      eventId: events[0]?.id || '',
      name: '',
      description: '',
      sessionsCount: 5,
      price: 100,
      currency: 'eur',
      isActive: true,
      expirationDays: 180,
    },
  });

  const selectedEventId = form.watch('eventId');
  const sessionsCount = form.watch('sessionsCount');
  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const individualTotal = selectedEvent ? selectedEvent.price * sessionsCount : 0;
  const packPrice = form.watch('price');
  const savings = individualTotal > 0 && packPrice > 0 ? individualTotal - packPrice : 0;

  async function onSubmit(values: z.infer<typeof packFormSchema>) {
    setIsSubmitting(true);
    try {
      if (pack) {
        const result = await updatePack(pack.id, values);
        if (result?.error) {
          toast.error(result.message || 'Failed to update pack');
        }
      } else {
        const result = await createPack(values);
        if (result?.error) {
          toast.error(result.message || 'Failed to create pack');
        } else {
          toast.success('Session pack created');
          router.push('/booking/packs');
        }
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDelete() {
    if (!pack) return;
    startDeleteTransition(async () => {
      try {
        const result = await deletePack(pack.id);
        if (result?.error) {
          toast.error(result.message || 'Failed to delete pack');
        } else {
          toast.success('Session pack deleted');
          router.push('/booking/packs');
        }
      } catch (error) {
        console.error('Delete pack error:', error);
        toast.error('Failed to delete pack');
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border p-6">
          <h3 className="mb-4 text-lg font-medium">Pack Details</h3>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="eventId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name}{' '}
                          {event.price > 0 ? `(€${(event.price / 100).toFixed(2)})` : '(Free)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The event this pack applies to. Customers will use the promo code when booking
                    this event.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pack Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 5-Session Wellness Pack" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what's included in this pack..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h3 className="mb-4 text-lg font-medium">Pricing</h3>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="sessionsCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Sessions</FormLabel>
                  <FormControl>
                    <Input type="number" min={2} max={50} {...field} />
                  </FormControl>
                  <FormDescription>
                    How many sessions are included in this pack (2-50).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => {
                const [displayPrice, setDisplayPrice] = React.useState(
                  field.value ? (field.value / 100).toString() : '',
                );

                const commitValue = (val: string) => {
                  if (val === '' || val === '0') {
                    field.onChange(0);
                    setDisplayPrice('');
                    return;
                  }
                  const cents = Math.round(parseFloat(val) * 100);
                  field.onChange(Number.isNaN(cents) ? 0 : cents);
                  setDisplayPrice(Number.isNaN(cents) ? '' : (cents / 100).toFixed(2));
                };

                return (
                  <FormItem>
                    <FormLabel>Pack Price (EUR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={displayPrice}
                        onChange={(e) => setDisplayPrice(e.target.value)}
                        onBlur={(e) => commitValue(e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>Total price for the entire pack in EUR.</FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {individualTotal > 0 && packPrice > 0 && (
              <div className="rounded-lg bg-muted/50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Individual price total:</span>
                  <span>€{(individualTotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pack price:</span>
                  <span>€{(packPrice / 100).toFixed(2)}</span>
                </div>
                {savings > 0 && (
                  <div className="mt-2 flex justify-between border-t pt-2 font-medium text-green-600">
                    <span>Customer saves:</span>
                    <span>
                      €{(savings / 100).toFixed(2)} ({Math.round((savings / individualTotal) * 100)}
                      %)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h3 className="mb-4 text-lg font-medium">Settings</h3>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="expirationDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Validity Period (days)</FormLabel>
                  <FormControl>
                    <Input type="number" min={30} max={365} {...field} />
                  </FormControl>
                  <FormDescription>
                    How many days the customer has to use all sessions after purchase.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Make this pack available for purchase on your profile.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            {pack && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={isDeletePending}>
                    {isDeletePending ? 'Deleting...' : 'Delete Pack'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Session Pack</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this pack? This action cannot be undone.
                      Existing purchases and promo codes will continue to work.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/booking/packs">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? pack
                  ? 'Updating...'
                  : 'Creating...'
                : pack
                  ? 'Update Pack'
                  : 'Create Pack'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
