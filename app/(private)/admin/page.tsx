'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Separator } from '@/components/atoms/separator';
import { useAuthorization } from '@/components/molecules/AuthorizationProvider';
import { LayoutGrid, Settings2, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { hasAnyRole, isLoading } = useAuthorization();

  // Check if user has admin or superadmin role
  const isAuthorized = hasAnyRole(['superadmin', 'admin']);

  // If user is not authorized, redirect them
  useEffect(() => {
    if (!isLoading && !isAuthorized) {
      router.push('/unauthorized');
    }
  }, [isLoading, isAuthorized, router]);

  // Show loading state or unauthorized message while checking
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthorized) {
    return <div>Access Denied. You need admin privileges to view this page.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Admin Dashboard</h2>
        <p className="text-muted-foreground">Manage your application settings and users.</p>
      </div>
      <Separator className="my-6" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Management</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Add, edit, or remove user roles.</div>
            <div className="mt-4">
              <Button asChild>
                <Link href="/admin/users" className="w-full">
                  Manage Users
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Settings</CardTitle>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Configure global settings for your application.
            </div>
            <div className="mt-4">
              <Button disabled variant="outline" className="w-full">
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analytics</CardTitle>
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              View usage statistics and analytics.
            </div>
            <div className="mt-4">
              <Button disabled variant="outline" className="w-full">
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
