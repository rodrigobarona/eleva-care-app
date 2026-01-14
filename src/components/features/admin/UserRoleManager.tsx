'use client';

import { DataTable } from '@/components/shared/data-table/DataTable';
import { useAuthorization } from '@/components/shared/providers/AuthorizationProvider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROLES, updateUserRole } from '@/lib/auth/roles';
import { WORKOS_ROLES, type WorkOSRole } from '@/types/workos-rbac';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name: string;
  role: WorkOSRole;
}

export function UserRoleManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { roles: currentUserRoles } = useAuthorization();
  const isSuperAdmin = currentUserRoles.includes(WORKOS_ROLES.SUPERADMIN);

  const handleRoleUpdate = async (userId: string, newRole: WorkOSRole) => {
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
      success: () => `Role successfully updated to ${newRole}`,
      error: (err: unknown) => (err instanceof Error ? err.message : 'Failed to update role'),
    });

    return promise;
  };

  const RoleSelector = ({ user }: { user: User }) => {
    const [selectedRole, setSelectedRole] = useState<WorkOSRole>(user.role);
    const [isPending, setIsPending] = useState(false);

    const handleRoleChange = async (newRole: WorkOSRole) => {
      setSelectedRole(newRole);
      setIsPending(true);
      try {
        await handleRoleUpdate(user.id, newRole);
      } catch {
        // Reset to original value on error
        setSelectedRole(user.role);
      } finally {
        setIsPending(false);
      }
    };

    return (
      <Select
        value={selectedRole}
        onValueChange={(value) => handleRoleChange(value as WorkOSRole)}
        disabled={isPending || isLoading}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((role) => (
            <SelectItem
              key={role}
              value={role}
              disabled={role === WORKOS_ROLES.SUPERADMIN && !isSuperAdmin}
            >
              {role}
              {role === WORKOS_ROLES.SUPERADMIN && !isSuperAdmin && ' (Requires superadmin)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
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
      cell: ({ row }) => <RoleSelector user={row.original} />,
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
    </div>
  );
}
