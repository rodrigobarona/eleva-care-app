'use client';

import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Skeleton } from '@/components/atoms/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/molecules/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/molecules/pagination';
import { format } from 'date-fns';
import { UserPlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Role = 'user' | 'admin' | 'superadmin' | 'top_expert' | 'community_expert';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string;
  role: Role;
}

interface UsersResponse {
  users: User[];
  totalPages: number;
  currentPage: number;
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | ''>('');

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  const fetchUsers = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users?page=${page}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data: UsersResponse = await response.json();
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role || '');
    setUserDialogOpen(true);
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !selectedRole) return;

    setUpdatingRole(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      // Update the user in the current state
      setUsers(
        users.map((user) =>
          user.id === selectedUser.id ? { ...user, role: selectedRole as Role } : user,
        ),
      );

      toast.success(`Role updated for ${selectedUser.firstName} ${selectedUser.lastName}`);
      setUserDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (page: number, e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPage(page);
  };

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700">
        <p>Error: {error}</p>
        <Button variant="outline" className="mt-2" onClick={() => fetchUsers(currentPage)}>
          Retry
        </Button>
      </div>
    );
  }

  const renderPagination = () => {
    const pages = [];
    const visiblePageCount = 5;
    const halfVisiblePages = Math.floor(visiblePageCount / 2);

    const startPage = Math.max(currentPage - halfVisiblePages, 1);
    const endPage = Math.min(startPage + visiblePageCount - 1, totalPages);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={i === currentPage}
            onClick={(e: React.MouseEvent) => handlePageClick(i, e)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return (
      <Pagination>
        <PaginationContent>
          {currentPage > 1 && (
            <PaginationItem>
              <PaginationPrevious onClick={handlePrevious} />
            </PaginationItem>
          )}

          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink onClick={(e: React.MouseEvent) => handlePageClick(1, e)}>
                  1
                </PaginationLink>
              </PaginationItem>
              {startPage > 2 && <PaginationItem>...</PaginationItem>}
            </>
          )}

          {pages}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <PaginationItem>...</PaginationItem>}
              <PaginationItem>
                <PaginationLink onClick={(e: React.MouseEvent) => handlePageClick(totalPages, e)}>
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          {currentPage < totalPages && (
            <PaginationItem>
              <PaginationNext onClick={handleNext} />
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created On</TableHead>
              <TableHead>Last Sign In</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`user-skeleton-row-${i}`}>
                    <TableCell>
                      <Skeleton className="h-6 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-9 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              : users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.email || '—'}</TableCell>
                    <TableCell>
                      {user.role ? (
                        <Badge
                          variant={
                            user.role === 'superadmin'
                              ? 'destructive'
                              : user.role === 'admin'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {user.role}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      {user.lastSignInAt
                        ? format(new Date(user.lastSignInAt), 'MMM d, yyyy')
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditRole(user)}>
                        Manage Role
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {!loading && users.length === 0 && (
        <div className="py-8 text-center">
          <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">There are no users matching your criteria.</p>
        </div>
      )}

      {!loading && users.length > 0 && renderPagination()}

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Role</DialogTitle>
            <DialogDescription>
              Update role for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <div className="font-medium">Select Role</div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={selectedRole === 'user'}
                    onChange={() => setSelectedRole('user')}
                    className="h-4 w-4"
                  />
                  <span>User (Regular access)</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={selectedRole === 'admin'}
                    onChange={() => setSelectedRole('admin')}
                    className="h-4 w-4"
                  />
                  <span>Admin (User management, system settings)</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="role"
                    value="superadmin"
                    checked={selectedRole === 'superadmin'}
                    onChange={() => setSelectedRole('superadmin')}
                    className="h-4 w-4"
                  />
                  <span>Super Admin (Full system access)</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="role"
                    value="top_expert"
                    checked={selectedRole === 'top_expert'}
                    onChange={() => setSelectedRole('top_expert')}
                    className="h-4 w-4"
                  />
                  <span>Top Expert (Featured content and moderation)</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="role"
                    value="community_expert"
                    checked={selectedRole === 'community_expert'}
                    onChange={() => setSelectedRole('community_expert')}
                    className="h-4 w-4"
                  />
                  <span>Community Expert (Content creation and community support)</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={updatingRole || !selectedRole || selectedRole === selectedUser?.role}
            >
              {updatingRole ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
