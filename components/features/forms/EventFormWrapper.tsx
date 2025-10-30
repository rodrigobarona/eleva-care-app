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
      event={{
        ...event,
        description: event.description ?? undefined,
        stripeProductId: event.stripeProductId ?? undefined,
        stripePriceId: event.stripePriceId ?? undefined,
      }}
    />
  );
}
