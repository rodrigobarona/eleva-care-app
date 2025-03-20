'use client';

import { Button } from '@/components/atoms/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { NotificationsList } from '@/components/molecules/NotificationsList';
import type { NotificationType } from '@/lib/notifications';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Define the Notification type using the shared NotificationType enum
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  read: boolean;
  createdAt: Date;
}

export function UserNavNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Fetch notifications when opened
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications');

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications', {
        description: error instanceof Error ? error.message : 'Please try again later',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationRead = async (id: string) => {
    try {
      // Store original notifications state for rollback if needed
      const originalNotifications = notifications;

      // Optimistic update
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, read: true } : notification,
        ),
      );

      // Send request to server
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        // Get error details from response if available
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `Failed to mark notification as read (HTTP ${response.status})`;

        // Rollback optimistic update
        setNotifications(originalNotifications);
        throw new Error(errorMessage);
      }

      // Close popover on success
      setOpen(false);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Show error toast
      toast.error('Failed to update notification', {
        description: error instanceof Error ? error.message : 'Please try again later',
      });
      // Rollback optimistic update if not already done
      if (error instanceof Error && !error.message.includes('HTTP')) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === id ? { ...notification, read: false } : notification,
          ),
        );
      }
    }
  };

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`${unreadCount} unread notifications`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground"
              onClick={fetchNotifications}
            >
              Refresh
            </Button>
          )}
        </div>
        {loading ? (
          <div className="py-4 text-center text-muted-foreground">
            <p>Loading notifications...</p>
          </div>
        ) : (
          <NotificationsList
            notifications={notifications}
            onNotificationRead={handleNotificationRead}
          />
        )}
        {notifications.length > 0 && (
          <div className="mt-2 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/account/notifications')}
              className="w-full text-xs"
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
