'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/molecules/dropdown-menu';
import { NotificationDropdown } from '@/components/notifications/secure-novu-inbox';
import { useSecureNovuCounts } from '@/hooks/use-secure-novu';
import { Bell } from 'lucide-react';
import Link from 'next/link';

interface UserNavNotificationsProps {
  showDropdown?: boolean; // Whether to show dropdown or just link to page
}

export function UserNavNotifications({ showDropdown = false }: UserNavNotificationsProps) {
  const { unreadCount, isLoading, error, isReady } = useSecureNovuCounts();

  const notificationButton = (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
      <Bell className="h-5 w-5" />

      {/* Unread Count Badge */}
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}

      {/* Loading/Error Indicator */}
      {isLoading && (
        <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-blue-500" />
      )}

      {error && (
        <span
          className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-yellow-500"
          title="Notification service unavailable"
        />
      )}

      {/* Secure Connection Indicator (only show when ready) */}
      {isReady && !isLoading && !error && (
        <span
          className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-green-500"
          title="Secure notifications ready"
        />
      )}
    </div>
  );

  // If dropdown is disabled, return a simple link
  if (!showDropdown) {
    return (
      <Link href="/account/notifications" title="Notifications">
        {notificationButton}
      </Link>
    );
  }

  // Return dropdown version
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button title="Notifications" className="focus:outline-none">
          {notificationButton}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="p-0">
        <NotificationDropdown />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
