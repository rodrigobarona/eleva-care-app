'use client';

import { EnhancedNotificationBell } from '@/components/integrations/novu/SecureNovuInbox';

interface UserNavNotificationsProps {
  showDropdown?: boolean; // Whether to show dropdown or just link to page
}

export function UserNavNotifications({ showDropdown = false }: UserNavNotificationsProps) {
  return <EnhancedNotificationBell showDropdown={showDropdown} />;
}
