'use client';

import { Button } from '@/components/atoms/button';
import { Separator } from '@/components/atoms/separator';
import { useAuthorization } from '@/components/molecules/AuthorizationProvider';
import UserList from '@/components/organisms/admin/UserList';
import { ShieldAlert, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UsersPage() {
  const { hasAnyRole, isLoading } = useAuthorization();
  const router = useRouter();

  // Check if user has admin or superadmin role
  const hasAdminAccess = hasAnyRole(['admin', 'superadmin']);

  // Redirect if not authorized
  useEffect(() => {
    if (!isLoading && !hasAdminAccess) {
      router.push('/unauthorized');
    }
  }, [isLoading, hasAdminAccess, router]);

  if (isLoading) return null;

  if (!hasAdminAccess) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h3 className="text-xl font-semibold">Access Denied</h3>
        <p className="max-w-md text-muted-foreground">
          You don&apos;t have permission to access this page. Only administrators can manage users.
        </p>
        <Button onClick={() => router.push('/account')}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">User Management</h3>
            <p className="text-sm text-muted-foreground">
              Manage user roles and permissions in the system.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        <Separator className="my-4" />
      </div>

      <UserList />
    </div>
  );
}
