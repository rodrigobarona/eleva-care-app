'use client';

import { SecureNovuInbox } from '@/components/notifications/secure-novu-inbox';
import { useUser } from '@clerk/nextjs';

export default function NotificationsPage() {
  const { user, isLoaded } = useUser();

  // If user is not loaded, show loading state
  if (!isLoaded) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="mb-8 animate-pulse">
          <div className="mb-2 h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-96 rounded bg-muted" />
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  // If user is not loaded, show error
  if (!user) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
          <h2 className="mb-2 text-lg font-semibold text-destructive">Authentication Error</h2>
          <p className="text-muted-foreground">Please log in to view your notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Clean Page Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Stay updated with your important messages and activity
        </p>
      </div>

      {/* Main Notifications Widget - Clean and Focused */}
      <div className="rounded-lg border bg-card">
        <SecureNovuInbox />
      </div>
    </div>
  );
}
