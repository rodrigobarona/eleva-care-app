// Common types and constants
export type UserRole =
  | 'user'
  | 'top_expert'
  | 'community_expert'
  | 'lecturer'
  | 'admin'
  | 'superadmin';

export const ROLES = [
  'user',
  'top_expert',
  'community_expert',
  'lecturer',
  'admin',
  'superadmin',
] as const;

// Role priority for UI purposes
export const ROLE_PRIORITY: Record<UserRole, number> = {
  superadmin: 6,
  admin: 5,
  top_expert: 4,
  community_expert: 3,
  lecturer: 2,
  user: 1,
};

// Client-side role management
export async function getUserRole(userId: string): Promise<UserRole> {
  const response = await fetch(`/api/users/${userId}/roles`);
  const data = await response.json();
  return data.role;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
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
