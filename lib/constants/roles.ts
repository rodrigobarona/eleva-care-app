/**
 * Role Definitions
 *
 * This file centralizes all role names and groupings used throughout the application.
 * Use these constants instead of hardcoded strings to ensure consistency.
 */

// Individual Role Names
export const ROLE_USER = 'user' as const;
export const ROLE_TOP_EXPERT = 'top_expert' as const;
export const ROLE_COMMUNITY_EXPERT = 'community_expert' as const;
export const ROLE_LECTURER = 'lecturer' as const;
export const ROLE_ADMIN = 'admin' as const;
export const ROLE_SUPERADMIN = 'superadmin' as const;

// Complete list of roles
export const ALL_ROLES = [
  ROLE_USER,
  ROLE_TOP_EXPERT,
  ROLE_COMMUNITY_EXPERT,
  ROLE_LECTURER,
  ROLE_ADMIN,
  ROLE_SUPERADMIN,
] as const;

// Role groupings for common use cases
export const ADMIN_ROLES = [ROLE_ADMIN, ROLE_SUPERADMIN] as const;
export const EXPERT_ROLES = [
  ROLE_TOP_EXPERT,
  ROLE_COMMUNITY_EXPERT,
  ROLE_ADMIN,
  ROLE_SUPERADMIN,
] as const;

// Route definitions for role-based access control
export const PUBLIC_ROUTES = [
  // Public pages
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/unauthorized(.*)',
  '/:username', // Public expert profiles (e.g., /barona)
  '/:username/(.*)', // Public routes under usernames (e.g., /barona/event-name)
  '/legal/(.*)', // Legal pages (privacy policy, terms, etc.)
  '/explore',
  '/experts/:path*',
  '/blog/:path*',
  '/contact',

  // Public API endpoints
  '/api/webhooks/stripe(.*)', // Stripe webhooks (payments, subscriptions)
  '/api/webhooks/stripe-identity(.*)', // Stripe Identity verification webhooks
  '/api/webhooks/stripe-connect(.*)', // Stripe Connect webhooks (connect accounts)
  '/api/keep-alive', // Health check endpoint
] as const;

export const ADMIN_ROUTES = [
  // Admin pages
  '/admin(.*)',

  // Admin API endpoints
  '/api/admin(.*)',
  '/api/categories(.*)', // To manage categories experts
] as const;

export const EXPERT_ROUTES = [
  // Expert pages
  '/booking(.*)',
  '/appointments(.*)',
  '/account/identity(.*)',
  '/account/billing(.*)',

  // Expert API endpoints
  '/api/expert(.*)',
  '/api/appointments(.*)',
  '/api/customers(.*)', // Unified customer API endpoints
  '/api/records(.*)',
  '/api/meetings(.*)',
  '/api/customers(.*)',
  '/api/stripe(.*)', // Expert stripe connect operations
] as const;

export const SPECIAL_AUTH_ROUTES = [
  '/api/cron(.*)', // Cron jobs (requires API key)
] as const;
