'use client';

import { Button } from '@/components/atoms/button';
import { Separator } from '@/components/atoms/separator';
import { useAuthorization } from '@/components/molecules/AuthorizationProvider';
import { AccountForm } from '@/components/organisms/forms/AccountForm';
import { useUser } from '@clerk/nextjs';
import { ShieldAlertIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { hasAnyRole } = useAuthorization();

  // Check if user has admin or superadmin role
  const isAdmin = hasAnyRole(['admin', 'superadmin']);

  if (!isLoaded) return null;
  if (!user) return redirect('/sign-in');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Profile</h3>
          <p className="text-sm text-muted-foreground">Update your personal information.</p>
        </div>

        {isAdmin && (
          <Button asChild variant="outline" size="sm">
            <Link href="/account/users" className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4" />
              <span>Manage Users</span>
            </Link>
          </Button>
        )}
      </div>

      <Separator />

      <AccountForm />

      {isAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <div className="flex gap-2">
            <ShieldAlertIcon className="h-5 w-5 flex-shrink-0" />
            <div>
              <h4 className="font-medium">Administrator Account</h4>
              <p className="text-sm">
                You have administrator privileges. Use the Manage Users button above to configure
                user roles and permissions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
