'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Skeleton } from '@/components/atoms/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/molecules/tabs';
import { UserManagement } from '@/components/organisms/admin/UserManagement';
import { hasRole } from '@/lib/auth/roles';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('users');

  // Check if user has superadmin or admin role
  useEffect(() => {
    async function checkAuthorization() {
      try {
        const response = await fetch('/api/auth/roles');

        if (!response.ok) {
          throw new Error('Failed to fetch roles');
        }

        const data = await response.json();
        const authorized = hasRole(data.roles, ['superadmin', 'admin']);

        setIsAuthorized(authorized);

        if (!authorized) {
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking authorization:', error);
        router.push('/');
      }
    }

    checkAuthorization();
  }, [router]);

  if (isAuthorized === null) {
    return (
      <div className="container py-10">
        <Skeleton className="mb-6 h-[50px] w-[300px]" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (isAuthorized === false) {
    return null; // We'll redirect in the useEffect
  }

  return (
    <div className="container py-10">
      <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage all users in the system. Add, edit, or remove roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure system-wide settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Settings functionality coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>View system analytics and reports</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Analytics functionality coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
