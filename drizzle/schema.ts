/**
 * Complete WorkOS Schema with Neon Auth RLS
 *
 * WorkOS-native schema with Neon Auth RLS:
 * - WorkOS user IDs (text) for all identity references
 * - Organization-per-user model for complete data isolation
 * - Automatic RLS using Neon Auth's `auth.user_id()` function
 * - Unified audit logging (no separate database needed)
 * - Ready for B2B expansion (multi-member organizations)
 *
 * Key Architectural Decisions:
 * 1. Store WorkOS user IDs directly (no internal mapping)
 * 2. Every user gets their own organization (org-per-user)
 * 3. All app tables have orgId for data isolation
 * 4. RLS enforced at database level via JWT validation
 * 5. Audit logs in same database, protected by RLS
 */
import { DAYS_OF_WEEK_IN_ORDER } from '@/lib/constants/days-of-week';
import {
  PAYMENT_TRANSFER_STATUS_PENDING,
  PAYMENT_TRANSFER_STATUSES,
} from '@/lib/constants/payment-transfers';
import type { SocialMediaPlatform } from '@/lib/constants/social-media';
import { relations, sql } from 'drizzle-orm';
import { authenticatedRole, anonymousRole } from 'drizzle-orm/neon';
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  json,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Neon Auth helper: resolves to the WorkOS user ID from the JWT.
 * Used in all RLS policy expressions.
 */
const authUid = sql`auth.user_id()`;

/**
 * Reusable RLS fragment: checks active membership in an org.
 * Pass the SQL column expression that holds the org_id on the target table.
 */
const isOrgMember = (orgColumn: string, table: string) => sql.raw(`
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = ${table}.${orgColumn}
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
`);

const isAdmin = sql.raw(`
  EXISTS (
    SELECT 1 FROM users
    WHERE users.workos_user_id = auth.user_id()
    AND users.role = 'admin'
  )
`);

/**
 * Common timestamp fields used across multiple tables
 */
const createdAt = timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp('updated_at', { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

// ============================================================================
// CORE WORKOS TABLES (Authentication & Organization Management)
// ============================================================================

/**
 * Organization Types for Different Use Cases
 *
 * ELEVA BUSINESS MODEL:
 * =====================
 *
 * 1️⃣ SOLO EXPERTS (Current - Phase 1):
 *    - 1 Expert = 1 Personal Organization (type: 'expert_individual')
 *    - Expert's level (community/top) determines their org's subscription tier
 *    - Only 1 member (the expert themselves)
 *    - Subscription tier and user role are synchronized
 *
 * 2️⃣ TEAMS (Future - Phase 2):
 *    - Multi-expert organization (type: 'team')
 *    - Can have multiple experts with DIFFERENT levels (community/top)
 *    - THREE-PARTY REVENUE MODEL (Industry Standard):
 *      Member → Eleva (Platform Fee) → Team (Marketing Fee) → Expert (Net)
 *
 *    Example Three-Party Split:
 *      Team Org → Team Subscription ($99-199/month)
 *      Team Settings → Marketing Fee (15%)
 *
 *      Member books $100 appointment with Dr. Maria (Top Expert):
 *        ├─ Eleva Platform Fee: $8 (8% - based on Dr. Maria's tier)
 *        ├─ Team Marketing Fee: $15 (15% - set by team)
 *        └─ Expert Net Payment: $77 (77% - Dr. Maria receives)
 *
 *      Member books $100 appointment with Dr. João (Community):
 *        ├─ Eleva Platform Fee: $12 (12% - based on Dr. João's tier)
 *        ├─ Team Marketing Fee: $15 (15% - same team rate)
 *        └─ Expert Net Payment: $73 (73% - Dr. João receives)
 *
 *    Key Rules:
 *      • Expert MUST receive minimum 60% of booking
 *      • Total fees (platform + team) cannot exceed 40%
 *      • Team fee range: 10-25%
 *      • Each expert's platform fee based on THEIR tier (not team tier)
 *
 * 3️⃣ MEMBERS:
 *    - Personal organization for data isolation (HIPAA/GDPR)
 *    - No subscription required
 *
 * 4️⃣ EDUCATIONAL INSTITUTIONS (Future - Phase 3):
 *    - For courses and lectures (Lecturer addon via Stripe)
 *
 * @see _docs/02-core-systems/RBAC-NAMING-DECISIONS.md
 */
export type OrganizationType =
  | 'member_personal' // Individual member's personal organization
  | 'expert_individual' // Solo expert's organization (1 expert = 1 org)
  | 'team' // Multi-expert team (multiple experts, mixed levels allowed)
  | 'educational_institution'; // For courses/lectures (future)

/**
 * Organizations Table
 *
 * Org-per-user model: Each user gets their own organization for data isolation.
 *
 * Benefits:
 * - Complete data isolation (HIPAA, GDPR compliant)
 * - Easy multi-tenancy via RLS
 * - B2B ready (experts can invite others to their org)
 * - Scalable for courses/lectures expansion
 */
export const OrganizationsTable = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosOrgId: text('workos_org_id').unique().notNull(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    type: text('type').notNull().$type<OrganizationType>(),

    // Stripe integration (denormalized from WorkOS org for quick lookups)
    stripeCustomerId: text('stripe_customer_id'),

    // Metadata
    createdAt,
    updatedAt,
  },
  (table) => [
    index('organizations_workos_org_id_idx').on(table.workosOrgId),
    index('organizations_slug_idx').on(table.slug),
    index('organizations_stripe_customer_id_idx').on(table.stripeCustomerId),
    pgPolicy('organizations_read', {
      for: 'select',
      using: isOrgMember('id', 'organizations'),
    }),
    pgPolicy('organizations_update', {
      for: 'update',
      using: sql.raw(`
        EXISTS (
          SELECT 1 FROM user_org_memberships
          WHERE user_org_memberships.org_id = organizations.id
          AND user_org_memberships.workos_user_id = auth.user_id()
          AND user_org_memberships.role IN ('owner', 'admin')
        )
      `),
    }),
  ],
);

/**
 * Roles Table
 *
 * Stores user roles for RBAC (Role-Based Access Control).
 * Backed by WorkOS RBAC for role/permission management.
 */
export const RolesTable = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id').notNull(),
    role: text('role').notNull(), // 'user', 'expert', 'admin', etc.

    // Metadata
    createdAt,
    updatedAt,
  },
  (table) => [
    index('roles_workos_user_id_idx').on(table.workosUserId),
    unique('unique_user_role').on(table.workosUserId, table.role),
    pgPolicy('Users can view own roles', {
      for: 'select',
      using: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Admins can view all roles', {
      for: 'select',
      using: isAdmin,
    }),
    pgPolicy('Admins can insert roles', {
      for: 'insert',
      withCheck: isAdmin,
    }),
    pgPolicy('Admins can update roles', {
      for: 'update',
      using: isAdmin,
      withCheck: isAdmin,
    }),
    pgPolicy('Admins can delete roles', {
      for: 'delete',
      using: isAdmin,
    }),
  ],
);

/**
 * Users Table (Minimal - WorkOS is Source of Truth)
 *
 * Stores only essential user data needed for application logic.
 * Most user data (name, email, profile) should be fetched from WorkOS API when needed.
 */
