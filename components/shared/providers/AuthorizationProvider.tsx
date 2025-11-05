'use client';

/**
 * Authorization Provider - WorkOS Version
 *
 * Provides role-based access control for client components.
 * Fetches user roles from the database via API.
 * Uses WorkOS's built-in useAuth hook.
 */
import type { UserRole } from '@/lib/auth/roles';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthorizationContextType {
  roles: UserRole[];
  hasRole: (roleToCheck: UserRole | UserRole[]) => boolean;
  isLoading: boolean;
}

const AuthorizationContext = createContext<AuthorizationContextType>({
  roles: [],
  hasRole: () => false,
  isLoading: true,
});

export function AuthorizationProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
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
          setRoles(['user']); // Default to 'user' role
          return;
        }

        const data = await response.json();
        setRoles(data.roles || ['user']);
      } catch (error) {
        console.error('Error fetching user roles:', error);
        setRoles(['user']); // Default to 'user' role on error
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchRoles();
  }, [authLoading, user]);

  // Derive loading state
  const isLoading = authLoading || isLoadingRoles;

  const hasRole = (roleToCheck: UserRole | UserRole[]): boolean => {
    if (roles.length === 0) return false;
    const rolesToCheck = Array.isArray(roleToCheck) ? roleToCheck : [roleToCheck];
    return roles.some((role) => rolesToCheck.includes(role as UserRole));
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
  return hasRole(['admin', 'superadmin']);
}

export function useIsExpert(): boolean {
  const { hasRole } = useAuthorization();
  return hasRole(['community_expert', 'top_expert']);
}

export function useIsTopExpert(): boolean {
  const { hasRole } = useAuthorization();
  return hasRole('top_expert');
}

export function useIsCommunityExpert(): boolean {
  const { hasRole } = useAuthorization();
  return hasRole('community_expert');
}

// Authorization component for role-based UI rendering
interface RequireRoleProps {
  children: ReactNode;
  roles: UserRole | UserRole[];
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
