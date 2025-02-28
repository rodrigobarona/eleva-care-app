'use client';

import type { UserRole } from '@/lib/auth/roles';
import { useUser } from '@clerk/nextjs';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface AuthorizationContextType {
  userRoles: UserRole[];
  userPermissions: string[];
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  isLoading: boolean;
}

const AuthorizationContext = createContext<AuthorizationContextType>({
  userRoles: [],
  userPermissions: [],
  hasRole: () => false,
  hasAnyRole: () => false,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  isLoading: true,
});

export function useAuthorization() {
  return useContext(AuthorizationContext);
}

interface AuthorizationProviderProps {
  children: React.ReactNode;
}

export function AuthorizationProvider({ children }: AuthorizationProviderProps) {
  const { isSignedIn, isLoaded } = useUser();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserRolesAndPermissions = useCallback(async () => {
    if (!isSignedIn || !isLoaded) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/user-authorization');
      if (!response.ok) throw new Error('Failed to fetch user roles');

      const data = await response.json();
      setUserRoles(data.roles || []);
      setUserPermissions(data.permissions || []);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, isLoaded]);

  useEffect(() => {
    fetchUserRolesAndPermissions();
  }, [fetchUserRolesAndPermissions]);

  const hasRole = useCallback((role: UserRole) => userRoles.includes(role), [userRoles]);

  const hasAnyRole = useCallback(
    (roles: UserRole[]) => roles.some((role) => userRoles.includes(role)),
    [userRoles],
  );

  const hasPermission = useCallback(
    (permission: string) => userPermissions.includes(permission),
    [userPermissions],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]) =>
      permissions.some((permission) => userPermissions.includes(permission)),
    [userPermissions],
  );

  return (
    <AuthorizationContext.Provider
      value={{
        userRoles,
        userPermissions,
        hasRole,
        hasAnyRole,
        hasPermission,
        hasAnyPermission,
        isLoading,
      }}
    >
      {children}
    </AuthorizationContext.Provider>
  );
}

// Authorization components for role-based UI rendering
interface RequireRoleProps {
  role: UserRole | UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireRole({ role, children, fallback = null }: RequireRoleProps) {
  const { hasRole, hasAnyRole, isLoading } = useAuthorization();

  if (isLoading) return null;

  const hasRequiredRole = Array.isArray(role) ? hasAnyRole(role) : hasRole(role);

  return hasRequiredRole ? <>{children}</> : <>{fallback}</>;
}

interface RequirePermissionProps {
  permission: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequirePermission({
  permission,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const { hasPermission, hasAnyPermission, isLoading } = useAuthorization();

  if (isLoading) return null;

  const hasRequiredPermission = Array.isArray(permission)
    ? hasAnyPermission(permission)
    : hasPermission(permission);

  return hasRequiredPermission ? <>{children}</> : <>{fallback}</>;
}