export const UsersTable = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id').notNull().unique(),
    email: text('email').notNull(),

    // Username - unique identifier for public profile URLs
    // Format: lowercase, alphanumeric + underscore/dash only (e.g., 'dr-maria', 'john_smith')
    // Used for: /[username] routes, profile links, @mentions
    username: text('username').unique(),

    // ✅ Phase 5: firstName/lastName removed - fetch from WorkOS User API
    // Use: workos.userManagement.getUser(workosUserId) to get name
    // For public display: Use ProfilesTable.firstName/lastName

    // Application role (Phase 3: Roles & Permissions)
    // WorkOS membership roles are stored in UserOrgMembershipsTable
    //
    // 🎯 ROLE BEHAVIOR BY ORGANIZATION TYPE:
    //
    // For SOLO EXPERTS (type: 'expert_individual'):
    //   - role = 'expert_community' → Community tier subscription → 20% monthly, 12% annual commission
    //   - role = 'expert_top' → Top tier subscription → 18% monthly, 8% annual commission
    //   - Role and subscription tier are SYNCHRONIZED (1:1 mapping)
    //
    // For TEAMS (type: 'team') - Future:
    //   - Multiple experts can have DIFFERENT roles (mixed community/top)
    //   - Each expert's commission based on THEIR role, not the org's subscription
    //   - Example: Same team can have both community (12%) and top (8%) experts
    //   - Team pays team subscription fee separately
    //
    // Lecturer capabilities are NOT a role -- granted via Stripe addon subscription.
    //
    // NOTE: In future phases, role/tier/badge will be fully separated:
    //   - Permission roles (what they can DO) -- this column
    //   - Pricing tiers (what they PAY) -- Stripe subscription
    //   - Qualification badges (achievement-based status) -- separate system
    role: text('role')
      .notNull()
      .default('member')
      .$type<'member' | 'expert_top' | 'expert_community' | 'admin'>(),

    // Stripe IDs
    stripeCustomerId: text('stripe_customer_id').unique(),
    stripeConnectAccountId: text('stripe_connect_account_id').unique(),

    // Stripe Connect fields
    stripeConnectDetailsSubmitted: boolean('stripe_connect_details_submitted').default(false),
    stripeConnectChargesEnabled: boolean('stripe_connect_charges_enabled').default(false),
    stripeConnectPayoutsEnabled: boolean('stripe_connect_payouts_enabled').default(false),
    stripeConnectOnboardingComplete: boolean('stripe_connect_onboarding_complete').default(false),
    stripeBankAccountLast4: text('stripe_bank_account_last4'),
    stripeBankName: text('stripe_bank_name'),

    // Identity verification (Stripe Identity)
    stripeIdentityVerificationId: text('stripe_identity_verification_id'),
    stripeIdentityVerified: boolean('stripe_identity_verified').default(false),
    stripeIdentityVerificationStatus: text('stripe_identity_verification_status'),
    stripeIdentityVerificationLastChecked: timestamp('stripe_identity_verification_last_checked', { withTimezone: true }),

    country: text('country').default('PT'),

    // TODO: Remove after migration - fetch from WorkOS (Phase 5)
    imageUrl: text('image_url'),
    welcomeEmailSentAt: timestamp('welcome_email_sent_at', { withTimezone: true }),
    onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),

    // User preferences
    theme: text('theme').notNull().default('light').$type<'light' | 'dark' | 'system'>(),
    language: text('language').notNull().default('en').$type<'en' | 'es' | 'pt' | 'br'>(),

    // GDPR Art. 17 — soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    createdAt,
    updatedAt,
  },
  (table) => [
    index('users_workos_user_id_idx').on(table.workosUserId),
    index('users_email_idx').on(table.email),
    index('users_username_idx').on(table.username),
    index('users_stripe_customer_id_idx').on(table.stripeCustomerId),
    pgPolicy('users_read', {
      for: 'select',
      using: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('users_update', {
      for: 'update',
      using: sql`workos_user_id = ${authUid}`,
    }),
  ],
);

/**
 * User-Organization Memberships Table
 *
 * Links users to organizations with roles (WorkOS RBAC).
 * Each user can belong to multiple organizations (e.g., their personal org + invited to clinics).
 */
export const UserOrgMembershipsTable = pgTable(
  'user_org_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id').notNull(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => OrganizationsTable.id, {
        onDelete: 'cascade',
      }),

    // Role from WorkOS RBAC (managed in WorkOS, cached here)
    role: text('role').notNull(), // 'owner' | 'admin' | 'member' | 'billing_admin'

    // Status
    status: text('status').default('active'), // 'active' | 'invited' | 'suspended'

    // Timestamps
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('memberships_user_id_idx').on(table.workosUserId),
    index('memberships_org_id_idx').on(table.orgId),
    unique('user_org_unique').on(table.workosUserId, table.orgId),
    pgPolicy('memberships_read', {
      for: 'select',
      using: sql`workos_user_id = ${authUid}`,
    }),
  ],
);

// ============================================================================
// USER METADATA TABLES (Phase 3: Roles & Permissions)
// ============================================================================

/**
 * Expert Setup Table
 *
 * Tracks expert onboarding progress in database.
 *
 * - Queryable: Can find all incomplete setups
 * - Indexed: Fast filtering and analytics
 * - Audit trail: Track completion dates
 * - No size limits: Store unlimited data
 * - Direct database access via RLS
 */
export const ExpertSetupTable = pgTable(
  'expert_setup',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id')
      .notNull()
      .unique()
      .references(() => UsersTable.workosUserId, { onDelete: 'cascade' }),
    orgId: uuid('org_id').references(() => OrganizationsTable.id, { onDelete: 'cascade' }),

    // Setup steps (each can be marked complete independently)
    profileCompleted: boolean('profile_completed').notNull().default(false),
    availabilityCompleted: boolean('availability_completed').notNull().default(false),
    eventsCompleted: boolean('events_completed').notNull().default(false),
    identityCompleted: boolean('identity_completed').notNull().default(false),
    paymentCompleted: boolean('payment_completed').notNull().default(false),
    googleAccountCompleted: boolean('google_account_completed').notNull().default(false),

    // Overall status (automatically set when all steps complete)
    setupComplete: boolean('setup_complete').notNull().default(false),
    setupCompletedAt: timestamp('setup_completed_at', { withTimezone: true }),

    // Timestamps
    createdAt,
    updatedAt,
  },
  (table) => [
    index('expert_setup_user_id_idx').on(table.workosUserId),
    index('expert_setup_org_id_idx').on(table.orgId),
    index('expert_setup_complete_idx').on(table.setupComplete),
    pgPolicy('Users can view own expert setup', {
      for: 'select',
      using: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Users can create own expert setup', {
      for: 'insert',
      withCheck: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Users can update own expert setup', {
      for: 'update',
      using: sql`workos_user_id = ${authUid}`,
      withCheck: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Users can delete own expert setup', {
      for: 'delete',
      using: sql`workos_user_id = ${authUid}`,
    }),
  ],
);

/**
 * Expert Applications Table
 *
 * Manual review system for expert applications (Airbnb-style vetting).
 * Users apply to become experts, admins review and approve/reject.
 *
 * Status Flow:
 * pending → under_review → approved/rejected
 *
 * Upon approval:
 * - User's organization type converts to 'expert_individual'
 * - User role updates to 'expert_community' or 'expert_top'
 * - User redirected to /setup for expert onboarding
 */
export const ExpertApplicationsTable = pgTable(
  'expert_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id')
      .notNull()
      .references(() => UsersTable.workosUserId),

    // Application data
    expertise: text('expertise').notNull(), // e.g., "Clinical Psychologist"
    credentials: text('credentials').notNull(), // e.g., "PhD in Psychology, Licensed Therapist"
    experience: text('experience').notNull(), // Years of experience and description
    motivation: text('motivation').notNull(), // Why they want to become an expert
    hourlyRate: integer('hourly_rate'), // Proposed hourly rate in cents

    // Optional fields
    website: text('website'),
    linkedIn: text('linkedin'),
    resume: text('resume'), // URL to uploaded resume/CV

    // Review status
    status: text('status')
      .notNull()
      .default('pending')
      .$type<'pending' | 'under_review' | 'approved' | 'rejected'>(),

    // Admin review
    reviewedBy: text('reviewed_by'), // WorkOS user ID of admin who reviewed
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNotes: text('review_notes'), // Admin's notes about the decision
    rejectionReason: text('rejection_reason'), // If rejected, why?

    // Metadata
    createdAt,
    updatedAt,
  },
  (table) => [
    index('expert_applications_workos_user_id_idx').on(table.workosUserId),
    index('expert_applications_status_idx').on(table.status),
    unique('unique_active_expert_application').on(table.workosUserId),
    pgPolicy('Users can view own application', {
      for: 'select',
      using: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Users can create own application', {
      for: 'insert',
      withCheck: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Users can update own application', {
      for: 'update',
      using: sql.raw(`
        workos_user_id = auth.user_id()
        AND status IN ('pending', 'rejected')
      `),
      withCheck: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Admins can view all applications', {
      for: 'select',
      using: isAdmin,
    }),
    pgPolicy('Admins can update applications', {
      for: 'update',
      using: isAdmin,
      withCheck: isAdmin,
    }),
  ],
);

/**
 * ⚠️ REMOVED: User Preferences Table
 *
 * This table has been removed in favor of storing preferences directly in UsersTable.
 * Preferences (theme, language) are now columns in the users table.
 *
 * Migration: Run the migration SQL to:
 * 1. Copy data from user_preferences to users (theme, language)
 * 2. Drop the user_preferences table
 *
 * NOTE: Notification preferences are managed by Novu Inbox widget natively.
 */

// ============================================================================
// APPLICATION TABLES (With Org Scoping + RLS)
// ============================================================================

/**
 * Events Table - Bookable services offered by experts
 *
 * Now org-scoped: Each event belongs to an organization.
 *
 * MONETARY FIELDS NOTE:
 * - price: Stored in MINOR CURRENCY UNITS (cents/centimos).
 *   Example: 5000 = €50.00 or $50.00
 *   Always divide by 100 for display.
 */
