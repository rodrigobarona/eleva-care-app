'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { NotificationsList } from '@/components/molecules/NotificationsList';
import type { NotificationType } from '@/lib/notifications';
import { Bell, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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

  // Fetch notifications on page load
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications?includeRead=true');

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    // Get all unread notification IDs
    const unreadIds = notifications
      .filter((notification) => !notification.read)
      .map((notification) => notification.id);

    if (unreadIds.length === 0) {
      toast.info('No unread notifications');
      return;
    }

    try {
      // Optimistic update
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));

      // Send all IDs to be marked as read in a single request
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: unreadIds }),
      });

      if (!response.ok) {
        // Get error details from response if available
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `Failed to mark notifications as read (HTTP ${response.status})`;
        throw new Error(errorMessage);
      }

      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Rollback optimistic update
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read: !unreadIds.includes(notification.id),
        })),
      );
      toast.error('Failed to mark all as read', {
        description: error instanceof Error ? error.message : 'Please try again later',
      });
    }
  };

  const handleNotificationRead = async (id: string) => {
    try {
      // Update local state first for better UX
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, read: true } : notification,
        ),
      );

      // Then update on server
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to update notification');
    }
  };

  // Filter notifications by type
  const allNotifications = notifications;
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
          <Button variant="outline" onClick={markAllAsRead} className="flex items-center gap-2">
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

          <Button variant="ghost" size="sm" onClick={fetchNotifications} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="mt-6">
          <TabsContent value="all">
            {loading ? (
              <LoadingState />
            ) : allNotifications.length > 0 ? (
              <NotificationsList
                notifications={allNotifications as Notification[]}
                onNotificationRead={handleNotificationRead}
              />
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          <TabsContent value="verification">
            {loading ? (
              <LoadingState />
            ) : verificationNotifications.length > 0 ? (
              <NotificationsList
                notifications={verificationNotifications as Notification[]}
                onNotificationRead={handleNotificationRead}
              />
            ) : (
              <EmptyState type="verification" />
            )}
          </TabsContent>

          <TabsContent value="account">
            {loading ? (
              <LoadingState />
            ) : accountNotifications.length > 0 ? (
              <NotificationsList
                notifications={accountNotifications as Notification[]}
                onNotificationRead={handleNotificationRead}
              />
            ) : (
              <EmptyState type="account" />
            )}
          </TabsContent>

          <TabsContent value="security">
            {loading ? (
              <LoadingState />
            ) : securityNotifications.length > 0 ? (
              <NotificationsList
                notifications={securityNotifications as Notification[]}
                onNotificationRead={handleNotificationRead}
              />
            ) : (
              <EmptyState type="security" />
            )}
          </TabsContent>

          <TabsContent value="system">
            {loading ? (
              <LoadingState />
            ) : systemNotifications.length > 0 ? (
              <NotificationsList
                notifications={systemNotifications as Notification[]}
                onNotificationRead={handleNotificationRead}
              />
            ) : (
              <EmptyState type="system" />
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="mb-4 animate-pulse">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Loading notifications...</p>
      </div>
    </div>
  );
}

function EmptyState({ type }: { type?: string }) {
  let message = "You don't have any notifications";

  if (type) {
    message = `You don't have any ${type} notifications`;
  }

  return (
    <Card>
      <CardHeader className="pb-8 pt-10">
        <CardTitle className="text-center">No notifications</CardTitle>
        <CardDescription className="text-center">{message}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center pb-10">
        <Bell className="h-16 w-16 text-muted-foreground/30" />
      </CardContent>
    </Card>
  );
}
