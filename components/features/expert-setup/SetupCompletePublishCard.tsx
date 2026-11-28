'use client';

import { ProfilePublishToggle } from '@/components/features/profile/ProfilePublishToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@clerk/nextjs';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface SetupCompletePublishCardProps {
  isPublished: boolean;
  onPublishStatusChange?: (isPublished: boolean) => void;
}

export function SetupCompletePublishCard({
  isPublished: initialIsPublished,
  onPublishStatusChange,
}: SetupCompletePublishCardProps) {
  const { user } = useUser();
  const username = user?.username || '';
  const [isPublished, setIsPublished] = useState(initialIsPublished);

  // Sync with parent prop changes
  useEffect(() => {
    setIsPublished(initialIsPublished);
  }, [initialIsPublished]);

  // The toggle reports changes directly (no polling: a 2s interval called a server
  // action, i.e. Clerk + DB work, for as long as the setup page stayed open).
  // Changes made in another tab are picked up by the setup page's visibility refresh.
  const handlePublishedChange = (newStatus: boolean) => {
    setIsPublished(newStatus);
    onPublishStatusChange?.(newStatus);
  };

  return (
    <div className="mb-10 rounded-xl border-2 border-green-100 bg-green-50 p-8 text-center shadow-sm">
      <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
      <h2 className="mb-2 text-2xl font-bold text-green-800">Setup Complete!</h2>
      <p className="mb-6 text-green-700">
        Congratulations! You&apos;ve completed all the required steps to set up your expert profile.
      </p>

      <Card className="mx-auto max-w-md">
        <CardContent className="pt-6">
          <h3 className="mb-3 text-lg font-medium">Ready to start accepting clients?</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {isPublished
              ? 'Your profile is published! Clients can now find and book your services.'
              : 'Your profile is ready to be published. Once published, clients can find and book your services.'}
          </p>

          <div className="mt-6">
            <div className="flex flex-col items-center gap-3">
              <ProfilePublishToggle
                initialPublishedStatus={isPublished}
                onPublishedChange={handlePublishedChange}
              />

              {isPublished && username && (
                <Button asChild variant="outline" className="mt-2 w-full">
                  <Link href={`/${username}`} target="_blank">
                    Preview Your Public Profile
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