export const EventsTable = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    workosUserId: text('workos_user_id').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    durationInMinutes: integer('duration_in_minutes').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    order: integer('order').notNull().default(0),
    /** Price in minor currency units (cents). E.g., 5000 = €50.00 */
    price: integer('price').notNull().default(0),
    currency: text('currency').notNull().default('eur'),
    stripeProductId: text('stripe_product_id'),
    stripePriceId: text('stripe_price_id'),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('events_org_id_idx').on(table.orgId),
    index('events_workos_user_id_idx').on(table.workosUserId),
    index('events_slug_idx').on(table.slug),
    pgPolicy('events_read', {
      for: 'select',
      using: isOrgMember('org_id', 'events'),
    }),
    pgPolicy('events_modify', {
      for: 'all',
      using: sql`workos_user_id = ${authUid}`,
    }),
  ],
);

/**
 * Schedules Table - Expert availability
 */
export const SchedulesTable = pgTable(
  'schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    workosUserId: text('workos_user_id').notNull().unique(),
    timezone: text('timezone').notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('schedules_org_id_idx').on(table.orgId),
    index('schedules_user_id_idx').on(table.workosUserId),
    pgPolicy('schedules_read', {
      for: 'select',
      using: sql.raw(`
        EXISTS (
          SELECT 1 FROM user_org_memberships
          WHERE user_org_memberships.org_id = schedules.org_id
          AND user_org_memberships.workos_user_id = auth.user_id()
        )
      `),
    }),
    pgPolicy('schedules_modify', {
      for: 'all',
      using: sql`workos_user_id = ${authUid}`,
    }),
  ],
);

/**
 * Schedule Availability Table
 */
export const scheduleDayOfWeekEnum = pgEnum('day', DAYS_OF_WEEK_IN_ORDER);

export const ScheduleAvailabilitiesTable = pgTable(
  'schedule_availabilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => SchedulesTable.id, { onDelete: 'cascade' }),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    dayOfWeek: scheduleDayOfWeekEnum('day_of_week').notNull(),
  },
  (table) => [
    index('schedule_availabilities_schedule_id_idx').on(table.scheduleId),
    pgPolicy('schedule_availabilities_all', {
      for: 'all',
      using: sql.raw(`
        EXISTS (
          SELECT 1 FROM schedules
          WHERE schedules.id = schedule_availabilities.schedule_id
          AND schedules.workos_user_id = auth.user_id()
        )
      `),
    }),
  ],
);

/**
 * Meetings Table - Booked appointments
 *
 * MONETARY FIELDS NOTE:
 * - stripeAmount, stripeApplicationFeeAmount, stripeTransferAmount:
 *   All stored in MINOR CURRENCY UNITS (cents/centimos).
 *   Example: 5000 = €50.00 or $50.00
 *   Always divide by 100 for display.
 *
 * SCHEMA DECISIONS:
 * - stripeTransferStatus: Uses inline enum (text) instead of paymentTransferStatusEnum.
 *   TODO: Consider migrating to use the shared enum for consistency.
 */
export const MeetingsTable = pgTable(
  'meetings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    eventId: uuid('event_id')
      .notNull()
      .references(() => EventsTable.id, { onDelete: 'cascade' }),

    // Expert (meeting host)
    workosUserId: text('workos_user_id').notNull(),

    // Guest (patient/customer) - WorkOS Integration
    // NOTE: Nullable during migration. After running backfill-guest-workos-users.ts, make NOT NULL.
    guestWorkosUserId: text('guest_workos_user_id'),
    guestOrgId: uuid('guest_org_id'),

    // @deprecated — PII columns retained for backfill migration only; will be dropped after migration script runs
    guestEmail: text('guest_email').notNull(),
    guestName: text('guest_name').notNull(),
    guestNotes: text('guest_notes'),

    // Encrypted guest notes via WorkOS Vault (replaces plaintext guestNotes)
    vaultEncryptedGuestNotes: text('vault_encrypted_guest_notes'),

    // GDPR Art. 17 — soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    timezone: text('timezone').notNull(),
    meetingUrl: text('meeting_url'),

    // Stripe payment processing
    stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
    stripeSessionId: text('stripe_session_id').unique(),
    stripePaymentStatus: text('stripe_payment_status', {
      enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded'],
    }).default('pending'),
    /** Amount in minor currency units (cents). E.g., 5000 = €50.00 */
    stripeAmount: integer('stripe_amount'),
    /** Application fee in minor currency units (cents) */
    stripeApplicationFeeAmount: integer('stripe_application_fee_amount'),

    // Stripe Connect transfers (links to PaymentTransfersTable for payout tracking)
    stripeTransferId: text('stripe_transfer_id').unique(),
    /** Transfer amount in minor currency units (cents) */
    stripeTransferAmount: integer('stripe_transfer_amount'),
    // NOTE: Uses inline enum with Stripe's transfer status values (pending/processing/succeeded/failed)
    // This differs from paymentTransferStatusEnum which tracks our internal transfer workflow states
    // (PENDING/APPROVED/READY/COMPLETED/FAILED/REFUNDED/DISPUTED/PAID_OUT)
    stripeTransferStatus: text('stripe_transfer_status', {
      enum: ['pending', 'processing', 'succeeded', 'failed'],
    }).default('pending'),
    stripeTransferScheduledAt: timestamp('stripe_transfer_scheduled_at', { withTimezone: true }),

    // Stripe payout tracking
    stripePayoutId: text('stripe_payout_id'),

    // Calendar creation idempotency (prevents duplicate calendar events on webhook retries)
    calendarCreationClaimed: boolean('calendar_creation_claimed').default(false).notNull(),

    createdAt,
    updatedAt,
  },
  (table) => [
    index('meetings_org_id_idx').on(table.orgId),
    index('meetings_user_id_idx').on(table.workosUserId),
    index('meetings_event_id_idx').on(table.eventId),
    index('meetings_payment_intent_id_idx').on(table.stripePaymentIntentId),
    index('meetings_transfer_id_idx').on(table.stripeTransferId),
    index('meetings_payout_id_idx').on(table.stripePayoutId),
    pgPolicy('meetings_read', {
      for: 'select',
      using: isOrgMember('org_id', 'meetings'),
    }),
    pgPolicy('meetings_modify', {
      for: 'all',
      using: sql`workos_user_id = ${authUid}`,
    }),
  ],
);

/**
 * Categories Table
 */
export const CategoriesTable = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    description: text('description'),
    image: text('image'),
    parentId: uuid('parent_id'),
    createdAt,
    updatedAt,
  },
  () => [
    pgPolicy('categories_read', {
      for: 'select',
      to: anonymousRole,
      using: sql`true`,
    }),
    pgPolicy('categories_modify', {
      for: 'all',
      to: authenticatedRole,
      using: sql`${authUid} IS NOT NULL`,
    }),
  ],
);

/**
 * Profiles Table - Public expert profiles
 */
export const ProfilesTable = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    workosUserId: text('workos_user_id').notNull().unique(),
    profilePicture: text('profile_picture'),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    headline: text('headline'),
    shortBio: text('short_bio'),
    longBio: text('long_bio'),
    primaryCategoryId: uuid('primary_category_id').references(() => CategoriesTable.id),
    secondaryCategoryId: uuid('secondary_category_id').references(() => CategoriesTable.id),
    socialLinks: json('social_links').$type<
      Array<{
        name: SocialMediaPlatform;
        url: string;
      }>
    >(),
    isVerified: boolean('is_verified').notNull().default(false),
    isTopExpert: boolean('is_top_expert').notNull().default(false),
    published: boolean('published').notNull().default(false),

    // Practitioner Agreement (GDPR, LGPD, SOC 2)
    practitionerAgreementAcceptedAt: timestamp('practitioner_agreement_accepted_at', { withTimezone: true }),
    practitionerAgreementVersion: text('practitioner_agreement_version'),
    practitionerAgreementIpAddress: text('practitioner_agreement_ip_address'),
    practitionerAgreementMetadata: jsonb('practitioner_agreement_metadata'), // Stores comprehensive geolocation, user-agent, etc.

    order: integer('order').notNull().default(0),

    // GDPR Art. 17 — soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    createdAt,
    updatedAt,
  },
  (table) => [
    index('profiles_org_id_idx').on(table.orgId),
    index('profiles_workos_user_id_idx').on(table.workosUserId),
    pgPolicy('profiles_read', {
      for: 'select',
      to: anonymousRole,
      using: sql`true`,
    }),
    pgPolicy('profiles_modify', {
      for: 'all',
      to: authenticatedRole,
      using: sql`workos_user_id = ${authUid}`,
    }),
  ],
);

/**
 * Records Table - Encrypted meeting notes (PHI)
 *
 * Encryption: WorkOS Vault with org-scoped keys
 * - All PHI encrypted using WorkOS Vault
 * - Automatic key rotation by WorkOS
 * - Built-in audit trail for HIPAA compliance
 */
