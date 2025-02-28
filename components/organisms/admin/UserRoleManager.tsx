'use client';

import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import type { UserRole } from '@/lib/auth/roles';
import { Loader2, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface UserRoleManagerProps {
  userId: string;
  currentRoles: UserRole[];
  userName?: string;
}

export function UserRoleManager({ userId, currentRoles, userName }: UserRoleManagerProps) {
  const [roles, setRoles] = useState<UserRole[]>(currentRoles);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableRoles: UserRole[] = [
    'superadmin',
    'admin',
    'top_expert',
    'community_expert',
    'user',
  ];

  const handleAddRole = async () => {
    if (!selectedRole || roles.includes(selectedRole)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to add role');
      }

      setRoles([...roles, selectedRole]);
      setSelectedRole('');
      toast.success(`The ${selectedRole} role was successfully added to the user.`);
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error('There was a problem adding the role. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveRole = async (roleToRemove: UserRole) => {
    if (roles.length <= 1) {
      toast.error('Users must have at least one role.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${userId}/roles`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: roleToRemove }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove role');
      }

      setRoles(roles.filter((role) => role !== roleToRemove));
      toast.success(`The ${roleToRemove} role was successfully removed from the user.`);
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('There was a problem removing the role. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  function getRoleBadgeVariant(role: UserRole) {
    switch (role) {
      case 'superadmin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'top_expert':
        return 'warning';
      case 'community_expert':
        return 'secondary';
      default:
        return 'outline';
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>User Roles</CardTitle>
        <CardDescription>
          {userName ? `Manage roles for ${userName}` : 'Manage roles for this user'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {roles.length === 0 ? (
              <span className="text-muted-foreground">No roles assigned</span>
            ) : (
              roles.map((role) => (
                <Badge
                  key={role}
                  variant={
                    getRoleBadgeVariant(role) as
                      | 'destructive'
                      | 'default'
                      | 'secondary'
                      | 'outline'
                      | null
                  }
                >
                  {role}
                  <button
                    type="button"
                    className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onClick={() => handleRemoveRole(role)}
                    disabled={isSubmitting}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove {role} role</span>
                  </button>
                </Badge>
              ))
            )}
          </div>

          <div className="flex items-end gap-2">
            <div className="w-full max-w-xs">
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles
                    .filter((role) => !roles.includes(role))
                    .map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddRole} disabled={!selectedRole || isSubmitting} size="icon">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="sr-only">Add role</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
