'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { useUser } from '@clerk/nextjs';
import { Bell, Inbox, InboxContent } from '@novu/react';

export function UserNavNotifications() {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) return null;

  const applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER || '';

  if (!applicationIdentifier) {
    return null; // Don't render if not configured
  }

  return (
    <Inbox
      applicationIdentifier={applicationIdentifier}
      subscriberId={user.id}
      backendUrl="https://eu.api.novu.co"
      socketUrl="https://eu.ws.novu.co"
    >
      <Popover>
        <PopoverTrigger asChild>
          <div className="relative flex h-5 w-5 cursor-pointer items-center justify-center">
            <Bell />
            {/* Optionally, you can use useCounts to show a badge here */}
          </div>
        </PopoverTrigger>
        <PopoverContent className="h-[600px] w-[400px] p-0">
          <InboxContent />
        </PopoverContent>
      </Popover>
    </Inbox>
  );
}