export const RecordsTable = pgTable(
  'records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => MeetingsTable.id, { onDelete: 'cascade' }),
    expertId: text('expert_id').notNull(), // workosUserId
    // NOTE: Nullable during migration. After running backfill, make NOT NULL.
    guestWorkosUserId: text('guest_workos_user_id'),
    // @deprecated — retained for backfill migration only
    guestEmail: text('guest_email').notNull(),

    // WorkOS Vault encrypted content (org-scoped encryption)
    vaultEncryptedContent: text('vault_encrypted_content').notNull(),
    vaultEncryptedMetadata: text('vault_encrypted_metadata'),
    encryptionMethod: text('encryption_method').notNull().default('vault').$type<'vault'>(),

    lastModifiedAt: timestamp('last_modified_at', { withTimezone: true }).notNull().defaultNow(),
    version: integer('version').default(1).notNull(),
    createdAt,
  },
  (table) => [
    index('records_org_id_idx').on(table.orgId),
    index('records_meeting_id_idx').on(table.meetingId),
    index('records_expert_id_idx').on(table.expertId),
    pgPolicy('records_read', {
      for: 'select',
      using: isOrgMember('org_id', 'records'),
    }),
    pgPolicy('records_modify', {
      for: 'all',
      using: sql`expert_id = ${authUid}`,
    }),
  ],
);

/**
 * Payment Transfers Table
 *
 * MONETARY FIELDS NOTE:
 * - amount, platformFee: Stored in MINOR CURRENCY UNITS (cents/centimos).
 *   Example: 5000 = €50.00 or $50.00
 *   Always divide by 100 for display.
 *
 * The `expertWorkosUserId` column stores the WorkOS user ID of the expert.
 */
export const paymentTransferStatusEnum = pgEnum(
  'payment_transfer_status_enum',
  PAYMENT_TRANSFER_STATUSES,
);

export const PaymentTransfersTable = pgTable(
  'payment_transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    paymentIntentId: text('payment_intent_id').notNull(),
    checkoutSessionId: text('checkout_session_id').notNull(),
    eventId: text('event_id').notNull(),
    expertConnectAccountId: text('expert_connect_account_id').notNull(),
    expertWorkosUserId: text('expert_workos_user_id').notNull(),
    /** Amount in minor currency units (cents). E.g., 5000 = €50.00 */
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('eur'),
    /** Platform fee in minor currency units (cents) */
    platformFee: integer('platform_fee').notNull(),
    sessionStartTime: timestamp('session_start_time', { withTimezone: true }).notNull(),
    scheduledTransferTime: timestamp('scheduled_transfer_time', { withTimezone: true }).notNull(),
    status: paymentTransferStatusEnum('status').notNull().default(PAYMENT_TRANSFER_STATUS_PENDING),
    transferId: text('transfer_id'),
    payoutId: text('payout_id'),
    stripeErrorCode: text('stripe_error_code'),
    stripeErrorMessage: text('stripe_error_message'),
    retryCount: integer('retry_count').default(0),
    requiresApproval: boolean('requires_approval').default(false),
    adminUserId: text('admin_user_id'),
    adminNotes: text('admin_notes'),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('payment_transfers_org_id_idx').on(table.orgId),
    index('payment_transfers_expert_id_idx').on(table.expertConnectAccountId),
    pgPolicy('payment_transfers_read', {
      for: 'select',
      using: isOrgMember('org_id', 'payment_transfers'),
    }),
    pgPolicy('payment_transfers_modify', {
      for: 'all',
      using: sql`expert_workos_user_id = ${authUid}`,
    }),
  ],
);

/**
 * Scheduling Settings Table
 */
export const SchedulingSettingsTable = pgTable(
  'scheduling_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    workosUserId: text('workos_user_id').notNull(),
    beforeEventBuffer: integer('before_event_buffer').notNull().default(0),
    afterEventBuffer: integer('after_event_buffer').notNull().default(0),
    minimumNotice: integer('minimum_notice').notNull().default(0),
    timeSlotInterval: integer('time_slot_interval').notNull().default(15),
    bookingWindowDays: integer('booking_window_days').notNull().default(60),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('scheduling_settings_user_id_idx').on(table.workosUserId),
    pgPolicy('scheduling_settings_all', {
      for: 'all',
      using: sql`workos_user_id = ${authUid}`,
    }),
  ],
);

/**
 * Destination Calendars Table
 *
 * Stores the user's selected calendar where new booking events are pushed.
 * One destination per user (upsert on userId).
 * Calendar connection is optional -- the app works without it.
 */
export const DestinationCalendarsTable = pgTable(
  'destination_calendars',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => UsersTable.workosUserId, { onDelete: 'cascade' }),
    provider: text('provider').notNull().$type<'google-calendar' | 'microsoft-outlook-calendar'>(),
    externalId: text('external_id').notNull(),
    calendarName: text('calendar_name'),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('destination_calendars_user_id_idx').on(table.userId),
    pgPolicy('destination_calendars_all', {
      for: 'all',
      using: sql`user_id = ${authUid}`,
    }),
  ],
);

/**
 * Blocked Dates Table - Dates when experts are unavailable
 */
export const BlockedDatesTable = pgTable(
  'blocked_dates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    workosUserId: text('workos_user_id').notNull(),
    date: date('date').notNull(),
    timezone: text('timezone').notNull().default('UTC'),
    reason: text('reason'),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('blocked_dates_org_id_idx').on(table.orgId),
    index('blocked_dates_user_id_idx').on(table.workosUserId),
    index('blocked_dates_date_idx').on(table.date),
    pgPolicy('Users can view own blocked dates', {
      for: 'select',
      using: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Users can create own blocked dates', {
      for: 'insert',
      withCheck: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Users can update own blocked dates', {
      for: 'update',
      using: sql`workos_user_id = ${authUid}`,
      withCheck: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Users can delete own blocked dates', {
      for: 'delete',
      using: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Org members can view org blocked dates', {
      for: 'select',
      using: isOrgMember('org_id', 'blocked_dates'),
    }),
  ],
);

/**
 * Slot Reservations Table - Temporary holds for appointment slots
 *
 * Each record represents a temporary hold on an appointment slot while a guest
 * completes the booking process. This prevents double-bookings during checkout.
 * Records are automatically cleaned up after expiration.
 */
