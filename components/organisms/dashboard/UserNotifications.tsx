'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent } from '@/components/atoms/card';
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
    // Only run in the browser
    if (typeof window === 'undefined') return;

    async function fetchNotifications() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/notifications');

        if (!response.ok) {
          let errorMessage = `Failed to fetch notifications (HTTP ${response.status})`;

          try {
            const data = await response.json();
            if (data?.error) {
              errorMessage = data.error;
            }
          } catch (parseError) {
            // JSON parsing failed, use the default error message
            console.error(
              'Failed to parse error response:',
              parseError instanceof Error ? parseError.message : 'Unknown parsing error',
            );
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        setNotifications(data.notifications || []);
      } catch (err) {
        // Only log the error to the console, don't show in UI
        console.error(
          'Error fetching notifications:',
          err instanceof Error ? err.message : 'Unknown error',
          {
            endpoint: '/api/notifications',
            timestamp: new Date().toISOString(),
          },
        );

        // Set error to a special value to hide the component
        setError('hidden');

        // Clear any notifications to avoid showing stale data
        setNotifications([]);
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
        let errorMessage = `Failed to mark notification as read (HTTP ${response.status})`;

        try {
          const data = await response.json();
          if (data?.error) {
            errorMessage = data.error;
          }
        } catch (parseError) {
          // JSON parsing failed, use the default error message
          console.error(
            'Failed to parse error response:',
            parseError instanceof Error ? parseError.message : 'Unknown parsing error',
          );
        }

        throw new Error(errorMessage);
      }
    } catch (err) {
      // Revert state on error
      setNotifications(originalNotifications);

      // Only log the error to console, don't show in UI
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error marking notification as read:', errorMessage, {
        notificationId: id,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // If there's an error or we're loading, don't render anything
  if (error === 'hidden' || loading) {
    return null;
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
