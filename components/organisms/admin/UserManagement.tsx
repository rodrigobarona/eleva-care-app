'use client';

import { Button } from '@/components/atoms/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/molecules/table';
import { UserRoleManager } from '@/components/organisms/admin/UserRoleManager';
import type { UserRole } from '@/lib/auth/roles';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface AdminUser {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  roles: UserRole[];
  createdAt: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data.users);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {user.imageUrl ? (
                        <Image
                          src={user.imageUrl}
                          alt={`${user.firstName || ''} ${user.lastName || ''}`}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>
                        {user.firstName} {user.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{user.roles.join(', ')}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                    >
                      {selectedUser?.id === user.id ? 'Close' : 'Manage Roles'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedUser && (
        <div className="mt-6 rounded-lg border p-4">
          <h3 className="mb-4 text-lg font-medium">
            Manage roles for {selectedUser.firstName} {selectedUser.lastName}
          </h3>
          <UserRoleManager
            userId={selectedUser.clerkId}
            currentRoles={selectedUser.roles}
            userName={
              `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() ||
              selectedUser.email
            }
          />
        </div>
      )}
    </div>
  );
}