export const SlotReservationsTable = pgTable(
  'slot_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    eventId: uuid('event_id')
      .notNull()
      .references(() => EventsTable.id, { onDelete: 'cascade' }),
    workosUserId: text('workos_user_id').notNull(),
    // NOTE: Nullable during migration. After running backfill, make NOT NULL.
    guestWorkosUserId: text('guest_workos_user_id'),
    // @deprecated — retained for backfill migration only
    guestEmail: text('guest_email').notNull(),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
    stripeSessionId: text('stripe_session_id').unique(),
    gentleReminderSentAt: timestamp('gentle_reminder_sent_at', { withTimezone: true }),
    urgentReminderSentAt: timestamp('urgent_reminder_sent_at', { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('slot_reservations_org_id_idx').on(table.orgId),
    index('slot_reservations_event_id_idx').on(table.eventId),
    index('slot_reservations_user_id_idx').on(table.workosUserId),
    index('slot_reservations_expires_at_idx').on(table.expiresAt),
    index('slot_reservations_payment_intent_id_idx').on(table.stripePaymentIntentId),
    uniqueIndex('slot_reservations_active_slot_unique').on(
      table.eventId,
      table.startTime,
      table.guestWorkosUserId,
    ),
    pgPolicy('Users can view own reservations', {
      for: 'select',
      using: sql`guest_workos_user_id = ${authUid}`,
    }),
    pgPolicy('Experts can view event reservations', {
      for: 'select',
      using: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Experts can create event reservations', {
      for: 'insert',
      withCheck: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Experts can update event reservations', {
      for: 'update',
      using: sql`workos_user_id = ${authUid}`,
      withCheck: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Experts can delete event reservations', {
      for: 'delete',
      using: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Org members can view org reservations', {
      for: 'select',
      using: isOrgMember('org_id', 'slot_reservations'),
    }),
  ],
);

// ============================================================================
// SUBSCRIPTION & BILLING TABLES
// ============================================================================

/**
 * Subscription Plans Table
 *
 * 🏢 ORGANIZATION-OWNED SUBSCRIPTIONS (Industry Standard)
 *
 * Key Architecture:
 * - Organizations own subscriptions (one subscription per org)
 * - billingAdminUserId tracks who manages billing (can be transferred)
 * - Multiple users in same org share subscription benefits
 * - Subscription persists even if billing admin leaves
 *
 * Industry Pattern (Cal.com, Vercel, Dub):
 * Organization → Subscription → Members (shared access)
 *
 * 📊 SUBSCRIPTION BEHAVIOR BY ORGANIZATION TYPE:
 *
 * 1️⃣ SOLO EXPERTS (type: 'expert_individual') - Current:
 *    ┌─────────────────────────────────────────────────────────────┐
 *    │ Community Expert                                            │
 *    │   ├─ Personal Org (only 1 member: the expert)             │
 *    │   ├─ tierLevel: 'community'                               │
 *    │   ├─ planType: 'commission' | 'monthly' | 'annual'        │
 *    │   └─ Commission Rates:                                     │
 *    │       • Commission-only: 20%                              │
 *    │       • Monthly ($49/mo): 20% → 12% discount              │
 *    │       • Annual ($490/yr): 20% → 12% discount              │
 *    └─────────────────────────────────────────────────────────────┘
 *
 *    ┌─────────────────────────────────────────────────────────────┐
 *    │ Top Expert                                                  │
 *    │   ├─ Personal Org (only 1 member: the expert)             │
 *    │   ├─ tierLevel: 'top'                                     │
 *    │   ├─ planType: 'commission' | 'monthly' | 'annual'        │
 *    │   └─ Commission Rates:                                     │
 *    │       • Commission-only: 15%                              │
 *    │       • Monthly ($177/mo): 15% → 8% discount              │
 *    │       • Annual ($1,774/yr): 15% → 8% discount             │
 *    └─────────────────────────────────────────────────────────────┘
 *
 * 2️⃣ CLINICS (type: 'clinic') - Future Phase (Three-Party Model):
 *    ┌─────────────────────────────────────────────────────────────────┐
 *    │ Multi-Expert Clinic (Option B: Marketplace Model)              │
 *    │   ├─ Clinic Org (multiple members)                            │
 *    │   ├─ Workspace Subscription: $99-199/month                    │
 *    │   ├─ Clinic Marketing Fee: 10-25% (set by clinic)            │
 *    │   └─ Per-Expert Three-Party Revenue Split:                    │
 *    │                                                                │
 *    │       Patient books $100 with Dr. Maria (expert_top):         │
 *    │       ┌────────────────────────────────────────────┐          │
 *    │       │ Gross Amount: $100.00                      │          │
 *    │       ├─ Eleva (Platform): $8.00 (8%)             │          │
 *    │       ├─ Clinic (Marketing): $15.00 (15%)         │          │
 *    │       └─ Dr. Maria (Net): $77.00 (77%)            │          │
 *    │       └────────────────────────────────────────────┘          │
 *    │                                                                │
 *    │       Patient books $100 with Dr. João (expert_community):    │
 *    │       ┌────────────────────────────────────────────┐          │
 *    │       │ Gross Amount: $100.00                      │          │
 *    │       ├─ Eleva (Platform): $12.00 (12%)           │          │
 *    │       ├─ Clinic (Marketing): $15.00 (15%)         │          │
 *    │       └─ Dr. João (Net): $73.00 (73%)             │          │
 *    │       └────────────────────────────────────────────┘          │
 *    │                                                                │
 *    │   💡 Three-Party Model Rules:                                 │
 *    │      • Platform charges EXPERT (not clinic)                   │
 *    │      • Clinic charges EXPERT for marketing/patients           │
 *    │      • Expert minimum: 60% net payment                        │
 *    │      • Total fees maximum: 40% (platform + clinic)            │
 *    │      • Industry standard: Upwork, Airbnb, Cal.com             │
 *    └─────────────────────────────────────────────────────────────────┘
 *
 * 🔑 CRITICAL DESIGN DECISIONS:
 * - Solo experts: User role = Subscription tier (1:1 mapping)
 * - Clinics: Each expert keeps their individual tier for commission
 * - Commission rates determined by expert's role, NOT org subscription
 * - This allows fair compensation and talent retention in clinics
 *
 * Plan Types:
 * - 'commission': Pay per transaction, no upfront fee (default for new experts)
 * - 'monthly': Fixed monthly fee + reduced commission rate
 * - 'annual': Fixed yearly fee + lowest commission rate (best value)
 */
export const SubscriptionPlansTable = pgTable(
  'subscription_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // 🏢 PRIMARY OWNER: Organization
    // One subscription per organization (industry standard)
    orgId: uuid('org_id')
      .notNull()
      .unique() // ✅ Ensures one subscription per organization
      .references(() => OrganizationsTable.id, { onDelete: 'cascade' }),

    // 👤 SECONDARY: Billing Administrator
    // User who manages the subscription (can be transferred to another org member)
    // Uses 'restrict' to prevent accidental deletion if admin leaves org
    billingAdminUserId: text('billing_admin_user_id').notNull(),

    // Plan configuration
    planType: text('plan_type').notNull().$type<'commission' | 'monthly' | 'annual'>(), // Current plan type
    tierLevel: text('tier_level').notNull().$type<'community' | 'top'>(), // Expert tier

    // Commission-based plan details
    commissionRate: integer('commission_rate'), // Store as basis points (e.g., 2000 = 20%)

    // Subscription details (monthly or annual)
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    stripeCustomerId: text('stripe_customer_id'), // Denormalized for quick access
    stripePriceId: text('stripe_price_id'), // The specific price they're subscribed to
    billingInterval: text('billing_interval').$type<'month' | 'year'>(), // Monthly or annual billing
    monthlyFee: integer('monthly_fee'), // in cents (e.g., 4900 = $49/mo)
    annualFee: integer('annual_fee'), // in cents (e.g., 49000 = $490/year)
    subscriptionStartDate: timestamp('subscription_start_date', { withTimezone: true }),
    subscriptionEndDate: timestamp('subscription_end_date', { withTimezone: true }),
    subscriptionStatus: text('subscription_status').$type<
      'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
    >(),
    autoRenew: boolean('auto_renew').default(true),

    // Upgrade/transition tracking
    previousPlanType: text('previous_plan_type').$type<'commission' | 'monthly' | 'annual'>(),
    upgradedAt: timestamp('upgraded_at', { withTimezone: true }),
    commissionsPaidBeforeUpgrade: integer('commissions_paid_before_upgrade'), // in cents

    // Eligibility flags
    isEligibleForAnnual: boolean('is_eligible_for_annual').default(false),
    eligibilityNotificationSent: boolean('eligibility_notification_sent').default(false),
    eligibilityLastChecked: timestamp('eligibility_last_checked', { withTimezone: true }),

    createdAt,
    updatedAt,
  },
  (table) => [
    foreignKey({
      name: 'sub_plans_billing_admin_fk',
      columns: [table.billingAdminUserId],
      foreignColumns: [UsersTable.workosUserId],
    }).onDelete('restrict'),
    index('subscription_plans_org_id_idx').on(table.orgId),
    index('subscription_plans_billing_admin_idx').on(table.billingAdminUserId),
    index('subscription_plans_stripe_sub_idx').on(table.stripeSubscriptionId),
    index('subscription_plans_plan_type_idx').on(table.planType),
    pgPolicy('Org members can view org subscription', {
      for: 'select',
      using: isOrgMember('org_id', 'subscription_plans'),
    }),
    pgPolicy('Billing admin can update subscription', {
      for: 'update',
      using: sql.raw(`
        billing_admin_user_id = auth.user_id()
        OR EXISTS (
          SELECT 1 FROM user_org_memberships
          WHERE user_org_memberships.org_id = subscription_plans.org_id
          AND user_org_memberships.workos_user_id = auth.user_id()
          AND user_org_memberships.role IN ('owner', 'admin')
          AND user_org_memberships.status = 'active'
        )
      `),
      withCheck: sql.raw(`
        billing_admin_user_id = auth.user_id()
        OR EXISTS (
          SELECT 1 FROM user_org_memberships
          WHERE user_org_memberships.org_id = subscription_plans.org_id
          AND user_org_memberships.workos_user_id = auth.user_id()
          AND user_org_memberships.role IN ('owner', 'admin')
          AND user_org_memberships.status = 'active'
        )
      `),
    }),
    pgPolicy('Org owners can insert subscription', {
      for: 'insert',
      withCheck: sql.raw(`
        EXISTS (
          SELECT 1 FROM user_org_memberships
          WHERE user_org_memberships.org_id = subscription_plans.org_id
          AND user_org_memberships.workos_user_id = auth.user_id()
          AND user_org_memberships.role IN ('owner', 'admin')
          AND user_org_memberships.status = 'active'
        )
      `),
    }),
    pgPolicy('Org owners can delete subscription', {
      for: 'delete',
      using: sql.raw(`
        EXISTS (
          SELECT 1 FROM user_org_memberships
          WHERE user_org_memberships.org_id = subscription_plans.org_id
          AND user_org_memberships.workos_user_id = auth.user_id()
          AND user_org_memberships.role = 'owner'
          AND user_org_memberships.status = 'active'
        )
      `),
    }),
    pgPolicy('Admins can view all subscriptions', {
      for: 'select',
      using: isAdmin,
    }),
  ],
);

