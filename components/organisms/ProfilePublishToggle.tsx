'use client';

import { Label } from '@/components/atoms/label';
import { Switch } from '@/components/atoms/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/molecules/alert-dialog';
import { toggleProfilePublication } from '@/server/actions/expert-profile';
import { checkExpertSetupStatus } from '@/server/actions/expert-setup';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ProfilePublishToggleProps {
  initialPublishedStatus: boolean;
}

export function ProfilePublishToggle({ initialPublishedStatus }: ProfilePublishToggleProps) {
  const [isPublished, setIsPublished] = useState(initialPublishedStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [incompleteSteps, setIncompleteSteps] = useState<string[]>([]);
  const [dialogMode, setDialogMode] = useState<'publish' | 'unpublish' | 'incomplete'>('publish');

  useEffect(() => {
    // Sync state with props if changed externally
    setIsPublished(initialPublishedStatus);
  }, [initialPublishedStatus]);

  async function checkCompletionStatus() {
    try {
      const setupStatus = await checkExpertSetupStatus();

      // Find incomplete steps
      const incomplete = Object.entries(setupStatus.setupStatus || {})
        .filter(([_, isComplete]) => !isComplete)
        .map(([step]) => step);

      setIncompleteSteps(incomplete);

      return incomplete.length === 0;
    } catch (error) {
      console.error('Error checking completion status:', error);
      toast.error('Failed to check profile completion status');
      return false;
    }
  }

  const getStepName = (step: string): string => {
    const stepNames: Record<string, string> = {
      profile: 'Complete your profile',
      availability: 'Set your availability',
      events: 'Create at least one service',
      identity: 'Verify your identity',
      payment: 'Connect a payment account',
    };

    return stepNames[step] || step;
  };

  const handleToggleRequest = async () => {
    if (isPublished) {
      // If currently published, confirm before unpublishing
      setDialogMode('unpublish');
      setShowConfirmDialog(true);
    } else {
      // If not published, check if all steps are complete before allowing publish
      setIsLoading(true);
      const isComplete = await checkCompletionStatus();
      setIsLoading(false);

      if (isComplete) {
        setDialogMode('publish');
        setShowConfirmDialog(true);
      } else {
        setDialogMode('incomplete');
        setShowConfirmDialog(true);
      }
    }
  };

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      // If we're unpublishing, we can proceed directly with less validation
      const result = await toggleProfilePublication();

      if (result.success) {
        setIsPublished(result.isPublished);
        toast.success(result.message);
        // Close the dialog on success
        setShowConfirmDialog(false);
      } else {
        // If the toggle failed due to incomplete steps, show which steps are missing
        if (result.incompleteSteps) {
          setIncompleteSteps(result.incompleteSteps);
          setDialogMode('incomplete');
          setShowConfirmDialog(true);
        } else {
          toast.error(result.message);
          // Close the dialog on error
          setShowConfirmDialog(false);
        }
      }
    } catch (error) {
      console.error('Error toggling profile publication:', error);
      toast.error('Failed to update publication status');
      // Close the dialog on error
      setShowConfirmDialog(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Switch
          id="profile-published"
          checked={isPublished}
          disabled={isLoading}
          onCheckedChange={handleToggleRequest}
        />
        <Label htmlFor="profile-published" className="text-sm font-medium">
          {isPublished ? (
            <span className="flex items-center text-green-600">
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Profile Published
            </span>
          ) : (
            <span className="text-muted-foreground flex items-center">
              <Info className="mr-1 h-4 w-4" />
              Profile Not Published
            </span>
          )}
        </Label>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {dialogMode === 'incomplete' ? (
              <>
                <AlertDialogTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
                  Complete All Steps First
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Your profile cannot be published until all required steps are completed. Please
                  complete the following steps:
                  <ul className="mt-3 list-disc space-y-1 pl-5">
                    {incompleteSteps.map((step) => (
                      <li key={step}>{getStepName(step)}</li>
                    ))}
                  </ul>
                </AlertDialogDescription>
              </>
            ) : dialogMode === 'publish' ? (
              <>
                <AlertDialogTitle>Publish Your Expert Profile</AlertDialogTitle>
                <AlertDialogDescription>
                  Publishing your profile will make it visible to clients searching for experts.
                  Your profile, services, and availability will be public.
                </AlertDialogDescription>
              </>
            ) : (
              <>
                <AlertDialogTitle>Unpublish Your Expert Profile</AlertDialogTitle>
                <AlertDialogDescription>
                  Unpublishing your profile will hide it from clients. You will not appear in search
                  results and clients won&apos;t be able to book your services until you publish
                  again.
                </AlertDialogDescription>
              </>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {dialogMode !== 'incomplete' && (
              <AlertDialogAction onClick={handleToggle} disabled={isLoading}>
                {dialogMode === 'publish' ? 'Publish Profile' : 'Unpublish Profile'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
