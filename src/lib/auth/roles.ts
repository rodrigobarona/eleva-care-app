import {
  ADMIN_ROLES,
  ADMIN_ROUTES,
  ALL_ROLES,
  EXPERT_ROLES,
  EXPERT_ROUTES,
  PUBLIC_ROUTES,
  ROLE_ADMIN,
  ROLE_COMMUNITY_EXPERT,
  ROLE_LECTURER,
  ROLE_SUPERADMIN,
  ROLE_TOP_EXPERT,
  ROLE_USER,
  SPECIAL_AUTH_ROUTES,
} from '@/lib/constants/roles';

// Common types and constants
export type UserRole =
  | typeof ROLE_USER
  | typeof ROLE_TOP_EXPERT
  | typeof ROLE_COMMUNITY_EXPERT
  | typeof ROLE_LECTURER
  | typeof ROLE_ADMIN
  | typeof ROLE_SUPERADMIN;

export type UserRoles = UserRole | UserRole[];

export const ROLES = ALL_ROLES;

// Re-export constants for backward compatibility
export {
  ROLE_USER,
  ROLE_TOP_EXPERT,
  ROLE_COMMUNITY_EXPERT,
  ROLE_LECTURER,
  ROLE_ADMIN,
  ROLE_SUPERADMIN,
  ADMIN_ROLES,
  EXPERT_ROLES,
  PUBLIC_ROUTES,
  ADMIN_ROUTES,
  EXPERT_ROUTES,
  SPECIAL_AUTH_ROUTES,
};

// Role priority for UI purposes
export const ROLE_PRIORITY: Record<UserRole, number> = {
  [ROLE_SUPERADMIN]: 6,
  [ROLE_ADMIN]: 5,
  [ROLE_TOP_EXPERT]: 4,
  [ROLE_COMMUNITY_EXPERT]: 3,
  [ROLE_LECTURER]: 2,
  [ROLE_USER]: 1,
};

// Client-side role management
export async function getUserRole(userId: string): Promise<UserRoles> {
  const response = await fetch(`/api/users/${userId}/roles`);
  const data = await response.json();
  return data.role;
}

export async function updateUserRole(userId: string, roles: UserRoles): Promise<void> {
  const response = await fetch(`/api/users/${userId}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roles }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update role');
  }
}