/**
 * Transaction Commissions Table
 *
 * Records every commission transaction when a patient books an appointment.
 *
 * 💰 COMMISSION CALCULATION LOGIC:
 *
 * 1️⃣ SOLO EXPERTS (type: 'expert_individual'):
 *    Commission rate determined by expert's role + subscription plan:
 *
 *    Community Expert (role: 'expert_community'):
 *      • Commission-only: 20% of booking
 *      • Monthly subscription: 12% of booking ($49/mo + 12%)
 *      • Annual subscription: 12% of booking ($490/yr + 12%)
 *
 *    Top Expert (role: 'expert_top'):
 *      • Commission-only: 15% of booking
 *      • Monthly subscription: 8% of booking ($177/mo + 8%)
 *      • Annual subscription: 8% of booking ($1,774/yr + 8%)
 *
 * 2️⃣ CLINICS (type: 'clinic') - Future (Option B: Three-Party Model):
 *    THREE-PARTY REVENUE SPLIT (Industry Standard):
 *    Patient → Eleva (Platform Fee) → Clinic (Marketing Fee) → Expert (Net)
 *
 *    Example: Patient books $100 with Dr. Maria (expert_top + annual):
 *      ┌─────────────────────────────────────────────────┐
 *      │ Gross Amount: $100.00                           │
 *      ├─ Eleva Platform Fee: $8.00 (8%)                │
 *      │    → Based on Dr. Maria's tier (expert_top)    │
 *      │    → Based on her subscription (annual)        │
 *      ├─ Clinic Marketing Fee: $15.00 (15%)            │
 *      │    → Set by clinic for patient acquisition     │
 *      │    → Compensates clinic for marketing/brand    │
 *      └─ Expert Net Payment: $77.00 (77%)              │
 *          → Dr. Maria receives via Stripe Connect      │
 *      └─────────────────────────────────────────────────┘
 *
 *    Example: Patient books $100 with Dr. João (expert_community + monthly):
 *      ┌─────────────────────────────────────────────────┐
 *      │ Gross Amount: $100.00                           │
 *      ├─ Eleva Platform Fee: $12.00 (12%)              │
 *      ├─ Clinic Marketing Fee: $15.00 (15%)            │
 *      └─ Expert Net Payment: $73.00 (73%)              │
 *      └─────────────────────────────────────────────────┘
 *
 *    💡 Why Three-Party Model (Option B)?
 *       - Industry standard (Upwork, Airbnb, Cal.com)
 *       - Fair compensation (experts keep their tier benefits)
 *       - Clinic compensation (for patient acquisition)
 *       - Expert protection (minimum 60% net, max 40% total fees)
 *       - Transparent pricing (experts see full breakdown)
 *
 * 📊 CALCULATION FLOW:
 *
 *    SOLO EXPERT (Two-Party):
 *    1. Patient pays $100 for appointment
 *    2. Lookup expert's role (expert_top or expert_community)
 *    3. Lookup org subscription (commission/monthly/annual)
 *    4. Calculate platform commission (e.g., expert_top + annual = 8% = $8)
 *    5. Expert receives net amount ($92)
 *    6. Record: platformCommissionAmount=$8, clinicCommissionAmount=$0, expertNetAmount=$92
 *
 *    CLINIC EXPERT (Three-Party - Option B):
 *    1. Patient pays $100 for appointment
 *    2. Lookup expert's role (expert_top or expert_community)
 *    3. Lookup org subscription (commission/monthly/annual)
 *    4. Calculate platform commission (e.g., expert_top + annual = 8% = $8)
 *    5. Lookup clinic's marketing fee (e.g., 15% = $15)
 *    6. Validate: Total fees (8% + 15% = 23%) < 40% ✅
 *    7. Validate: Expert net (77%) > 60% ✅
 *    8. Expert receives net amount ($77 = $100 - $8 - $15)
 *    9. Record: platformCommissionAmount=$8, clinicCommissionAmount=$15, expertNetAmount=$77
 *
 * 🎯 METADATA FIELDS (planTypeAtTransaction, tierLevelAtTransaction):
 *    These capture the expert's state at transaction time for:
 *    - Historical accuracy (even if they upgrade/downgrade later)
 *    - Financial reporting and analytics
 *    - Eligibility calculations (how much they paid in commissions)
 *    - Audit trail for dispute resolution
 *
 * Used for:
 * - Tracking total commissions paid per expert
 * - Calculating eligibility for subscription upgrades
 * - Financial reporting and reconciliation
 * - Audit trail for payments and disputes
 */
export const TransactionCommissionsTable = pgTable(
  'transaction_commissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id')
      .notNull()
      .references(() => UsersTable.workosUserId, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => OrganizationsTable.id, { onDelete: 'cascade' }),

    // Related appointment
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => MeetingsTable.id, { onDelete: 'cascade' }),

    // Transaction details
    grossAmount: integer('gross_amount').notNull(), // Total booking amount in cents
    commissionRate: integer('commission_rate').notNull(), // Basis points at time of transaction
    commissionAmount: integer('commission_amount').notNull(), // Commission taken in cents
    netAmount: integer('net_amount').notNull(), // Amount expert receives in cents
    currency: text('currency').notNull().default('eur'),

    // Stripe references
    stripePaymentIntentId: text('stripe_payment_intent_id').notNull(),
    stripeTransferId: text('stripe_transfer_id'), // Stripe Connect transfer ID
    stripeApplicationFeeId: text('stripe_application_fee_id'), // Application fee ID

    // Status tracking
    status: text('status').notNull().$type<'pending' | 'processed' | 'refunded' | 'disputed'>(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),

    // 📸 Metadata for reporting (snapshot at transaction time)
    // These fields capture the expert's state when the transaction occurred,
    // ensuring historical accuracy even if the expert upgrades/downgrades later.
    //
    // Example: Expert pays 20% commission on Jan 1, then upgrades to annual (12%)
    //          on Feb 1. All Jan transactions show planTypeAtTransaction: 'commission'
    //          for accurate historical reporting and eligibility calculations.
    planTypeAtTransaction: text('plan_type_at_transaction').$type<
      'commission' | 'monthly' | 'annual'
    >(), // What subscription plan they were on when this transaction occurred
    tierLevelAtTransaction: text('tier_level_at_transaction').$type<'community' | 'top'>(), // Their expert level at transaction time

    createdAt,
    updatedAt,
  },
  (table) => [
    foreignKey({
      name: 'tx_commissions_payment_intent_fk',
      columns: [table.stripePaymentIntentId],
      foreignColumns: [MeetingsTable.stripePaymentIntentId],
    }),
    index('transaction_commissions_user_id_idx').on(table.workosUserId),
    index('transaction_commissions_org_id_idx').on(table.orgId),
    index('transaction_commissions_meeting_id_idx').on(table.meetingId),
    index('transaction_commissions_status_idx').on(table.status),
    index('transaction_commissions_created_at_idx').on(table.createdAt),
    index('transaction_commissions_payment_intent_idx').on(table.stripePaymentIntentId),
    pgPolicy('Users can view org commissions', {
      for: 'select',
      using: isOrgMember('org_id', 'transaction_commissions'),
    }),
    pgPolicy('System can insert commissions', {
      for: 'insert',
      withCheck: sql`${authUid} IS NOT NULL`,
    }),
    pgPolicy('System can update commissions', {
      for: 'update',
      using: isOrgMember('org_id', 'transaction_commissions'),
      withCheck: isOrgMember('org_id', 'transaction_commissions'),
    }),
    pgPolicy('Admins can view all commissions', {
      for: 'select',
      using: isAdmin,
    }),
  ],
);

/**
 * Annual Plan Eligibility Table
 *
 * Tracks metrics to determine if an expert qualifies for annual subscription:
 * - Monthly revenue averages
 * - Appointment counts
 * - Active duration
 * - Projected savings
 *
 * Updated by cron job daily/weekly
 */
