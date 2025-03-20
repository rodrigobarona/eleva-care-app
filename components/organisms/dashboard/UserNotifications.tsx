'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/atoms/alert';
import { Button } from '@/components/atoms/button';
import { Card, CardContent } from '@/components/atoms/card';
import { Skeleton } from '@/components/atoms/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/atoms/tooltip';
import { BellIcon, CheckIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string;
  createdAt: string;
}

export function UserNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  useEffect(() => {
    async function fetchNotifications() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/notifications');

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch notifications');
        }

        const data = await response.json();
        setNotifications(data.notifications || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? `Failed to load notifications: ${err.message}`
            : 'Failed to load notifications: Unknown error';
        setError(errorMessage);
        console.error('Error fetching notifications:', {
          error: err,
          endpoint: '/api/notifications',
          timestamp: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, []);

  // Mark notification as read
  async function markAsRead(id: string) {
    // Store original state for potential rollback
    const originalNotifications = [...notifications];

    try {
      // Update local state optimistically
      setNotifications((prev) => prev.filter((n) => n.id !== id));

      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || `Failed to mark notification as read (HTTP ${response.status})`,
        );
      }
    } catch (err) {
      // Revert state on error
      setNotifications(originalNotifications);

      const errorMessage = err instanceof Error ? err.message : 'Failed to update notification';
      console.error('Error marking notification as read:', err);
      // Show error in UI
      setError(errorMessage);
    }
  }

  // If there's an error, show it prominently
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // If loading, show skeleton
  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no notifications, show a friendly message
  if (notifications.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>
          <p className="text-muted-foreground">No new notifications at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <BellIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Notifications</h2>
        </div>

        <div className="space-y-4">
          {notifications.map((notification) => (
            <div key={notification.id} className="relative rounded-lg border p-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={() => markAsRead(notification.id)}
                      aria-label="Dismiss notification"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Dismiss notification</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <h3 className="font-semibold">{notification.title}</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {notification.message}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {notification.actionUrl && (
                  <Button asChild size="sm" variant="default">
                    <Link href={notification.actionUrl}>Take Action</Link>
                  </Button>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsRead(notification.id)}
                        className="flex items-center gap-1"
                      >
                        <CheckIcon className="h-3 w-3" />
                        Mark as Read
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mark this notification as read</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                {new Date(notification.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
