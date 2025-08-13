'use client';

import { EnhancedNotificationBell } from '@/components/notifications/secure-novu-inbox';

interface UserNavNotificationsProps {
  showDropdown?: boolean; // Whether to show dropdown or just link to page
}

export function UserNavNotifications({ showDropdown = false }: UserNavNotificationsProps) {
  return <EnhancedNotificationBell showDropdown={showDropdown} />;
}