export const AnnualPlanEligibilityTable = pgTable(
  'annual_plan_eligibility',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id')
      .notNull()
      .unique()
      .references(() => UsersTable.workosUserId, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => OrganizationsTable.id, { onDelete: 'cascade' }),

    // Eligibility metrics (rolling 90-day window)
    monthsActive: integer('months_active').default(0), // Months since becoming expert
    totalBookings: integer('total_bookings').default(0), // All-time completed bookings
    bookingsLast90Days: integer('bookings_last_90_days').default(0),
    avgMonthlyRevenue: integer('avg_monthly_revenue').default(0), // in cents, last 90 days
    totalCommissionsPaid: integer('total_commissions_paid').default(0), // All-time, in cents
    commissionsLast90Days: integer('commissions_last_90_days').default(0), // in cents
    currentRating: integer('current_rating'), // Store as integer (e.g., 450 = 4.50)

    // Eligibility status
    isEligible: boolean('is_eligible').default(false),
    eligibleSince: timestamp('eligible_since', { withTimezone: true }),
    tierLevel: text('tier_level').$type<'community' | 'top'>(),

    // Projected savings calculation
    projectedAnnualCommissions: integer('projected_annual_commissions'), // in cents
    projectedAnnualSavings: integer('projected_annual_savings'), // in cents
    savingsPercentage: integer('savings_percentage'), // Store as basis points (e.g., 3600 = 36%)
    breakEvenMonthlyRevenue: integer('break_even_monthly_revenue'), // in cents

    // Calculation metadata
    lastCalculated: timestamp('last_calculated', { withTimezone: true }).notNull().defaultNow(),
    calculationVersion: integer('calculation_version').default(1), // For formula updates

    createdAt,
    updatedAt,
  },
  (table) => [
    index('annual_eligibility_user_id_idx').on(table.workosUserId),
    index('annual_eligibility_org_id_idx').on(table.orgId),
    index('annual_eligibility_eligible_idx').on(table.isEligible),
    index('annual_eligibility_last_calc_idx').on(table.lastCalculated),
    pgPolicy('Users can view own eligibility', {
      for: 'select',
      using: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Users can create own eligibility', {
      for: 'insert',
      withCheck: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Users can update own eligibility', {
      for: 'update',
      using: sql`workos_user_id = ${authUid}`,
      withCheck: sql`workos_user_id = ${authUid}`,
    }),
    pgPolicy('Org members can view org eligibility', {
      for: 'select',
      using: isOrgMember('org_id', 'annual_plan_eligibility'),
    }),
  ],
);

/**
 * Subscription Events Table
 *
 * Audit trail for all subscription-related events:
 * - Plan changes (commission → annual, annual → commission)
 * - Upgrades/downgrades
 * - Cancellations
 * - Renewals
 * - Payment failures
 */
export const SubscriptionEventsTable = pgTable(
  'subscription_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id')
      .notNull()
      .references(() => UsersTable.workosUserId, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => OrganizationsTable.id, { onDelete: 'cascade' }),
    subscriptionPlanId: uuid('subscription_plan_id'),

    // Event details
    eventType: text('event_type')
      .notNull()
      .$type<
        | 'plan_created'
        | 'plan_upgraded'
        | 'plan_downgraded'
        | 'subscription_started'
        | 'subscription_renewed'
        | 'subscription_canceled'
        | 'subscription_expired'
        | 'payment_succeeded'
        | 'payment_failed'
        | 'eligibility_achieved'
        | 'eligibility_lost'
      >(),

    // Plan state before/after
    previousPlanType: text('previous_plan_type').$type<'commission' | 'monthly' | 'annual'>(),
    newPlanType: text('new_plan_type').$type<'commission' | 'monthly' | 'annual'>(),
    previousTierLevel: text('previous_tier_level').$type<'community' | 'top'>(),
    newTierLevel: text('new_tier_level').$type<'community' | 'top'>(),

    // Stripe event reference
    stripeEventId: text('stripe_event_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),

    // Additional context
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    reason: text('reason'), // e.g., "user_requested", "payment_failed", "auto_upgrade"

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'sub_events_plan_id_fk',
      columns: [table.subscriptionPlanId],
      foreignColumns: [SubscriptionPlansTable.id],
    }).onDelete('set null'),
    index('subscription_events_user_id_idx').on(table.workosUserId),
    index('subscription_events_org_id_idx').on(table.orgId),
    index('subscription_events_plan_id_idx').on(table.subscriptionPlanId),
    index('subscription_events_type_idx').on(table.eventType),
    index('subscription_events_created_at_idx').on(table.createdAt),
    pgPolicy('Users can view org subscription events', {
      for: 'select',
      using: isOrgMember('org_id', 'subscription_events'),
    }),
    pgPolicy('System can insert subscription events', {
      for: 'insert',
      withCheck: sql`${authUid} IS NOT NULL`,
    }),
    pgPolicy('Admins can view all subscription events', {
      for: 'select',
      using: isAdmin,
    }),
  ],
);

// ============================================================================
// UNIFIED AUDIT LOGGING (from schema-audit-workos.ts)
// ============================================================================

/**
 * Audit event action types for HIPAA compliance
 */
export type AuditEventAction =
  // Medical Records (PHI)
  | 'MEDICAL_RECORD_CREATED'
  | 'MEDICAL_RECORD_VIEWED'
  | 'MEDICAL_RECORD_UPDATED'
  | 'MEDICAL_RECORD_DELETED'
  | 'MEDICAL_RECORDS_EXPORTED'
  // Events (Expert service offerings)
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED'
  | 'EVENT_DELETED'
  | 'EVENT_ACTIVATED'
  | 'EVENT_DEACTIVATED'
  // Appointments
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_VIEWED'
  | 'APPOINTMENT_UPDATED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_COMPLETED'
  | 'APPOINTMENT_NO_SHOW'
  // Payments
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_DISPUTED'
  // Prescriptions
  | 'PRESCRIPTION_CREATED'
  | 'PRESCRIPTION_VIEWED'
  | 'PRESCRIPTION_UPDATED'
  | 'PRESCRIPTION_CANCELLED'
  // Health Data
  | 'HEALTH_DATA_ACCESSED'
  | 'HEALTH_DATA_EXPORTED'
  | 'LAB_RESULTS_VIEWED'
  | 'DIAGNOSIS_RECORDED'
  // User Management
  | 'PROFILE_CREATED'
  | 'PROFILE_UPDATED'
  | 'PROFILE_VIEWED'
  | 'PROFILE_DELETED'
  // Organization Management
  | 'ORG_MEMBER_INVITED'
  | 'ORG_MEMBER_REMOVED'
  | 'ORG_SETTINGS_UPDATED'
  | 'ORG_SUBSCRIPTION_CHANGED'
  // Security
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'SUSPICIOUS_ACTIVITY_DETECTED'
  | 'DATA_BREACH_DETECTED'
  | 'SECURITY_ALERT_TRIGGERED'
  // Compliance
  | 'COMPLIANCE_REPORT_GENERATED'
  | 'AUDIT_LOG_EXPORTED'
  | 'GDPR_DATA_REQUEST'
  | 'GDPR_DATA_DELETION'
  // Integrations
  | 'google_calendar.connection_initiated'
  | 'google_calendar.connected'
  | 'google_calendar.connection_failed'
  | 'google_calendar.disconnected'
  | 'google_calendar.token_refreshed';

export type AuditResourceType =
  | 'medical_record'
  | 'event'
  | 'appointment'
  | 'payment'
  | 'prescription'
  | 'health_data'
  | 'lab_result'
  | 'profile'
  | 'organization'
  | 'user'
  | 'subscription'
  | 'security'
  | 'compliance'
  | 'integration';

/**
 * Audit Logs Table
 *
 * Stores all PHI access and application events for HIPAA compliance.
 * Uses RLS to ensure org-scoped access.
 *
 * PII HANDLING CONSIDERATIONS:
 * - ipAddress: Contains user IP addresses. Consider:
 *   - Anonymization: Store only first 3 octets (e.g., 192.168.1.xxx) or hash
 *   - Retention: Implement scheduled job to redact after N days
 * - oldValues/newValues: May contain sensitive data. Consider:
 *   - Redacting sensitive fields before storing
 *   - Encryption at rest
 *   - Access control policies
 *
 * FK CONSTRAINTS NOTE:
 * - workosUserId intentionally does NOT have a FK to users table.
 *   This allows audit logs to persist after user deletion for compliance.
 *   The trade-off is referential integrity, which is acceptable for append-only audit data.
 *
 * RETENTION POLICY TODO:
 * - Implement automated retention policy (e.g., 7 years for HIPAA)
 * - Consider partitioning by created_at for efficient purging
 */
