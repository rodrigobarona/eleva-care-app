/**
 * Authentication & Authorization Module
 *
 * Provides role-based access control utilities and middleware.
 */

// Client-side role utilities
export * from './roles';

// Server-side role utilities (includes getUserRole from server)
export { hasRole, checkRoles, getUserRole, checkMultipleRoles, requireRole } from './roles.server';

// Admin middleware
export * from './admin-middleware';
