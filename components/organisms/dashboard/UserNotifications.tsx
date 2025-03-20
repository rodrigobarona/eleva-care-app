'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent } from '@/components/atoms/card';
import { Skeleton } from '@/components/atoms/skeleton';
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
        const response = await fetch('/api/notifications');

        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }

        const data = await response.json();
        setNotifications(data.notifications || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, []);

  // Mark notification as read
  async function markAsRead(id: string) {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
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

  // If no notifications, don't show the component
  if (notifications.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <BellIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Notifications</h2>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive">{error}</div>
        )}

        <div className="space-y-4">
          {notifications.map((notification) => (
            <div key={notification.id} className="relative rounded-lg border p-4">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2"
                onClick={() => markAsRead(notification.id)}
                aria-label="Dismiss notification"
              >
                <XIcon className="h-4 w-4" />
              </Button>

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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAsRead(notification.id)}
                  className="flex items-center gap-1"
                >
                  <CheckIcon className="h-3 w-3" />
                  Mark as Read
                </Button>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                {new Date(notification.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
