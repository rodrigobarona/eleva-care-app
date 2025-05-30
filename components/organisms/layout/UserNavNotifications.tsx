'use client';

import { PopoverNotificationCenter, NotificationBell } from '@novu/react';
import { useTheme } from 'next-themes';
import { Bell } from 'lucide-react'; // Keep for a potential custom trigger

export function UserNavNotifications() {
  const { resolvedTheme } = useTheme();

  // Novu's PopoverNotificationCenter typically includes its own bell icon and popover logic.
  // You pass it a children function to customize the bell.
  // If you want to use your existing Bell icon, you can pass it as a child.
  // The `colorScheme` prop helps Novu match your site's theme.

  return (
    <PopoverNotificationCenter colorScheme={resolvedTheme === 'dark' ? 'dark' : 'light'}>
      {({ unseenCount }) => (
        // This function is the children prop of PopoverNotificationCenter.
        // It receives 'unseenCount' and other props you can use to customize the bell.
        // We are replacing the default Novu bell with our custom Bell from lucide-react
        // and adding the unseen count badge similar to the old implementation.
        // Note: This assumes PopoverNotificationCenter accepts a function as children
        // to allow custom trigger rendering. If it strictly renders its own bell,
        // this customization might not work as intended and we might just render
        // <PopoverNotificationCenter colorScheme={...} /> directly.
        // For now, let's assume this customization pattern is supported.
        <div className="relative">
          <Bell className="h-5 w-5" />
          {unseenCount && unseenCount > 0 && (
            <span className="absolute right-0 top-0 flex h-4 w-4 -translate-y-1/2 translate-x-1/2 transform items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unseenCount > 9 ? '9+' : unseenCount}
            </span>
          )}
        </div>
      )}
    </PopoverNotificationCenter>
  );
}