export const AuditLogsTable = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // NOTE: No FK to users table - allows audit logs to persist after user deletion
    workosUserId: text('workos_user_id').notNull(),
    // TODO (Phase 5): Make orgId .notNull() after migration complete
    orgId: uuid('org_id'), // Temporarily nullable during migration
    action: text('action').notNull().$type<AuditEventAction>(),
    resourceType: text('resource_type').notNull().$type<AuditResourceType>(),
    resourceId: text('resource_id'),
    /** May contain PII - consider redaction strategy */
    oldValues: jsonb('old_values').$type<Record<string, unknown>>(),
    /** May contain PII - consider redaction strategy */
    newValues: jsonb('new_values').$type<Record<string, unknown>>(),
    /** Consider anonymization/hashing for GDPR compliance */
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // HIPAA Security Rule enhancements
    outcome: text('outcome').notNull().default('success').$type<'success' | 'failure' | 'denied'>(),
    phiAccessed: boolean('phi_accessed').notNull().default(false),
    sessionId: text('session_id'),
    severity: text('severity').notNull().default('info').$type<'info' | 'warning' | 'error' | 'critical'>(),
    retainUntil: timestamp('retain_until', { withTimezone: true })
      .notNull()
      .$defaultFn(() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 7);
        return d;
      }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_org_id_idx').on(table.orgId),
    index('audit_logs_user_id_idx').on(table.workosUserId),
    index('audit_logs_created_at_idx').on(table.createdAt),
    index('audit_logs_action_idx').on(table.action),
    index('audit_logs_resource_type_idx').on(table.resourceType),
    index('audit_logs_org_created_idx').on(table.orgId, table.createdAt),
    pgPolicy('audit_logs_read', {
      for: 'select',
      using: isOrgMember('org_id', 'audit_logs'),
    }),
    pgPolicy('audit_logs_insert', {
      for: 'insert',
      withCheck: sql`${authUid} IS NOT NULL`,
    }),
  ],
);

// ============================================================================
// COMPLIANCE & GOVERNANCE TABLES
// ============================================================================

/**
 * Consent Records Table — GDPR Art. 7
 *
 * Append-only log of user consent events. Revocation is tracked via revokedAt,
 * never by updating or deleting a row.
 */
export const ConsentRecordsTable = pgTable(
  'consent_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => OrganizationsTable.id),
    consentType: text('consent_type')
      .notNull()
      .$type<'terms_of_service' | 'privacy_policy' | 'marketing' | 'calendar_data_processing' | 'cookie'>(),
    version: text('version').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('consent_records_user_id_idx').on(table.userId),
    index('consent_records_org_id_idx').on(table.orgId),
    index('consent_records_type_idx').on(table.consentType),
    pgPolicy('consent_records_read', {
      for: 'select',
      to: authenticatedRole,
      using: sql`user_id = ${authUid}`,
    }),
    pgPolicy('consent_records_insert', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`user_id = ${authUid}`,
    }),
  ],
);

/**
 * Data Subject Requests Table — GDPR Art. 15
 *
 * Tracks data access, erasure, rectification, portability, restriction, and
 * objection requests. 30-day response deadline is set automatically.
 */
export const DataSubjectRequestsTable = pgTable(
  'data_subject_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => OrganizationsTable.id),
    requestType: text('request_type')
      .notNull()
      .$type<'access' | 'erasure' | 'rectification' | 'portability' | 'restriction' | 'objection'>(),
    status: text('status')
      .notNull()
      .default('pending')
      .$type<'pending' | 'in_progress' | 'completed' | 'rejected'>(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    responseDeadline: timestamp('response_deadline', { withTimezone: true })
      .notNull()
      .$defaultFn(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d;
      }),
    adminUserId: text('admin_user_id'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('dsar_user_id_idx').on(table.userId),
    index('dsar_org_id_idx').on(table.orgId),
    index('dsar_status_idx').on(table.status),
    index('dsar_deadline_idx').on(table.responseDeadline),
    pgPolicy('dsar_read_own', {
      for: 'select',
      to: authenticatedRole,
      using: sql`user_id = ${authUid}`,
    }),
    pgPolicy('dsar_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`user_id = ${authUid}`,
    }),
    pgPolicy('dsar_admin_manage', {
      for: 'all',
      to: authenticatedRole,
      using: isAdmin,
    }),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const scheduleRelations = relations(SchedulesTable, ({ many }) => ({
  availabilities: many(ScheduleAvailabilitiesTable),
}));

export const scheduleAvailabilityRelations = relations(ScheduleAvailabilitiesTable, ({ one }) => ({
  schedule: one(SchedulesTable, {
    fields: [ScheduleAvailabilitiesTable.scheduleId],
    references: [SchedulesTable.id],
  }),
}));

export const meetingRelations = relations(MeetingsTable, ({ one }) => ({
  event: one(EventsTable, {
    fields: [MeetingsTable.eventId],
    references: [EventsTable.id],
  }),
}));

export const profileRelations = relations(ProfilesTable, ({ many, one }) => ({
  meetings: many(MeetingsTable),
  events: many(EventsTable),
  user: one(UsersTable, {
    fields: [ProfilesTable.workosUserId],
    references: [UsersTable.workosUserId],
  }),
  primaryCategory: one(CategoriesTable, {
    fields: [ProfilesTable.primaryCategoryId],
    references: [CategoriesTable.id],
    relationName: 'primaryCategory',
  }),
  secondaryCategory: one(CategoriesTable, {
    fields: [ProfilesTable.secondaryCategoryId],
    references: [CategoriesTable.id],
    relationName: 'secondaryCategory',
  }),
}));

export const categoryRelations = relations(CategoriesTable, ({ many, one }) => ({
  primaryProfiles: many(ProfilesTable, { relationName: 'primaryCategory' }),
  secondaryProfiles: many(ProfilesTable, { relationName: 'secondaryCategory' }),
  parentCategory: one(CategoriesTable, {
    fields: [CategoriesTable.parentId],
    references: [CategoriesTable.id],
    relationName: 'parentChild',
  }),
  childCategories: many(CategoriesTable, { relationName: 'parentChild' }),
}));

export const userRelations = relations(UsersTable, ({ many, one }) => ({
  events: many(EventsTable),
  meetings: many(MeetingsTable),
  profile: one(ProfilesTable),
}));

export const organizationRelations = relations(OrganizationsTable, ({ many }) => ({
  memberships: many(UserOrgMembershipsTable),
}));

export const userOrgMembershipRelations = relations(UserOrgMembershipsTable, ({ one }) => ({
  organization: one(OrganizationsTable, {
    fields: [UserOrgMembershipsTable.orgId],
    references: [OrganizationsTable.id],
  }),
}));

export const eventRelations = relations(EventsTable, ({ one }) => ({
  user: one(UsersTable, {
    fields: [EventsTable.workosUserId],
    references: [UsersTable.workosUserId],
  }),
}));

export const recordsRelations = relations(RecordsTable, ({ one }) => ({
  meeting: one(MeetingsTable, {
    fields: [RecordsTable.meetingId],
    references: [MeetingsTable.id],
  }),
  expert: one(UsersTable, {
    fields: [RecordsTable.expertId],
    references: [UsersTable.workosUserId],
  }),
}));

export const subscriptionPlanRelations = relations(SubscriptionPlansTable, ({ one, many }) => ({
  organization: one(OrganizationsTable, {
    fields: [SubscriptionPlansTable.orgId],
    references: [OrganizationsTable.id],
  }),
  billingAdmin: one(UsersTable, {
    fields: [SubscriptionPlansTable.billingAdminUserId],
    references: [UsersTable.workosUserId],
  }),
  events: many(SubscriptionEventsTable),
  commissions: many(TransactionCommissionsTable),
}));

export const transactionCommissionRelations = relations(TransactionCommissionsTable, ({ one }) => ({
  user: one(UsersTable, {
    fields: [TransactionCommissionsTable.workosUserId],
    references: [UsersTable.workosUserId],
  }),
  organization: one(OrganizationsTable, {
    fields: [TransactionCommissionsTable.orgId],
    references: [OrganizationsTable.id],
  }),
  meeting: one(MeetingsTable, {
    fields: [TransactionCommissionsTable.meetingId],
    references: [MeetingsTable.id],
  }),
  // Link to subscription via organization (org-centric)
  subscriptionPlan: one(SubscriptionPlansTable, {
    fields: [TransactionCommissionsTable.orgId],
    references: [SubscriptionPlansTable.orgId],
  }),
}));

export const annualPlanEligibilityRelations = relations(AnnualPlanEligibilityTable, ({ one }) => ({
  user: one(UsersTable, {
    fields: [AnnualPlanEligibilityTable.workosUserId],
    references: [UsersTable.workosUserId],
  }),
  organization: one(OrganizationsTable, {
    fields: [AnnualPlanEligibilityTable.orgId],
    references: [OrganizationsTable.id],
  }),
}));

export const subscriptionEventRelations = relations(SubscriptionEventsTable, ({ one }) => ({
  user: one(UsersTable, {
    fields: [SubscriptionEventsTable.workosUserId],
    references: [UsersTable.workosUserId],
  }),
  organization: one(OrganizationsTable, {
    fields: [SubscriptionEventsTable.orgId],
    references: [OrganizationsTable.id],
  }),
  subscriptionPlan: one(SubscriptionPlansTable, {
    fields: [SubscriptionEventsTable.subscriptionPlanId],
    references: [SubscriptionPlansTable.id],
  }),
}));

export const destinationCalendarRelations = relations(DestinationCalendarsTable, ({ one }) => ({
  user: one(UsersTable, {
    fields: [DestinationCalendarsTable.userId],
    references: [UsersTable.workosUserId],
  }),
}));
