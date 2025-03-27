'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent } from '@/components/atoms/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { NotificationsList } from '@/components/molecules/NotificationsList';
import type { NotificationType } from '@/lib/notifications';
import { CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

// Define the Notification type
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  read: boolean;
  createdAt: Date;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/notifications');

        if (!response.ok) {
          let errorMessage = `Failed to fetch notifications (HTTP ${response.status})`;
          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (parseError) {
            console.warn('Could not parse error response:', parseError);
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setNotifications(data.notifications || []);
        setError(null); // Clear any previous errors
      } catch (err) {
        // Log the error but don't show it in the UI
        console.error('Error fetching notifications:', {
          error: err,
          endpoint: '/api/notifications',
          timestamp: new Date().toISOString(),
        });
        // Set error state to hide the section
        setError('hidden');
        // Clear notifications to prevent showing stale data
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, []);

  // If there's an error or loading, don't show the section
  if (error === 'hidden' || loading) {
    return null;
  }

  async function handleNotificationRead(id: string) {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        let errorMessage = `Failed to mark notifications as read (HTTP ${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      // Update local state after successful API call
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? `Failed to mark notification as read: ${err.message}`
          : 'Failed to mark notification as read: Unknown error';
      setError(errorMessage);
      console.error('Error marking notification as read:', {
        error: err,
        notificationId: id,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async function handleMarkAllRead() {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      if (!response.ok) {
        let errorMessage = `Failed to mark all notifications as read (HTTP ${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      // Clear all notifications from local state
      setNotifications([]);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? `Failed to mark all notifications as read: ${err.message}`
          : 'Failed to mark all notifications as read: Unknown error';
      setError(errorMessage);
      console.error('Error marking all notifications as read:', {
        error: err,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Filter notifications by type
  const verificationNotifications = notifications.filter((n) => n.type === 'VERIFICATION_HELP');
  const accountNotifications = notifications.filter((n) => n.type === 'ACCOUNT_UPDATE');
  const securityNotifications = notifications.filter((n) => n.type === 'SECURITY_ALERT');
  const systemNotifications = notifications.filter((n) => n.type === 'SYSTEM_MESSAGE');

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Manage your notifications and stay updated on important changes
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead} className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all" className="relative">
              All
              {unreadCount > 0 && (
                <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-6">
          <TabsContent value="all">
            {loading ? (
              <div className="space-y-4">
                <div className="h-24 animate-pulse rounded-lg bg-muted" />
                <div className="h-24 animate-pulse rounded-lg bg-muted" />
              </div>
            ) : error ? (
              <Card>
                <CardContent className="flex items-center justify-center p-6 text-destructive">
                  {error}
                </CardContent>
              </Card>
            ) : notifications.length > 0 ? (
              <NotificationsList
                notifications={notifications}
                onMarkAsRead={handleNotificationRead}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
                  No notifications to display.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="verification">
            <NotificationsList
              notifications={verificationNotifications}
              onMarkAsRead={handleNotificationRead}
            />
          </TabsContent>

          <TabsContent value="account">
            <NotificationsList
              notifications={accountNotifications}
              onMarkAsRead={handleNotificationRead}
            />
          </TabsContent>

          <TabsContent value="security">
            <NotificationsList
              notifications={securityNotifications}
              onMarkAsRead={handleNotificationRead}
            />
          </TabsContent>

          <TabsContent value="system">
            <NotificationsList
              notifications={systemNotifications}
              onMarkAsRead={handleNotificationRead}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
