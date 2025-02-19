import React from 'react';

import { Separator } from '@/components/atoms/separator';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container relative">
      <div className="space-y-6 pb-16">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>
        <Separator className="my-6" />
        <div className="flex-1 lg:max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
