/**
 * Authentication & Authorization Module
 *
 * Provides role-based access control utilities and middleware.
 */

// Client-side role utilities
export * from './roles';

// Server-side role utilities
export {
  hasRole,
  hasAnyRole,
  checkRoles,
  getUserRole,
  isAdmin,
  isExpert,
  isTopExpert,
  isCommunityExpert,
  updateUserRole,
} from './roles.server';

// Admin middleware
export * from './admin-middleware';
