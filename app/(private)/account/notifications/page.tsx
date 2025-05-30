'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent } from '@/components/atoms/card';
import { ENV_CONFIG } from '@/config/env';
import { useUser } from '@clerk/nextjs';
import { Inbox } from '@novu/nextjs';
import { CheckCircle } from 'lucide-react';

export default function NotificationsPage() {
  const { user, isLoaded } = useUser();

  // If user is not loaded, show loading state
  if (!isLoaded) {
    return (
      <div className="container max-w-5xl py-8">
        <div className="mb-8 animate-pulse">
          <div className="mb-2 h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-96 rounded bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  // If user is not loaded or no application identifier, show error
  if (!user || !ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER) {
    return (
      <div className="container max-w-5xl py-8">
        <Card>
          <CardContent className="flex items-center justify-center p-8 text-center">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-destructive">Configuration Error</h2>
              <p className="text-muted-foreground">
                Notification service is not properly configured. Please contact support.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Manage your notifications and stay updated on important changes
          </p>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Mark all as read
        </Button>
      </div>

      {/* Novu Inbox Integration using @novu/nextjs */}
      <Card>
        <CardContent className="p-6">
          <Inbox
            applicationIdentifier={ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER}
            subscriber={user.id}
            backendUrl="https://eu.api.novu.co"
            socketUrl="https://eu.ws.novu.co"
          />
        </CardContent>
      </Card>
    </div>
  );
}
