import { useUser } from '@clerk/nextjs';

export type UserRole = 'user' | 'community_expert' | 'top_expert' | 'admin' | 'superadmin';

export function useRoleCheck() {
  const { user, isLoaded } = useUser();

  // Derive loading state directly from isLoaded instead of using effect + setState
  const isLoading = !isLoaded;

  const hasRole = (rolesToCheck: UserRole | UserRole[]) => {
    const userRoles = user?.publicMetadata?.role;
    if (!userRoles) return false;

    const userRoleArray = Array.isArray(userRoles) ? userRoles : [userRoles];
    const rolesToCheckArray = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];

    return userRoleArray.some((role) => rolesToCheckArray.includes(role));
  };

  const hasAnyRole = (roles: UserRole[]) => roles.some((role) => hasRole(role));

  return {
    hasRole,
    hasAnyRole,
    isLoading,
    user,
  };
}
