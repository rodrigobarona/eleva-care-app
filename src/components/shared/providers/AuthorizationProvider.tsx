'use client';

/**
 * Authorization Provider - WorkOS Version
 *
 * Provides role-based access control for client components.
 * Fetches user roles from the database via API.
 * Uses WorkOS's built-in useAuth hook.
 */
import { WORKOS_ROLES, type WorkOSRole } from '@/types/workos-rbac';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthorizationContextType {
  roles: WorkOSRole[];
  hasRole: (roleToCheck: WorkOSRole | WorkOSRole[]) => boolean;
  isLoading: boolean;
}

const AuthorizationContext = createContext<AuthorizationContextType>({
  roles: [],
  hasRole: () => false,
  isLoading: true,
});

export function AuthorizationProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<WorkOSRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);

  // Fetch user roles from API when user is loaded
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setRoles([]);
      setIsLoadingRoles(false);
      return;
    }

    // Fetch roles from API
    const fetchRoles = async () => {
      try {
        const response = await fetch('/api/user/roles');

        if (!response.ok) {
          console.error('Failed to fetch user roles');
          setRoles([WORKOS_ROLES.PATIENT]); // Default to patient role
          return;
        }

        const data = await response.json();
        setRoles(data.roles || [WORKOS_ROLES.PATIENT]);
      } catch (error) {
        console.error('Error fetching user roles:', error);
        setRoles([WORKOS_ROLES.PATIENT]); // Default to patient role on error
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchRoles();
  }, [authLoading, user]);

  // Derive loading state
  const isLoading = authLoading || isLoadingRoles;

  const hasRole = (roleToCheck: WorkOSRole | WorkOSRole[]): boolean => {
    if (roles.length === 0) return false;
    const rolesToCheck = Array.isArray(roleToCheck) ? roleToCheck : [roleToCheck];
    return roles.some((role) => rolesToCheck.includes(role));
  };

  return (
    <AuthorizationContext.Provider
      value={{
        roles,
        hasRole,
        isLoading,
      }}
    >
      {children}
    </AuthorizationContext.Provider>
  );
}

export function useAuthorization() {
  return useContext(AuthorizationContext);
}

// Client-side role helper hooks
export function useIsAdmin(): boolean {
  const { hasRole } = useAuthorization();
  return hasRole(WORKOS_ROLES.SUPERADMIN);
}

export function useIsExpert(): boolean {
  const { hasRole } = useAuthorization();
  return hasRole([WORKOS_ROLES.EXPERT_COMMUNITY, WORKOS_ROLES.EXPERT_TOP]);
}

export function useIsTopExpert(): boolean {
  const { hasRole } = useAuthorization();
  return hasRole(WORKOS_ROLES.EXPERT_TOP);
}

export function useIsCommunityExpert(): boolean {
  const { hasRole } = useAuthorization();
  return hasRole(WORKOS_ROLES.EXPERT_COMMUNITY);
}

// Authorization component for role-based UI rendering
interface RequireRoleProps {
  children: ReactNode;
  roles: WorkOSRole | WorkOSRole[];
  fallback?: ReactNode;
  redirectTo?: string;
}

export function RequireRole({ children, roles, fallback, redirectTo }: RequireRoleProps) {
  const { hasRole, isLoading } = useAuthorization();

  if (isLoading) {
    return null;
  }

  const hasAccess = hasRole(roles);

  if (!hasAccess) {
    if (redirectTo) {
      redirect(redirectTo);
    }
    return fallback || null;
  }

  return <>{children}</>;
}
