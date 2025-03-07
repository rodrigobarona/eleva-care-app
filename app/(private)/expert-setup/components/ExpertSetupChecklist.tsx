import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

export function ExpertSetupChecklist() {
  const { user, isLoaded } = useUser();
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [hasNotified, setHasNotified] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Create a function to load setup status
  const loadSetupStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      // Call the server action to check the status
      const setupStatus = await checkExpertSetupStatus();
      
      // Update steps with the returned status
      const updatedSteps = setupSteps.map((step) => {
        return {
          ...step,
          completed: setupStatus[step.id as keyof typeof setupStatus] || false,
        };
      });
      
      setSteps(updatedSteps);
      setIsPublished(setupStatus.is_published);
    } catch (error) {
      console.error('Failed to check expert setup status:', error);
      toast.error('Failed to load your setup progress. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check for the refresh param in URL
  useEffect(() => {
    const refreshParam = searchParams.get('refresh');
    if (refreshParam === 'true') {
      loadSetupStatus();
    }
  }, [searchParams, loadSetupStatus]);

  // Initial load
  useEffect(() => {
    if (!isLoaded) return;
    loadSetupStatus();
  }, [isLoaded, loadSetupStatus]);

  // Add function to go to next step with refresh
  const goToNextStep = (href: string) => {
    const urlWithRefresh = `${href}?${new URLSearchParams({ return: 'expert-setup', refresh: 'true' })}`;
    router.push(urlWithRefresh);
  };

  return (
    <div className="space-y-8">
      {/* ... existing code ... */}
      
      {/* Modify the Next Step button to use the new function */}
      {nextIncompleteStep && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={() => goToNextStep(nextIncompleteStep.href)}
            size="lg"
            className="w-full sm:w-auto"
          >
            {`Complete ${nextIncompleteStep.name}`}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      )}
      
      {/* Add a manual refresh button */}
      <div className="flex justify-center mt-4">
        <Button
          onClick={loadSetupStatus}
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          <RefreshCw className="mr-2 w-4 h-4" />
          Refresh Status
        </Button>
      </div>
      
      {/* ... existing code ... */}
    </div>
  );
} 