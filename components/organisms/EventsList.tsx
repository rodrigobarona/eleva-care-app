"use client";
import { CopyEventButton } from "@/components/molecules/CopyEventButton";
import { Button } from "@/components/atoms/button";
import { Card, CardDescription, CardFooter } from "@/components/atoms/card";
import { formatEventDescription } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  CalendarPlus,
  CalendarRange,
  GripVertical,
  Clock,
  ExternalLink,
  Pencil,
} from "lucide-react";
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
import { updateEventOrder, updateEventActiveState } from "@/server/actions/events";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/atoms/tooltip";
import { Switch } from "@/components/atoms/switch";

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
        loading: "Updating event order...",
        success: "Event order updated",
        error: "Failed to update event order",
      });
    }
  };

  const handleToggleActive = async (eventId: string, currentState: boolean) => {
    const promise = new Promise((resolve, reject) => {
      try {
        // Optimistically update the UI
        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event.id === eventId ? { ...event, isActive: !currentState } : event
          )
        );

        // Update the database
        updateEventActiveState(eventId, !currentState)
          .then((result) => {
            if (result?.error) throw new Error("Failed to update event");
            resolve(true);
          })
          .catch((error) => {
            setEvents((prevEvents) =>
              prevEvents.map((event) =>
                event.id === eventId ? { ...event, isActive: currentState } : event
              )
            );
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });

    toast.promise(promise, {
      loading: "Updating event...",
      success: `Event ${currentState ? "deactivated" : "activated"}`,
      error: "Failed to update event",
    });
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
                  onToggleActive={handleToggleActive}
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
  onToggleActive,
}: {
  event: Event;
  username: string;
  onToggleActive: (eventId: string, currentState: boolean) => Promise<void>;
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
              <CardDescription>{`/${username}/${event.slug}`}</CardDescription>
              <CardFooter className="p-0 mt-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatEventDescription(event.durationInMinutes)}
                  </span>
                </span>
              </CardFooter>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={event.isActive}
              onCheckedChange={() => onToggleActive(event.id, event.isActive)}
            />
            <span className="text-sm text-muted-foreground">
              {event.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="flex items-center gap-2 border-l pl-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild size="icon" variant="ghost">
                    <a
                      href={`/${username}/${event.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open event page</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <CopyEventButton
                    variant="ghost"
                    size="icon"
                    eventSlug={event.slug}
                    username={username}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy event link</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild size="icon" variant="ghost">
                    <Link href={`/events/${event.slug}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit event</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </Card>
    </div>
  );
}