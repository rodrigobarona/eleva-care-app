/**
 * Role Definitions and Route Patterns for RBAC
 *
 * This file defines route patterns for role-based access control in the proxy middleware.
 *
 * **IMPORTANT:**
 * - For WorkOS RBAC role and permission definitions, see `@/types/workos-rbac.ts`
 * - This file contains ROUTE PATTERNS for the proxy middleware authorization checks
 * - Use glob patterns like `/admin(.*)` for path matching
 *
 * @see src/types/workos-rbac.ts - WorkOS role and permission definitions
 * @see src/proxy.ts - Middleware that uses these route patterns
 * @see src/lib/constants/routes.ts - Segment-based route helpers
 */

// ============================================================================
// LEGACY ROLE CONSTANTS
// ============================================================================
// NOTE: These are kept for backward compatibility but new code should use
// WORKOS_ROLES from @/types/workos-rbac.ts instead.

/** @deprecated Use WORKOS_ROLES.PATIENT from @/types/workos-rbac.ts */
export const ROLE_USER = 'user' as const;
/** @deprecated Use WORKOS_ROLES.EXPERT_TOP from @/types/workos-rbac.ts */
export const ROLE_TOP_EXPERT = 'expert_top' as const;
/** @deprecated Use WORKOS_ROLES.EXPERT_COMMUNITY from @/types/workos-rbac.ts */
export const ROLE_COMMUNITY_EXPERT = 'expert_community' as const;
/** @deprecated Use WORKOS_ROLES from @/types/workos-rbac.ts */
export const ROLE_LECTURER = 'expert_lecturer' as const;
/** @deprecated Use WORKOS_ROLES from @/types/workos-rbac.ts */
export const ROLE_ADMIN = 'admin' as const;
/** @deprecated Use WORKOS_ROLES.SUPERADMIN from @/types/workos-rbac.ts */
export const ROLE_SUPERADMIN = 'superadmin' as const;

/** @deprecated Use ALL roles from @/types/workos-rbac.ts */
export const ALL_ROLES = [
  ROLE_USER,
  ROLE_TOP_EXPERT,
  ROLE_COMMUNITY_EXPERT,
  ROLE_LECTURER,
  ROLE_ADMIN,
  ROLE_SUPERADMIN,
] as const;

// ============================================================================
// LEGACY ROLE GROUPINGS
// ============================================================================
// NOTE: These are kept for backward compatibility. New code should use
// ADMIN_ROLES and EXPERT_ROLES from @/types/workos-rbac.ts instead.

/** @deprecated Use ADMIN_ROLES from @/types/workos-rbac.ts */
export const ADMIN_ROLES = [ROLE_ADMIN, ROLE_SUPERADMIN] as const;
/** @deprecated Use EXPERT_ROLES from @/types/workos-rbac.ts */
export const EXPERT_ROLES = [
  ROLE_TOP_EXPERT,
  ROLE_COMMUNITY_EXPERT,
  ROLE_ADMIN,
  ROLE_SUPERADMIN,
] as const;

// ============================================================================
// ROUTE PATTERNS FOR PROXY MIDDLEWARE
// ============================================================================
// These patterns use glob syntax for path matching in the proxy middleware.
// Pattern syntax: `/path(.*)` matches `/path` and `/path/anything`
//
// NOTE: For segment-based route checking, see routes.ts

/**
 * Public routes - accessible without authentication
 * These routes are handled by the marketing layout and don't require auth.
 *
 * NOTE: Most public routes are handled by SKIP_AUTH_API_PATTERNS in routes.ts.
 * This list is primarily for documentation and legacy compatibility.
 */
export const PUBLIC_ROUTES = [
  // Public pages
  '/',
  '/login(.*)',
  '/register(.*)',
  '/unauthorized(.*)',
  '/about',
  '/history',
  '/profile/:username', // Public expert profiles (e.g., /profile/barona)
  '/profile/:username/(.*)', // Public routes under usernames (e.g., /profile/barona/event-name)
  '/legal/(.*)', // Legal pages (privacy policy, terms, etc.)
  '/explore',
  '/experts/:path*',
  '/blog/:path*',
  '/contact',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',

  // Public API endpoints (signature-verified)
  '/api/webhooks/stripe(.*)', // Stripe webhooks (payments, subscriptions)
  '/api/webhooks/stripe-identity(.*)', // Stripe Identity verification webhooks
  '/api/webhooks/stripe-connect(.*)', // Stripe Connect webhooks (connect accounts)
  '/api/webhooks/workos(.*)', // WorkOS webhooks (user events, auth events)
  '/api/keep-alive', // Health check endpoint
  '/api/og/image(.*)', // OG image generation (must be public for social media)
] as const;

/**
 * Admin routes - require admin role (WORKOS_ROLES.SUPERADMIN)
 *
 * Access is verified in proxy.ts using JWT role claims.
 */
export const ADMIN_ROUTES = [
  // Admin pages
  '/admin(.*)',

  // Admin API endpoints
  '/api/admin(.*)',
  '/api/categories(.*)', // Category management (admin only)
] as const;

/**
 * Expert routes - require expert role (EXPERT_COMMUNITY or EXPERT_TOP)
 *
 * Access is verified in proxy.ts using JWT role claims.
 */
export const EXPERT_ROUTES = [
  // Expert pages
  '/booking(.*)',
  '/appointments(.*)',
  '/account/identity(.*)',
  '/account/billing(.*)',

  // Expert API endpoints
  '/api/expert(.*)',
  '/api/appointments(.*)',
  '/api/customers(.*)', // Customer management
  '/api/records(.*)', // Medical records
  '/api/meetings(.*)', // Meeting management
  '/api/stripe(.*)', // Stripe Connect operations
] as const;

/**
 * Special auth routes - use custom authentication (not AuthKit)
 *
 * These routes bypass AuthKit middleware but have their own security:
 * - Cron jobs: QStash signature verification in route handlers
 */
export const SPECIAL_AUTH_ROUTES = [
  '/api/cron(.*)', // Cron jobs (verified via QStash signatures)
] as const;
