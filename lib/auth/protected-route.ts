/**
 * Protected Route Helper
 *
 * Simplifies authentication and role checking in Server Components.
 *
 * Usage:
 * - withAuth(): Require authentication only
 * - withAuth({ requiredRole: 'expert_top' }): Require specific role
 * - withAuth({ requiredPermission: 'expert_community' }): Require permission level
 */
import type { ApplicationRole, Role } from '@/types/roles';
import { redirect } from 'next/navigation';

import { hasPermission, hasRole } from '../integrations/workos/roles';
import { requireAuth } from './workos-session';

/**
 * Options for protected route helper
 */
interface WithAuthOptions {
  /**
   * Require exact role match
   */
  requiredRole?: Role;

  /**
   * Require permission level (includes higher roles)
   */
  requiredPermission?: ApplicationRole;

  /**
   * Where to redirect if unauthorized
   */
  redirectTo?: string;

  /**
   * Custom error message for unauthorized access
   */
  errorMessage?: string;
}

/**
 * Protect a page or route with authentication and optional role check
 *
 * @param options - Protection options
 * @returns WorkOS session if authorized
 * @throws Redirects to sign-in or specified page if unauthorized
 *
 * @example
 * ```tsx
 * // Require authentication only
 * export default async function DashboardPage() {
 *   const session = await withAuth();
 *   return <div>Welcome {session.user.firstName}</div>;
 * }
 *
 * // Require specific role
 * export default async function ExpertPage() {
 *   await withAuth({ requiredRole: 'expert_top' });
 *   return <ExpertDashboard />;
 * }
 *
 * // Require permission level (expert or higher)
 * export default async function ExpertFeaturesPage() {
 *   await withAuth({ requiredPermission: 'expert_community' });
 *   return <ExpertFeatures />;
 * }
 *
 * // Custom redirect
 * export default async function AdminPage() {
 *   await withAuth({
 *     requiredRole: 'admin',
 *     redirectTo: '/dashboard',
 *     errorMessage: 'Admin access required'
 *   });
 *   return <AdminPanel />;
 * }
 * ```
 */
export async function withAuth(options?: WithAuthOptions) {
  // Step 1: Require authentication (redirects to /sign-in if not authenticated)
  const session = await requireAuth();

  // Step 2: Check role if specified
  if (options?.requiredRole) {
    const hasRequiredRole = await hasRole(session.userId, options.requiredRole);

    if (!hasRequiredRole) {
      console.warn(`User ${session.userId} lacks required role: ${options.requiredRole}`);

      // Redirect to specified page or dashboard
      redirect(options.redirectTo || '/dashboard');
    }
  }

  // Step 3: Check permission level if specified
  if (options?.requiredPermission) {
    const hasRequiredPermission = await hasPermission(session.userId, options.requiredPermission);

    if (!hasRequiredPermission) {
      console.warn(
        `User ${session.userId} lacks required permission: ${options.requiredPermission}`,
      );

      // Redirect to specified page or dashboard
      redirect(options.redirectTo || '/dashboard');
    }
  }

  return session;
}

/**
 * Higher-order function to protect API routes or Server Actions
 *
 * @param handler - The async function to protect
 * @param options - Protection options
 * @returns Protected handler
 *
 * @example
 * ```ts
 * // In API route or Server Action
 * export const adminAction = protectedAction(
 *   async () => {
 *     // Admin-only logic
 *     return { success: true };
 *   },
 *   { requiredRole: 'admin' }
 * );
 * ```
 */
export function protectedAction<T>(
  handler: (session: Awaited<ReturnType<typeof requireAuth>>) => Promise<T>,
  options?: WithAuthOptions,
): () => Promise<T> {
  return async () => {
    const session = await withAuth(options);
    return handler(session);
  };
}

/**
 * Check if current user has required role
 *
 * Does NOT redirect, just returns boolean.
 * Useful for conditional rendering in Server Components.
 *
 * @param role - Role to check
 * @returns True if user has role
 *
 * @example
 * ```tsx
 * export default async function Page() {
 *   const session = await requireAuth();
 *   const isAdmin = await currentUserHasRole('admin');
 *
 *   return (
 *     <div>
 *       {isAdmin && <AdminPanel />}
 *       <UserContent />
 *     </div>
 *   );
 * }
 * ```
 */
export async function currentUserHasRole(role: Role): Promise<boolean> {
  try {
    const session = await requireAuth();
    return await hasRole(session.userId, role);
  } catch {
    return false;
  }
}

/**
 * Check if current user has required permission level
 *
 * Does NOT redirect, just returns boolean.
 *
 * @param permission - Permission level to check
 * @returns True if user has permission
 */
export async function currentUserHasPermission(permission: ApplicationRole): Promise<boolean> {
  try {
    const session = await requireAuth();
    return await hasPermission(session.userId, permission);
  } catch {
    return false;
  }
}
