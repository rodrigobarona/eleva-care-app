'use client';

import type { EventTable } from '@/drizzle/schema';
import type { InferSelectModel } from 'drizzle-orm';

import { EventForm } from './EventForm';

// Create Event type from the EventTable schema
type Event = InferSelectModel<typeof EventTable>;

export function EventFormWrapper({ event }: { event: Event }) {
  return (
    <EventForm
      key={event.id}
      eventId={event.id}
      defaultValues={{
        name: event.name,
        description: event.description ?? '',
        durationInMinutes: event.durationInMinutes,
        price: event.price,
        currency: event.currency as 'eur' | 'usd' | 'gbp',
        location: 'online', // Assuming default location
        slug: event.slug,
      }}
      isUpdate={true}
    />
  );
}
