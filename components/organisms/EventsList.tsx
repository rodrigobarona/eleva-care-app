"use client";
import { CopyEventButton } from "@/components/molecules/CopyEventButton";
import { Button } from "@/components/atoms/button";
import { Card, CardDescription } from "@/components/atoms/card";
import { formatEventDescription } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { CalendarPlus, CalendarRange, GripVertical } from "lucide-react";
import Link from "next/link";
import React from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateEventOrder } from "@/server/actions/events";

type Event = {
  id: string;
  slug: string;
  isActive: boolean;
  name: string;
  description: string | null;
  durationInMinutes: number;
};

interface EventsListProps {
  initialEvents: Event[];
  username: string;
}

export function EventsList({ initialEvents, username }: EventsListProps) {
  const [events, setEvents] = React.useState(initialEvents);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const promise = new Promise((resolve, reject) => {
        try {
          setEvents((items) => {
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);
            
            const newItems = arrayMove(items, oldIndex, newIndex);
            
            // Create updates array with new order values
            const updates = newItems.map((item, index) => ({
              id: item.id,
              order: index,
            }));
            
            // Immediately update the database
            updateEventOrder(updates)
              .then(() => resolve(true))
              .catch((error) => {
                console.error("Failed to update event order:", error);
                setEvents(items); // Revert on error
                reject(error);
              });
            
            return newItems;
          });
        } catch (error) {
          reject(error);
        }
      });

      toast.promise(promise, {
        loading: 'Updating event order...',
        success: 'Event order updated',
        error: 'Failed to update event order'
      });
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">
            Manage your booking events and availability.
          </p>
        </div>
        <Button asChild>
          <Link href="/events/new">
            <CalendarPlus className="mr-2 h-4 w-4" />
            New event
          </Link>
        </Button>
      </div>

      {events.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={events}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {events.map((event) => (
                <SortableEventCard
                  key={event.id}
                  event={event}
                  username={username}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <CalendarRange className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No events yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first event to start accepting bookings.
          </p>
          <Button asChild>
            <Link href="/events/new">
              <CalendarPlus className="mr-2 h-4 w-4" />
              New event
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
}

function SortableEventCard({
  event,
  username,
}: {
  event: Event;
  username: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative", isDragging && "z-50")}
    >
      <Card
        className={cn(
          "flex items-center gap-4 p-4",
          !event.isActive && "bg-muted/50",
          isDragging && "shadow-lg"
        )}
      >
        <button
          {...attributes}
          {...listeners}
          className="touch-none p-2 -m-2 hover:text-foreground text-muted-foreground"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="flex-grow min-w-0">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <h3
                className={cn(
                  "font-semibold truncate",
                  !event.isActive && "text-muted-foreground"
                )}
              >
                {event.name}
              </h3>
              <CardDescription>
                {formatEventDescription(event.durationInMinutes)}
              </CardDescription>
            </div>
            {!event.isActive && (
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full flex-shrink-0">
                Inactive
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {event.isActive && (
            <CopyEventButton
              variant="outline"
              eventSlug={event.slug}
              username={username}
            />
          )}
          <Button asChild variant="default">
            <Link href={`/events/${event.slug}/edit`}>Edit</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
