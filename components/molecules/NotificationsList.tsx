'use client';

import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/atoms/card';
import { markNotificationAsRead } from '@/lib/notifications';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

// Type definition for notification
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  read: boolean;
  createdAt: Date;
}

interface NotificationsListProps {
  notifications: Notification[];
  onNotificationRead?: (id: string) => void;
}

export function NotificationsList({ notifications, onNotificationRead }: NotificationsListProps) {
  const router = useRouter();
  const [readNotifications, setReadNotifications] = useState<Record<string, boolean>>({});

  if (!notifications || notifications.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        <p>No new notifications</p>
      </div>
    );
  }

  const handleAction = async (notification: Notification) => {
    try {
      // Mark as read in UI immediately for better UX
      setReadNotifications((prev) => ({ ...prev, [notification.id]: true }));

      // Mark as read in DB
      await markNotificationAsRead(notification.id);

      // Callback if provided
      if (onNotificationRead) {
        onNotificationRead(notification.id);
      }

      // Navigate if there's an action URL
      if (notification.actionUrl) {
        router.push(notification.actionUrl);
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
      toast.error('Failed to process notification');
    }
  };

  const isRead = (notification: Notification) => {
    return readNotifications[notification.id] || notification.read;
  };

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={`transition-colors ${isRead(notification) ? 'bg-muted/50' : 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20'}`}
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
              >
                {notification.type === 'VERIFICATION_HELP' ? 'Fix Verification' : 'View Details'}
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function NotificationTypeBadge({ type }: { type: string }) {
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
