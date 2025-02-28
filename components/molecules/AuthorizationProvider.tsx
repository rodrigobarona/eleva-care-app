'use client';

import type { UserRole } from '@/lib/auth/roles';
import { useUser } from '@clerk/nextjs';
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthorizationContextType {
  role: UserRole | null;
  hasRole: (roleToCheck: UserRole | UserRole[]) => boolean;
  isLoading: boolean;
}

const AuthorizationContext = createContext<AuthorizationContextType>({
  role: null,
  hasRole: () => false,
  isLoading: true,
});

export function AuthorizationProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setIsLoading(false);
      return;
    }

    const userRole = user?.publicMetadata?.role as UserRole;
    setRole(userRole || 'user');
    setIsLoading(false);
  }, [isLoaded, isSignedIn, user]);

  const hasRole = (roleToCheck: UserRole | UserRole[]): boolean => {
    if (!role) return false;
    if (Array.isArray(roleToCheck)) {
      return roleToCheck.includes(role);
    }
    return role === roleToCheck;
  };

  return (
    <AuthorizationContext.Provider
      value={{
        role,
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

// Authorization components for role-based UI rendering
interface RequireRoleProps {
  role: UserRole | UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireRole({ role, children, fallback = null }: RequireRoleProps) {
  const { hasRole, isLoading } = useAuthorization();

  if (isLoading) return null;

  return hasRole(role) ? <>{children}</> : <>{fallback}</>;
}
