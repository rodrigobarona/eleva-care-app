/**
 * Client-side Role Management
 *
 * For role and permission definitions, use WorkOS RBAC:
 * @see src/types/workos-rbac.ts
 *
 * For route patterns used in proxy middleware:
 * @see src/lib/constants/roles.ts
 */

import { ADMIN_ROUTES, EXPERT_ROUTES, SPECIAL_AUTH_ROUTES } from '@/lib/constants/roles';
import {
  ADMIN_ROLES,
  EXPERT_ROLES,
  WORKOS_ROLES,
  WORKOS_ROLE_HIERARCHY,
  type WorkOSRole,
} from '@/types/workos-rbac';

// Re-export types and constants
export type { WorkOSRole };
export { WORKOS_ROLES, ADMIN_ROLES, EXPERT_ROLES };

// Re-export route patterns
export { ADMIN_ROUTES, EXPERT_ROUTES, SPECIAL_AUTH_ROUTES };

// Role priority for UI purposes (matches WORKOS_ROLE_HIERARCHY)
export const ROLE_PRIORITY = WORKOS_ROLE_HIERARCHY;

/**
 * Client-side function to get user role
 */
export async function getUserRole(userId: string): Promise<WorkOSRole> {
  const response = await fetch(`/api/users/${userId}/roles`);
  const data = await response.json();
  return data.role;
}

/**
 * Client-side function to update user role
 */
export async function updateUserRole(userId: string, role: WorkOSRole): Promise<void> {
  const response = await fetch(`/api/users/${userId}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update role');
  }
}
