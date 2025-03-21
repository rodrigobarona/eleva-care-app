'use client';

import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/atoms/card';
import type { NotificationType } from '@/lib/notifications';
import { debounce } from 'lodash';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface NotificationListItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  read: boolean;
  createdAt: Date;
}

interface NotificationsListProps {
  notifications: NotificationListItem[];
  onMarkAsRead: (id: string) => Promise<void>;
}

// Define debounced function outside component to prevent recreation on each render
const debouncedMarkAsRead = debounce(
  async (notification: NotificationListItem, onMarkAsRead: (id: string) => Promise<void>) => {
    try {
      await onMarkAsRead(notification.id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  },
  500,
);

export function NotificationsList({ notifications, onMarkAsRead }: NotificationsListProps) {
  const router = useRouter();
  const listRef = useRef<HTMLUListElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [readNotifications, setReadNotifications] = useState<Record<string, boolean>>({});

  // Memoize isRead function
  const isRead = useCallback(
    (notification: NotificationListItem) => {
      return readNotifications[notification.id] || notification.read;
    },
    [readNotifications],
  );

  // Restore focus on component mount
  useEffect(() => {
    const lastFocusedId = localStorage.getItem('lastFocusedNotification');
    if (lastFocusedId) {
      const index = notifications.findIndex((n) => n.id === lastFocusedId);
      if (index >= 0) {
        setSelectedIndex(index);
        // Use requestAnimationFrame for more reliable timing with DOM updates
        requestAnimationFrame(() => {
          const item = listRef.current?.children[index] as HTMLElement;
          item?.focus();
          localStorage.removeItem('lastFocusedNotification');
        });
      }
    }
  }, [notifications]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    index: number,
    notification: NotificationListItem,
  ) => {
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = Math.min(index + 1, notifications.length - 1);
        setSelectedIndex(nextIndex);
        const nextItem = listRef.current?.children[nextIndex] as HTMLElement;
        nextItem?.focus();
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prevIndex = Math.max(index - 1, 0);
        setSelectedIndex(prevIndex);
        const prevItem = listRef.current?.children[prevIndex] as HTMLElement;
        prevItem?.focus();
        break;
      }
      case 'Home': {
        event.preventDefault();
        setSelectedIndex(0);
        const firstItem = listRef.current?.children[0] as HTMLElement;
        firstItem?.focus();
        break;
      }
      case 'End': {
        event.preventDefault();
        const lastIndex = notifications.length - 1;
        setSelectedIndex(lastIndex);
        const lastItem = listRef.current?.children[lastIndex] as HTMLElement;
        lastItem?.focus();
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (notification.actionUrl) {
          handleAction(notification);
        }
        break;
      }
    }
  };

  if (!notifications || notifications.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        <p>No new notifications</p>
      </div>
    );
  }

  const handleAction = async (notification: NotificationListItem) => {
    try {
      // Mark as read in UI immediately for better UX
      setReadNotifications((prev) => ({ ...prev, [notification.id]: true }));

      // Mark as read in DB with debounce
      await debouncedMarkAsRead(notification, onMarkAsRead);

      // Navigate if there's an action URL
      if (notification.actionUrl) {
        // Store last focused notification ID before navigation
        localStorage.setItem('lastFocusedNotification', notification.id);
        router.push(notification.actionUrl);
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
      toast.error('Failed to process notification');
      // Revert UI state on error
      setReadNotifications((prev) => {
        const newState = { ...prev };
        delete newState[notification.id];
        return newState;
      });
    }
  };

  return (
    <ul ref={listRef} className="space-y-4" aria-label="Notifications">
      {notifications.map((notification, index) => (
        <li key={notification.id} aria-setsize={notifications.length} aria-posinset={index + 1}>
          <Card
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, index, notification)}
            aria-selected={selectedIndex === index}
            aria-current={selectedIndex === index ? 'true' : undefined}
            className={`transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
              isRead(notification)
                ? 'bg-muted/50'
                : 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20'
            } ${selectedIndex === index ? 'ring-2 ring-ring' : ''}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  {notification.type === 'VERIFICATION_HELP' ? (
                    <span className="flex items-center">
                      <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
                      {notification.title}
                    </span>
                  ) : (
                    notification.title
                  )}
                </CardTitle>
                <NotificationTypeBadge type={notification.type} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm">{notification.message}</p>
            </CardContent>
            <CardFooter className="flex justify-between pt-0">
              <p className="text-xs text-muted-foreground">
                {new Date(notification.createdAt).toLocaleDateString()}
              </p>
              {notification.actionUrl && (
                <Button
                  size="sm"
                  variant={isRead(notification) ? 'outline' : 'default'}
                  onClick={() => handleAction(notification)}
                  aria-label={`${notification.type === 'VERIFICATION_HELP' ? 'Fix Verification' : 'View Details'} for ${notification.title}`}
                >
                  {notification.type === 'VERIFICATION_HELP' ? 'Fix Verification' : 'View Details'}
                </Button>
              )}
            </CardFooter>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function NotificationTypeBadge({ type }: { type: NotificationType }) {
  switch (type) {
    case 'VERIFICATION_HELP':
      return (
        <Badge
          variant="outline"
          className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
        >
          Verification
        </Badge>
      );
    case 'SECURITY_ALERT':
      return (
        <Badge
          variant="outline"
          className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
        >
          Security
        </Badge>
      );
    case 'ACCOUNT_UPDATE':
      return (
        <Badge
          variant="outline"
          className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
        >
          Account
        </Badge>
      );
    default:
      return <Badge variant="outline">System</Badge>;
  }
}
