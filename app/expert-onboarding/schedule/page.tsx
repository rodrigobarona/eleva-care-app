'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Label } from '@/components/atoms/label';
import { useExpertOnboarding } from '@/components/molecules/ExpertOnboardingProvider';
import { OnboardingStepNav, StepNavigationButtons } from '@/components/molecules/OnboardingStepNav';
import { Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ScheduleStepPage() {
  const { markStepComplete, refreshStatus } = useExpertOnboarding();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Array of days for the week
  const daysOfWeek = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' },
  ];

  // Sample availability slots (you would fetch this from an API in reality)
  const availability = {
    monday: [{ start: '09:00', end: '17:00' }],
    tuesday: [{ start: '09:00', end: '17:00' }],
    wednesday: [{ start: '09:00', end: '17:00' }],
    thursday: [{ start: '09:00', end: '17:00' }],
    friday: [{ start: '09:00', end: '17:00' }],
    saturday: [{ start: '09:00', end: '17:00' }],
    sunday: [{ start: '09:00', end: '17:00' }],
  };

  const handleContinue = async () => {
    try {
      setIsSubmitting(true);

      // In a real implementation, you would save the availability to the backend
      // For this example, we just mark the step as complete
      await markStepComplete('schedule');
      await refreshStatus();

      toast.success('Schedule saved', {
        description: 'Your availability has been saved successfully.',
      });

      router.push('/expert-onboarding/profile');
    } catch (error) {
      console.error('Failed to save schedule:', error);
      toast.error('Failed to save your schedule. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      setIsSubmitting(true);
      await markStepComplete('schedule');
      await refreshStatus();
      router.push('/expert-onboarding/profile');
    } catch (error) {
      console.error('Failed to skip step:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <OnboardingStepNav currentStep="schedule" />

      <Card>
        <CardHeader>
          <CardTitle>Set Your Availability</CardTitle>
          <CardDescription>
            Define when you&apos;re available to accept bookings. You can adjust these times later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md bg-primary/10 p-4">
            <div className="flex">
              <div className="shrink-0">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-primary">Default Schedule</h3>
                <div className="mt-2 text-sm text-primary/80">
                  <p>
                    We&apos;ve created a default schedule for you based on typical business hours.
                    You can customize this now or adjust it later in your expert settings.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {daysOfWeek.map((day) => (
              <div key={day.id} className="flex items-start space-x-4 rounded-lg border p-4">
                <div className="w-32">
                  <Label className="font-medium">{day.label}</Label>
                </div>
                <div className="flex-1">
                  {availability[day.id as keyof typeof availability].length > 0 ? (
                    <div className="space-y-2">
                      {availability[day.id as keyof typeof availability].map((slot) => (
                        <div key={slot.start} className="flex items-center space-x-2">
                          <div className="rounded border px-3 py-1 text-sm">
                            {slot.start} - {slot.end}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              // Remove slot functionality would go here
                            }}
                          >
                            &times;
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          // Add slot functionality would go here
                        }}
                      >
                        Add Slot
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Not available</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Add slot functionality would go here
                        }}
                      >
                        Add Availability
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-md bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Your availability will be displayed in the client&apos;s local
              timezone. You can set buffers between meetings and adjust your availability anytime in
              your expert settings.
            </p>
          </div>

          <StepNavigationButtons
            onContinue={handleContinue}
            onSkip={handleSkip}
            continueBtnText={isSubmitting ? 'Saving...' : 'Continue'}
            continueBtnDisabled={isSubmitting}
            showSkip={true}
            skipBtnText="Skip for now"
          />
        </CardContent>
      </Card>
    </>
  );
}
