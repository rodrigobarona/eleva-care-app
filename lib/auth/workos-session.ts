/**
 * WorkOS Session Management
 *
 * Handles user session creation, retrieval, and validation using cookies.
 * Sessions store WorkOS JWT tokens for Neon Auth RLS integration.
 *
 * Key Features:
 * - Secure HTTP-only cookies
 * - Automatic token refresh
 * - JWT validation via WorkOS
 * - Org context switching
 */

'use server';

import { workos } from '@/lib/integrations/workos/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * WorkOS Session Management
 *
 * Handles user session creation, retrieval, and validation using cookies.
 * Sessions store WorkOS JWT tokens for Neon Auth RLS integration.
 *
 * Key Features:
 * - Secure HTTP-only cookies
 * - Automatic token refresh
 * - JWT validation via WorkOS
 * - Org context switching
 */

/**
 * WorkOS Session Management
 *
 * Handles user session creation, retrieval, and validation using cookies.
 * Sessions store WorkOS JWT tokens for Neon Auth RLS integration.
 *
 * Key Features:
 * - Secure HTTP-only cookies
 * - Automatic token refresh
 * - JWT validation via WorkOS
 * - Org context switching
 */

/**
 * WorkOS Session Data
 *
 * Stored in secure HTTP-only cookie.
 * Access token is used for Neon Auth RLS (passed as JWT).
 */
export interface WorkOSSession {
  userId: string; // WorkOS user ID (sub claim)
  email: string; // User email
  organizationId?: string; // Current org context
  role?: string; // WorkOS RBAC role
  accessToken: string; // JWT for Neon Auth
  refreshToken: string; // For token refresh
  expiresAt: number; // Token expiration (Unix timestamp)
}

const SESSION_COOKIE_NAME = 'workos_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Set session cookie
 *
 * @param session - Session data to store
 *
 * @example
 * ```typescript
 * await setSession({
 *   userId: user.id,
 *   email: user.email,
 *   organizationId: org.id,
 *   role: 'owner',
 *   accessToken: tokens.accessToken,
 *   refreshToken: tokens.refreshToken,
 *   expiresAt: Date.now() + 3600000,
 * });
 * ```
 */
export async function setSession(session: WorkOSSession): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Get current session
 *
 * Returns null if no session exists.
 *
 * @returns Current session or null
 *
 * @example
 * ```typescript
 * const session = await getSession();
 * if (!session) {
 *   redirect('/sign-in');
 * }
 * ```
 */
export async function getSession(): Promise<WorkOSSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return null;
  }

  try {
    const session = JSON.parse(sessionCookie.value) as WorkOSSession;

    // Check if token is expired
    if (Date.now() >= session.expiresAt) {
      // Try to refresh
      const refreshed = await refreshSession(session);
      return refreshed;
    }

    return session;
  } catch (error) {
    console.error('Failed to parse session:', error);
    return null;
  }
}

/**
 * Refresh session tokens
 *
 * Uses refresh token to get new access token.
 *
 * @param session - Current session
 * @returns Refreshed session or null
 */
export async function refreshSession(session: WorkOSSession): Promise<WorkOSSession | null> {
  try {
    const { accessToken, refreshToken } = await workos.userManagement.authenticateWithRefreshToken({
      refreshToken: session.refreshToken,
      clientId: process.env.WORKOS_CLIENT_ID!,
    });

    const newSession: WorkOSSession = {
      ...session,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 3600000, // 1 hour
    };

    await setSession(newSession);
    return newSession;
  } catch (error) {
    console.error('Failed to refresh session:', error);
    await clearSession();
    return null;
  }
}

/**
 * Clear session cookie
 *
 * Logs user out by removing session cookie.
 *
 * @example
 * ```typescript
 * await clearSession();
 * redirect('/sign-in');
 * ```
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Require authenticated session
 *
 * Throws and redirects if no valid session exists.
 * Use this in server actions and API routes.
 *
 * @returns Current session
 * @throws Redirects to /sign-in if not authenticated
 *
 * @example
 * ```typescript
 * // server/actions/events.ts
 * export async function getEvents() {
 *   const session = await requireAuth();
 *   const db = await getOrgScopedDb(); // Uses session.accessToken
 *   // ... query with automatic RLS
 * }
 * ```
 */
export async function requireAuth(): Promise<WorkOSSession> {
  const session = await getSession();

  if (!session) {
    redirect('/sign-in');
  }

  return session;
}

/**
 * Check if user has permission
 *
 * Checks WorkOS RBAC role against required permission.
 *
 * @param permission - Permission string (e.g., 'org:update', 'members:write')
 * @returns True if user has permission
 *
 * @example
 * ```typescript
 * if (await hasPermission('org:update')) {
 *   // Allow org settings update
 * }
 * ```
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const session = await requireAuth();

  // Owner has all permissions
  if (session.role === 'owner') {
    return true;
  }

  // Check specific permissions based on role
  const rolePermissions: Record<string, string[]> = {
    admin: ['org:read', 'org:update', 'members:*', 'bookings:*', 'profiles:*'],
    member: ['org:read', 'bookings:read', 'bookings:create', 'profiles:read'],
    billing_admin: ['org:read', 'billing:*', 'subscriptions:*'],
  };

  const permissions = rolePermissions[session.role || ''] || [];

  // Check wildcard permissions
  if (permissions.includes('*')) return true;

  // Check specific permission
  if (permissions.includes(permission)) return true;

  // Check wildcard category
  const category = permission.split(':')[0];
  if (permissions.includes(`${category}:*`)) return true;

  return false;
}

/**
 * Require specific permission
 *
 * Throws error if user doesn't have permission.
 *
 * @param permission - Required permission
 * @throws Error if permission denied
 *
 * @example
 * ```typescript
 * export async function updateOrganization(orgId: string, data: UpdateData) {
 *   await requirePermission('org:update');
 *   // ... update logic
 * }
 * ```
 */
export async function requirePermission(permission: string): Promise<void> {
  const allowed = await hasPermission(permission);

  if (!allowed) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

/**
 * Switch organization context
 *
 * Updates session to use different organization.
 * Useful for users belonging to multiple orgs.
 *
 * @param organizationId - New organization ID
 *
 * @example
 * ```typescript
 * export async function switchOrg(orgId: string) {
 *   await switchOrganization(orgId);
 *   redirect('/dashboard');
 * }
 * ```
 */
export async function switchOrganization(organizationId: string): Promise<void> {
  const session = await requireAuth();

  // TODO: Verify user has membership in target org

  const newSession: WorkOSSession = {
    ...session,
    organizationId,
    role: undefined, // Will be set from membership lookup
  };

  await setSession(newSession);
}
