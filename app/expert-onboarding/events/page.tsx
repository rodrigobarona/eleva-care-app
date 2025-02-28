'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { useExpertOnboarding } from '@/components/molecules/ExpertOnboardingProvider';
import { StepNavigationButtons } from '@/components/molecules/OnboardingStepNav';
import { EventForm } from '@/components/organisms/forms/EventForm';
import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Define Event type with required properties
type Event = {
  id: string;
  name: string;
  durationInMinutes: number;
  price: number;
};

export default function EventsStepPage() {
  const { markStepComplete, refreshStatus } = useExpertOnboarding();
  const [events, setEvents] = useState<Event[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Fetch user's events on load
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (response.ok) {
          const data = await response.json();
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
        toast.error('Failed to load your events. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleContinue = async () => {
    try {
      if (events.length === 0) {
        toast.error('Create an event first');
        return;
      }

      await markStepComplete('events');
      await refreshStatus();
      router.push('/expert-onboarding/schedule');
    } catch (error) {
      console.error('Failed to complete step:', error);
      toast.error('Failed to save your progress. Please try again.');
    }
  };

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create your events</CardTitle>
          <CardDescription>
            Define the types of sessions clients can book with you. Create at least one event to
            continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {events.length > 0 && (
                <div className="mb-6 space-y-4">
                  <h3 className="text-lg font-medium">Your events</h3>
                  <div className="space-y-4">
                    {events.map((event) => (
                      <Card key={event.id} className="p-4">
                        <div className="flex justify-between">
                          <div>
                            <h4 className="font-medium">{event.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {event.durationInMinutes} minutes ·{' '}
                              {event.price > 0 ? `€${event.price}` : 'Free'}
                            </p>
                          </div>
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/events/${event.id}`)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {isAddingEvent ? (
                <div className="mt-4">
                  <EventForm />
                </div>
              ) : (
                <Button onClick={() => setIsAddingEvent(true)} className="w-full" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Event
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <StepNavigationButtons
        onContinue={handleContinue}
        continueBtnDisabled={isLoading || events.length === 0}
        continueBtnText={events.length === 0 ? 'Create an event to continue' : 'Continue'}
      />
    </>
  );
}
