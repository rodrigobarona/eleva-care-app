'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';

export function UserNavNotifications() {
  return (
    <Link
      href="/account/notifications"
      className="relative flex h-5 w-5 items-center justify-center hover:text-foreground/80"
    >
      <Bell className="h-5 w-5" />
      {/* Badge for unseen count could be added here if needed via API call */}
    </Link>
  );
}
