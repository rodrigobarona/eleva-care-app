'use client';

import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Checkbox } from '@/components/atoms/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { useAuthorization } from '@/components/molecules/AuthorizationProvider';
import { DataTable } from '@/components/molecules/data-table';
import { ROLES, updateUserRole, type UserRole, type UserRoles } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRoles;
}

export function UserRoleManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { roles: currentUserRole } = useAuthorization();
  const isSuperAdmin = currentUserRole.includes('superadmin');

  const handleRoleUpdate = async (userId: string, newRoles: UserRoles) => {
    const promise = updateUserRole(userId, newRoles).then(async () => {
      // Refresh the users list after successful update
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch updated user list');
      }
      setUsers(data.data.users);
      return newRoles;
    });

    const rolesDisplay = Array.isArray(newRoles) ? newRoles.join(', ') : newRoles;

    toast.promise(promise, {
      loading: 'Updating roles...',
      success: () => `Roles successfully updated to ${rolesDisplay}`,
      error: (err: unknown) => (err instanceof Error ? err.message : 'Failed to update roles'),
    });

    return promise;
  };

  const MultiRoleSelector = ({ user }: { user: User }) => {
    const [open, setOpen] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(
      Array.isArray(user.role) ? user.role : [user.role],
    );

    const handleSelectRole = (role: UserRole) => {
      setSelectedRoles((current) => {
        const isSelected = current.includes(role);

        // If deselecting the last role, force "user" as a minimum
        if (isSelected && current.length === 1) {
          return ['user'];
        }

        // Toggle the role selection
        return isSelected ? current.filter((r) => r !== role) : [...current, role];
      });
    };

    const handleApplyChanges = () => {
      setIsLoading(true);
      handleRoleUpdate(user.id, selectedRoles)
        .catch((error) => {
          console.error('Failed to update roles:', error);
          // Reset to original values if the update fails
          setSelectedRoles(Array.isArray(user.role) ? user.role : [user.role]);
        })
        .finally(() => {
          setIsLoading(false);
          setOpen(false);
        });
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            aria-expanded={open}
            className="w-[200px] justify-between"
            disabled={isLoading}
          >
            <div className="flex max-w-[160px] flex-wrap gap-1 overflow-hidden">
              {selectedRoles.length > 0 ? (
                selectedRoles.map((role) => (
                  <Badge key={String(role)} className="mr-1 mb-1">
                    {role}
                  </Badge>
                ))
              ) : (
                <span>Select roles...</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <div className="border-b px-3 py-2">
            <h4 className="font-medium">Select Roles</h4>
          </div>
          <div className="max-h-[300px] overflow-auto">
            {ROLES.map((role) => (
              <label
                key={role}
                className={cn(
                  'hover:bg-muted flex cursor-pointer items-center px-3 py-2',
                  role === 'superadmin' && !isSuperAdmin && 'cursor-not-allowed opacity-50',
                )}
                htmlFor={`role-${role}`}
              >
                <Checkbox
                  checked={selectedRoles.includes(role)}
                  disabled={role === 'superadmin' && !isSuperAdmin}
                  className="mr-2"
                  id={`role-${role}`}
                  onCheckedChange={() => {
                    if (role !== 'superadmin' || isSuperAdmin) {
                      handleSelectRole(role);
                    }
                  }}
                />
                <span className="flex-1">
                  {role}
                  {role === 'superadmin' && !isSuperAdmin && ' (Requires superadmin)'}
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-end border-t p-2">
            <Button size="sm" onClick={handleApplyChanges} disabled={isLoading}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
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
      header: 'Roles',
      cell: ({ row }) => <MultiRoleSelector user={row.original} />,
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
