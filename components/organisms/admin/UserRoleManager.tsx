'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { useAuthorization } from '@/components/molecules/AuthorizationProvider';
import { DataTable } from '@/components/molecules/data-table';
import { Toaster } from '@/components/molecules/sonner';
import { ROLES, updateUserRole, type UserRole } from '@/lib/auth/roles';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export function UserRoleManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { role: currentUserRole } = useAuthorization();
  const isSuperAdmin = currentUserRole === 'superadmin';

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    const promise = updateUserRole(userId, newRole).then(async () => {
      // Refresh the users list after successful update
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch updated user list');
      }
      setUsers(data.data.users);
      return newRole;
    });

    toast.promise(promise, {
      loading: 'Updating role...',
      success: (role: UserRole) => `Role successfully updated to ${role}`,
      error: (err: unknown) => (err instanceof Error ? err.message : 'Failed to update role'),
    });

    return promise;
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      id: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Select
          value={row.original.role}
          onValueChange={(newRole: UserRole) => {
            setIsLoading(true);
            handleRoleUpdate(row.original.id, newRole)
              .catch((error) => {
                console.error('Failed to update role:', error);
              })
              .finally(() => setIsLoading(false));
          }}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role} disabled={role === 'superadmin' && !isSuperAdmin}>
                {role}
                {role === 'superadmin' && !isSuperAdmin && ' (Requires superadmin)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
  ];

  useEffect(() => {
    const fetchUsers = async () => {
      const promise = fetch('/api/admin/users').then(async (response) => {
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch users');
        }
        setUsers(data.data.users);
        return data;
      });

      toast.promise(promise, {
        loading: 'Loading users...',
        success: 'Users loaded successfully',
        error: (err: unknown) => (err instanceof Error ? err.message : 'Failed to fetch users'),
      });

      return promise;
    };

    setIsLoading(true);
    fetchUsers()
      .catch((error) => {
        console.error('Failed to fetch users:', error);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <DataTable columns={columns} data={users} />
      <Toaster />
    </div>
  );
}
