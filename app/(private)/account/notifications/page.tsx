'use client';

import { useUser } from '@clerk/nextjs';
import { Inbox, InboxContent, useCounts, useNovu } from '@novu/react';
import Image from 'next/image';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) return null;

  const applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER || '';

  if (!applicationIdentifier) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="mb-2 text-lg font-semibold text-destructive">Configuration Error</h2>
          <p className="text-muted-foreground">
            Notification service is not properly configured. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Manage your notifications and stay updated with important events.
        </p>
      </div>

      <NotificationCenter applicationIdentifier={applicationIdentifier} subscriberId={user.id} />
    </div>
  );
}

// Define notification type based on Novu's structure
interface NotificationData {
  id: string;
  subject?: string;
  body?: string;
  avatar?: string;
  createdAt: string;
  isRead: boolean;
  data?: {
    customKey?: string;
    [key: string]: unknown;
  };
}

function NotificationCenter({
  applicationIdentifier,
  subscriberId,
}: {
  applicationIdentifier: string;
  subscriberId: string;
}) {
  return (
    <div className="space-y-4">
      <NotificationStats />

      <div className="min-h-[600px] rounded-lg border bg-card">
        <Inbox
          applicationIdentifier={applicationIdentifier}
          subscriberId={subscriberId}
          backendUrl="https://eu.api.novu.co"
          socketUrl="https://eu.ws.novu.co"
        >
          <InboxContent
            onNotificationClick={(notification: NotificationData) => {
              // Handle notification click - mark as read and show toast
              toast.info(`Opened: ${notification.subject || 'Notification'}`);
            }}
            onPrimaryActionClick={(_notification: NotificationData) => {
              // Handle primary action click
              toast.success('Primary action triggered');
            }}
            onSecondaryActionClick={(_notification: NotificationData) => {
              // Handle secondary action click
              toast.info('Secondary action triggered');
            }}
            renderNotification={(notification: NotificationData) => (
              <CustomNotificationItem notification={notification} />
            )}
          />
        </Inbox>
      </div>

      <NotificationEventListener />
    </div>
  );
}

function NotificationStats() {
  const { counts, isLoading, error } = useCounts({
    filters: [{ read: false }],
  });

  const unreadCount = counts?.[0]?.count ?? 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="mb-2 h-4 animate-pulse rounded bg-muted" />
            <div className="h-8 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load notification stats</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-lg border bg-card p-4">
        <div className="text-sm font-medium text-muted-foreground">Unread</div>
        <div className="text-2xl font-bold">{unreadCount}</div>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="text-sm font-medium text-muted-foreground">Total</div>
        <div className="text-2xl font-bold">-</div>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="text-sm font-medium text-muted-foreground">This Week</div>
        <div className="text-2xl font-bold">-</div>
      </div>
    </div>
  );
}

function CustomNotificationItem({ notification }: { notification: NotificationData }) {
  return (
    <div
      className={`border-b p-4 transition-colors hover:bg-muted/50 ${
        notification.isRead ? 'opacity-75' : 'bg-blue-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {notification.avatar && (
          <Image
            src={notification.avatar}
            alt="Avatar"
            className="h-8 w-8 rounded-full"
            width={32}
            height={32}
          />
        )}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium leading-none">
              {notification.subject || 'Notification'}
            </h4>
            <time className="text-xs text-muted-foreground">
              {new Date(notification.createdAt).toLocaleDateString()}
            </time>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">{notification.body}</p>
          {notification.data?.customKey && (
            <div className="inline-block rounded bg-blue-100 px-2 py-1 text-xs text-blue-600">
              {notification.data.customKey}
            </div>
          )}
        </div>
        {!notification.isRead && (
          <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
        )}
      </div>
    </div>
  );
}

function NotificationEventListener() {
  const novu = useNovu();

  useEffect(() => {
    if (!novu) return;

    const handleNewNotification = (data: { result?: { subject?: string } }) => {
      toast.success('New notification received!', {
        description: data.result?.subject || 'You have a new notification',
      });
    };

    const handleUnreadCountChange = (data: { result: number }) => {
      console.log('Unread count changed:', data.result);
    };

    // Set up event listeners
    novu.on('notifications.notification_received', handleNewNotification);
    novu.on('notifications.unread_count_changed', handleUnreadCountChange);

    // Cleanup event listeners
    return () => {
      novu.off('notifications.notification_received', handleNewNotification);
      novu.off('notifications.unread_count_changed', handleUnreadCountChange);
    };
  }, [novu]);

  return null;
}
