/**
 * Role Type Definitions
 *
 * Defines application roles and organization roles for the hybrid role system.
 *
 * Architecture:
 * - ApplicationRole: Stored in database (users.role column), controls app-level permissions
 * - OrganizationRole: Managed by WorkOS (org memberships), controls org-level permissions
 *
 * Lecturer capabilities are NOT a role -- they are granted via Stripe addon
 * subscriptions and delivered as entitlements in the JWT.
 *
 * @see _docs/02-core-systems/RBAC-NAMING-DECISIONS.md
 * @see _docs/02-core-systems/ROLE-PROGRESSION-SYSTEM.md
 */

/**
 * Application-specific roles stored in the database (users.role column).
 *
 * - `member`: Base role for all registered users (free)
 * - `expert_community`: Standard expert -- subscription-backed
 * - `expert_top`: Premium expert -- subscription-backed
 * - `admin`: Platform administrator -- full system access (WorkOS standard naming)
 */
export type ApplicationRole =
  | 'member' // Base user -- can book appointments and access member features
  | 'expert_top' // Top-tier expert -- full expert features + priority listing
  | 'expert_community' // Community expert -- standard expert features
  | 'admin'; // Platform administrator -- full system access (WorkOS standard naming)

/**
 * WorkOS organization membership roles.
 *
 * These roles are managed by WorkOS and control organization-level permissions.
 * In the org-per-user model, most users are 'owner' of their personal org.
 */
export type OrganizationRole =
  | 'owner' // Organization owner -- full control
  | 'admin' // Organization admin -- can manage members
  | 'member' // Regular member -- basic access
  | 'billing_admin'; // Billing admin -- can manage billing only

/**
 * Combined role type for functions that accept either role system
 */
export type Role = ApplicationRole | OrganizationRole;

/**
 * Role hierarchy for permission checking.
 * Higher values indicate more permissions.
 * Used for "at least" permission checks.
 */
export const APPLICATION_ROLE_HIERARCHY: Record<ApplicationRole, number> = {
  member: 0,
  expert_community: 10,
  expert_top: 20,
  admin: 100,
};

/**
 * Organization role hierarchy
 */
export const ORGANIZATION_ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  member: 0,
  billing_admin: 10,
  admin: 50,
  owner: 100,
};

/**
 * Role display names for UI.
 * Separated by role type to avoid duplicate key issues.
 */
export const APPLICATION_ROLE_DISPLAY_NAMES: Record<ApplicationRole, string> = {
  member: 'Member',
  expert_top: 'Top Expert',
  expert_community: 'Community Expert',
  admin: 'Admin',
};

export const ORGANIZATION_ROLE_DISPLAY_NAMES: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Organization Admin',
  member: 'Member',
  billing_admin: 'Billing Admin',
};

/**
 * Get display name for any role slug
 */
export function getRoleDisplayName(role: string): string {
  if (role in APPLICATION_ROLE_DISPLAY_NAMES) {
    return APPLICATION_ROLE_DISPLAY_NAMES[role as ApplicationRole];
  }
  if (role in ORGANIZATION_ROLE_DISPLAY_NAMES) {
    return ORGANIZATION_ROLE_DISPLAY_NAMES[role as OrganizationRole];
  }
  return role;
}

/**
 * Role descriptions for UI.
 * Separated by role type to avoid duplicate key issues.
 */
export const APPLICATION_ROLE_DESCRIPTIONS: Record<ApplicationRole, string> = {
  member: 'Can book appointments and access member features',
  expert_top: 'Top-tier expert with full features and priority listing',
  expert_community: 'Community expert with standard expert features',
  admin: 'Full system access with all permissions',
};

export const ORGANIZATION_ROLE_DESCRIPTIONS: Record<OrganizationRole, string> = {
  owner: 'Full control over organization settings and members',
  admin: 'Can manage organization members and settings',
  member: 'Basic organization access',
  billing_admin: 'Can manage billing and subscriptions only',
};

/**
 * Get description for any role slug
 */
export function getRoleDescription(role: string): string {
  if (role in APPLICATION_ROLE_DESCRIPTIONS) {
    return APPLICATION_ROLE_DESCRIPTIONS[role as ApplicationRole];
  }
  if (role in ORGANIZATION_ROLE_DESCRIPTIONS) {
    return ORGANIZATION_ROLE_DESCRIPTIONS[role as OrganizationRole];
  }
  return '';
}

/**
 * Check if a role is an expert role (starts with `expert_`)
 */
export function isExpertRole(role: string): boolean {
  return role.startsWith('expert_');
}

/**
 * Check if a role is an admin role
 */
export function isAdminRole(role: string): boolean {
  return role === 'admin';
}

/**
 * Get all expert application roles
 */
export function getExpertRoles(): ApplicationRole[] {
  return ['expert_top', 'expert_community'];
}

/**
 * Get role hierarchy level (higher = more permissions)
 */
export function getRoleLevel(role: string): number {
  if (role in APPLICATION_ROLE_HIERARCHY) {
    return APPLICATION_ROLE_HIERARCHY[role as ApplicationRole];
  }
  if (role in ORGANIZATION_ROLE_HIERARCHY) {
    return ORGANIZATION_ROLE_HIERARCHY[role as OrganizationRole];
  }
  return 0;
}
