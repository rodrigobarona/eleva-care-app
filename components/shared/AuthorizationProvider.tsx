'use client';

import type { UserRole } from '@/lib/auth/roles';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';

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
  const { user, isLoaded, isSignedIn } = useUser();

  // Derive roles directly from user metadata
  const roles = useMemo(() => {
    if (!isLoaded || !isSignedIn) return [];
    const userRoles = user?.publicMetadata?.role as UserRole | UserRole[] | undefined;
    return userRoles ? (Array.isArray(userRoles) ? userRoles : [userRoles]) : ['user'];
  }, [isLoaded, isSignedIn, user]);

  // Derive loading state from isLoaded
  const isLoading = !isLoaded;

  const hasRole = (roleToCheck: UserRole | UserRole[]): boolean => {
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
