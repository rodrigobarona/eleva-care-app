/**
 * Complete WorkOS Schema with Neon Auth RLS
 *
 * This schema replaces the Clerk-based schema with:
 * - WorkOS user IDs (text) instead of Clerk IDs
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
import { DAYS_OF_WEEK_IN_ORDER } from '@/app/data/constants';
import {
  PAYMENT_TRANSFER_STATUS_PENDING,
  PAYMENT_TRANSFER_STATUSES,
} from '@/lib/constants/payment-transfers';
import type { SocialMediaPlatform } from '@/lib/constants/social-media';
import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Common timestamp fields used across multiple tables
 */
const createdAt = timestamp('created_at').notNull().defaultNow();
const updatedAt = timestamp('updated_at')
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

// ============================================================================
// CORE WORKOS TABLES (Authentication & Organization Management)
// ============================================================================

/**
 * Organization types for different use cases
 */
export type OrganizationType =
  | 'patient_personal' // Individual patient's personal organization
  | 'expert_individual' // Solo expert's organization
  | 'clinic' // Multi-expert clinic
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

    // Metadata
    createdAt,
    updatedAt,
  },
  (table) => ({
    // 🔒 RLS: Applied via SQL migration (drizzle/migrations-manual/001_enable_rls.sql)
    workosOrgIdIndex: index('organizations_workos_org_id_idx').on(table.workosOrgId),
    slugIndex: index('organizations_slug_idx').on(table.slug),
  }),
);

/**
 * Roles Table
 *
 * Stores user roles for RBAC (Role-Based Access Control).
 * Replaces Clerk's publicMetadata.role approach.
 */
export const RolesTable = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id').notNull(),
    role: text('role').notNull(), // 'user', 'expert', 'admin', 'superadmin', etc.

    // Metadata
    createdAt,
    updatedAt,
  },
  (table) => ({
    workosUserIdIndex: index('roles_workos_user_id_idx').on(table.workosUserId),
    // Allow multiple roles per user
    uniqueUserRole: unique('unique_user_role').on(table.workosUserId, table.role),
  }),
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

    // TODO: Remove after migration - fetch from WorkOS API or ProfilesTable (Phase 5)
    firstName: text('first_name'),
    lastName: text('last_name'),

    // Application role (Phase 3: Roles & Permissions)
    // WorkOS membership roles are stored in UserOrgMembershipsTable
    role: text('role')
      .notNull()
      .default('user')
      .$type<
        'user' | 'expert_top' | 'expert_community' | 'expert_lecturer' | 'admin' | 'superadmin'
      >(),

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
    stripeIdentityVerificationLastChecked: timestamp('stripe_identity_verification_last_checked'),

    country: text('country').default('PT'),

    // TODO: Remove after migration - fetch from WorkOS (Phase 5)
    imageUrl: text('image_url'),
    welcomeEmailSentAt: timestamp('welcome_email_sent_at'),
    onboardingCompletedAt: timestamp('onboarding_completed_at'),

    createdAt,
    updatedAt,
  },
  (table) => ({
    workosUserIdIndex: index('users_workos_user_id_idx').on(table.workosUserId),
    emailIndex: index('users_email_idx').on(table.email),
    stripeCustomerIdIndex: index('users_stripe_customer_id_idx').on(table.stripeCustomerId),
  }),
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
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
    createdAt,
    updatedAt,
  },
  (table) => ({
    // 🔒 RLS: Applied via SQL migration
    userIdIndex: index('memberships_user_id_idx').on(table.workosUserId),
    orgIdIndex: index('memberships_org_id_idx').on(table.orgId),
    userOrgUnique: unique('user_org_unique').on(table.workosUserId, table.orgId),
  }),
);

// ============================================================================
// USER METADATA TABLES (Phase 3: Roles & Permissions)
// ============================================================================

/**
 * Expert Setup Table
 *
 * Tracks expert onboarding progress in database (replaces Clerk unsafeMetadata).
 *
 * Benefits over Clerk metadata:
 * - Queryable: Can find all incomplete setups
 * - Indexed: Fast filtering and analytics
 * - Audit trail: Track completion dates
 * - No size limits: Store unlimited data
 * - No API calls: Direct database access
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
    setupCompletedAt: timestamp('setup_completed_at'),

    // Timestamps
    createdAt,
    updatedAt,
  },
  (table) => ({
    // 🔒 RLS: Applied via SQL migration (drizzle/migrations-manual/002_phase3_enable_rls.sql)
    // Policies: Users can only access their own setup records (matched by workos_user_id)
    userIdIndex: index('expert_setup_user_id_idx').on(table.workosUserId),
    orgIdIndex: index('expert_setup_org_id_idx').on(table.orgId),
    setupCompleteIndex: index('expert_setup_complete_idx').on(table.setupComplete),
  }),
);

/**
 * User Preferences Table
 *
 * Stores user preferences and settings (replaces Clerk publicMetadata).
 *
 * Benefits over Clerk metadata:
 * - Queryable: Can filter by preferences
 * - Indexed: Fast queries for notifications, etc.
 * - Type-safe: Schema validation
 * - Unlimited: No 32KB limit
 * - Versioned: Track changes with updatedAt
 */
export const UserPreferencesTable = pgTable(
  'user_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id')
      .notNull()
      .unique()
      .references(() => UsersTable.workosUserId, { onDelete: 'cascade' }),
    orgId: uuid('org_id').references(() => OrganizationsTable.id, { onDelete: 'cascade' }),

    // Security preferences
    securityAlerts: boolean('security_alerts').notNull().default(true),
    newDeviceAlerts: boolean('new_device_alerts').notNull().default(false),
    emailNotifications: boolean('email_notifications').notNull().default(true),
    inAppNotifications: boolean('in_app_notifications').notNull().default(true),
    unusualTimingAlerts: boolean('unusual_timing_alerts').notNull().default(true),
    locationChangeAlerts: boolean('location_change_alerts').notNull().default(true),

    // UI preferences
    theme: text('theme').notNull().default('light').$type<'light' | 'dark' | 'system'>(),
    language: text('language').notNull().default('en').$type<'en' | 'es' | 'pt' | 'br'>(),

    // Timestamps
    createdAt,
    updatedAt,
  },
  (table) => ({
    // 🔒 RLS: Applied via SQL migration (drizzle/migrations-manual/002_phase3_enable_rls.sql)
    // Policies: Users can only access their own preferences (matched by workos_user_id)
    userIdIndex: index('user_preferences_user_id_idx').on(table.workosUserId),
    orgIdIndex: index('user_preferences_org_id_idx').on(table.orgId),
  }),
);

// ============================================================================
// APPLICATION TABLES (With Org Scoping + RLS)
// ============================================================================

/**
 * Events Table - Bookable services offered by experts
 *
 * Now org-scoped: Each event belongs to an organization.
 */
export const EventsTable = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // TODO: Make notNull() after Clerk → WorkOS migration complete (Phase 5)
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    workosUserId: text('workos_user_id').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    durationInMinutes: integer('duration_in_minutes').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    order: integer('order').notNull().default(0),
    price: integer('price').notNull().default(0),
    currency: text('currency').notNull().default('eur'),
    stripeProductId: text('stripe_product_id'),
    stripePriceId: text('stripe_price_id'),
    createdAt,
    updatedAt,
  },
  (table) => ({
    // 🔒 RLS: Applied via SQL migration
    orgIdIndex: index('events_org_id_idx').on(table.orgId),
    workosUserIdIndex: index('events_workos_user_id_idx').on(table.workosUserId),
    slugIndex: index('events_slug_idx').on(table.slug),
  }),
);

/**
 * Schedules Table - Expert availability
 */
export const SchedulesTable = pgTable(
  'schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // TODO: Make notNull() after Clerk → WorkOS migration complete (Phase 5)
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    workosUserId: text('workos_user_id').notNull().unique(),
    timezone: text('timezone').notNull(),
    createdAt,
    updatedAt,
  },
  (table) => ({
    // 🔒 RLS: Applied via SQL migration
    orgIdIndex: index('schedules_org_id_idx').on(table.orgId),
    userIdIndex: index('schedules_user_id_idx').on(table.workosUserId),
  }),
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
  (table) => ({
    scheduleIdIndex: index('schedule_availabilities_schedule_id_idx').on(table.scheduleId),
  }),
);

/**
 * Meetings Table - Booked appointments
 */
export const MeetingsTable = pgTable(
  'meetings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // TODO: Make notNull() after Clerk → WorkOS migration complete (Phase 5)
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    eventId: uuid('event_id')
      .notNull()
      .references(() => EventsTable.id, { onDelete: 'cascade' }),

    // Expert (meeting host)
    workosUserId: text('workos_user_id').notNull(),

    // Guest (patient/customer) - WorkOS Integration
    guestWorkosUserId: text('guest_workos_user_id'), // New: Guest's WorkOS ID (nullable for legacy meetings)
    guestOrgId: uuid('guest_org_id'), // New: Guest's organization ID (nullable for legacy meetings)

    // Guest legacy fields (kept for backward compatibility during migration)
    guestEmail: text('guest_email').notNull(),
    guestName: text('guest_name').notNull(),
    guestNotes: text('guest_notes'),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    timezone: text('timezone').notNull(),
    meetingUrl: text('meeting_url'),

    // Stripe payment processing
    stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
    stripeSessionId: text('stripe_session_id').unique(),
    stripePaymentStatus: text('stripe_payment_status', {
      enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded'],
    }).default('pending'),
    stripeAmount: integer('stripe_amount'),
    stripeApplicationFeeAmount: integer('stripe_application_fee_amount'),

    // Stripe Connect transfers (links to PaymentTransfersTable for payout tracking)
    stripeTransferId: text('stripe_transfer_id').unique(),
    stripeTransferAmount: integer('stripe_transfer_amount'),
    stripeTransferStatus: text('stripe_transfer_status', {
      enum: ['pending', 'processing', 'succeeded', 'failed'],
    }).default('pending'),
    stripeTransferScheduledAt: timestamp('stripe_transfer_scheduled_at'),

    createdAt,
    updatedAt,
  },
  (table) => ({
    // 🔒 RLS: Applied via SQL migration
    orgIdIndex: index('meetings_org_id_idx').on(table.orgId),
    userIdIndex: index('meetings_user_id_idx').on(table.workosUserId),
    eventIdIndex: index('meetings_event_id_idx').on(table.eventId),
    paymentIntentIdIndex: index('meetings_payment_intent_id_idx').on(table.stripePaymentIntentId),
    transferIdIndex: index('meetings_transfer_id_idx').on(table.stripeTransferId),
  }),
);

/**
 * Categories Table
 */
export const CategoriesTable = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  image: text('image'),
  parentId: uuid('parent_id'),
  createdAt,
  updatedAt,
});

/**
 * Profiles Table - Public expert profiles
 */
export const ProfilesTable = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // TODO: Make notNull() after Clerk → WorkOS migration complete (Phase 5)
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
    practitionerAgreementAcceptedAt: timestamp('practitioner_agreement_accepted_at'),
    practitionerAgreementVersion: text('practitioner_agreement_version'),
    practitionerAgreementIpAddress: text('practitioner_agreement_ip_address'),
    practitionerAgreementMetadata: jsonb('practitioner_agreement_metadata'), // Stores comprehensive geolocation, user-agent, etc.

    order: integer('order').notNull().default(0),
    createdAt,
    updatedAt,
  },
  (table) => ({
    // 🔒 RLS: Applied via SQL migration (public read, owner write)
    orgIdIndex: index('profiles_org_id_idx').on(table.orgId),
    workosUserIdIndex: index('profiles_workos_user_id_idx').on(table.workosUserId),
  }),
);

/**
 * Records Table - Encrypted meeting notes (PHI)
 */
export const RecordsTable = pgTable(
  'records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // TODO: Make notNull() after Clerk → WorkOS migration complete (Phase 5)
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => MeetingsTable.id, { onDelete: 'cascade' }),
    expertId: text('expert_id').notNull(), // workosUserId
    guestEmail: text('guest_email').notNull(),
    encryptedContent: text('encrypted_content').notNull(),
    encryptedMetadata: text('encrypted_metadata'),
    lastModifiedAt: timestamp('last_modified_at').notNull().defaultNow(),
    version: integer('version').default(1).notNull(),
    createdAt,
  },
  (table) => ({
    // 🔒 RLS: Applied via SQL migration (PHI protection)
    orgIdIndex: index('records_org_id_idx').on(table.orgId),
    meetingIdIndex: index('records_meeting_id_idx').on(table.meetingId),
    expertIdIndex: index('records_expert_id_idx').on(table.expertId),
  }),
);

/**
 * Payment Transfers Table
 */
export const paymentTransferStatusEnum = pgEnum(
  'payment_transfer_status_enum',
  PAYMENT_TRANSFER_STATUSES,
);

export const PaymentTransfersTable = pgTable(
  'payment_transfers',
  {
    id: serial('id').primaryKey(),
    // TODO: Make notNull() after Clerk → WorkOS migration complete (Phase 5)
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    paymentIntentId: text('payment_intent_id').notNull(),
    checkoutSessionId: text('checkout_session_id').notNull(),
    eventId: text('event_id').notNull(),
    expertConnectAccountId: text('expert_connect_account_id').notNull(),
    // TODO: Rename to workosUserId after Clerk → WorkOS migration complete (Phase 5)
    expertClerkUserId: text('expert_clerk_user_id').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('eur'),
    platformFee: integer('platform_fee').notNull(),
    sessionStartTime: timestamp('session_start_time').notNull(),
    scheduledTransferTime: timestamp('scheduled_transfer_time').notNull(),
    status: paymentTransferStatusEnum('status').notNull().default(PAYMENT_TRANSFER_STATUS_PENDING),
    transferId: text('transfer_id'),
    payoutId: text('payout_id'),
    stripeErrorCode: text('stripe_error_code'),
    stripeErrorMessage: text('stripe_error_message'),
    retryCount: integer('retry_count').default(0),
    requiresApproval: boolean('requires_approval').default(false),
    adminUserId: text('admin_user_id'),
    adminNotes: text('admin_notes'),
    notifiedAt: timestamp('notified_at'),
    created: timestamp('created').notNull().defaultNow(),
    updated: timestamp('updated').notNull().defaultNow(),
  },
  (table) => ({
    orgIdIndex: index('payment_transfers_org_id_idx').on(table.orgId),
    expertIdIndex: index('payment_transfers_expert_id_idx').on(table.expertConnectAccountId),
  }),
);

/**
 * Scheduling Settings Table
 */
export const SchedulingSettingsTable = pgTable(
  'scheduling_settings',
  {
    id: serial('id').primaryKey(),
    // TODO: Make notNull() after Clerk → WorkOS migration complete (Phase 5)
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    workosUserId: text('workos_user_id').notNull(),
    beforeEventBuffer: integer('before_event_buffer').notNull().default(0),
    afterEventBuffer: integer('after_event_buffer').notNull().default(0),
    minimumNotice: integer('minimum_notice').notNull().default(0),
    timeSlotInterval: integer('time_slot_interval').notNull().default(15),
    bookingWindowDays: integer('booking_window_days').notNull().default(60),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    // 🔒 RLS: Applied via SQL migration
    userIdIndex: index('scheduling_settings_user_id_idx').on(table.workosUserId),
  }),
);

/**
 * Blocked Dates Table - Dates when experts are unavailable
 */
export const BlockedDatesTable = pgTable(
  'blocked_dates',
  {
    id: serial('id').primaryKey(),
    // TODO: Make notNull() after Clerk → WorkOS migration complete (Phase 5)
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    workosUserId: text('workos_user_id').notNull(),
    date: date('date').notNull(),
    timezone: text('timezone').notNull().default('UTC'),
    reason: text('reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // 🔒 RLS: Applied via SQL migration
    orgIdIndex: index('blocked_dates_org_id_idx').on(table.orgId),
    userIdIndex: index('blocked_dates_user_id_idx').on(table.workosUserId),
    dateIndex: index('blocked_dates_date_idx').on(table.date),
  }),
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
    // TODO: Make notNull() after Clerk → WorkOS migration complete (Phase 5)
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    eventId: uuid('event_id')
      .notNull()
      .references(() => EventsTable.id, { onDelete: 'cascade' }),
    workosUserId: text('workos_user_id').notNull(),
    guestEmail: text('guest_email').notNull(),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
    stripeSessionId: text('stripe_session_id').unique(),
    // Reminder tracking fields to prevent duplicate reminder emails
    gentleReminderSentAt: timestamp('gentle_reminder_sent_at'),
    urgentReminderSentAt: timestamp('urgent_reminder_sent_at'),
    createdAt,
    updatedAt,
  },
  (table) => ({
    // 🔒 RLS: Applied via SQL migration
    orgIdIndex: index('slot_reservations_org_id_idx').on(table.orgId),
    eventIdIndex: index('slot_reservations_event_id_idx').on(table.eventId),
    userIdIndex: index('slot_reservations_user_id_idx').on(table.workosUserId),
    expiresAtIndex: index('slot_reservations_expires_at_idx').on(table.expiresAt),
    paymentIntentIdIndex: index('slot_reservations_payment_intent_id_idx').on(
      table.stripePaymentIntentId,
    ),
  }),
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
  | 'GDPR_DATA_DELETION';

export type AuditResourceType =
  | 'medical_record'
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
  | 'compliance';

/**
 * Audit Logs Table
 *
 * Stores all PHI access and application events for HIPAA compliance.
 * Uses RLS to ensure org-scoped access.
 */
export const AuditLogsTable = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id').notNull(),
    // TODO (Phase 5): Make orgId .notNull() after migration complete
    orgId: uuid('org_id'), // Temporarily nullable during migration
    action: text('action').notNull().$type<AuditEventAction>(),
    resourceType: text('resource_type').notNull().$type<AuditResourceType>(),
    resourceId: text('resource_id'),
    oldValues: jsonb('old_values').$type<Record<string, unknown>>(),
    newValues: jsonb('new_values').$type<Record<string, unknown>>(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // 🔒 RLS: Applied via SQL migration (append-only, org-scoped)
    orgIdIndex: index('audit_logs_org_id_idx').on(table.orgId),
    userIdIndex: index('audit_logs_user_id_idx').on(table.workosUserId),
    createdAtIndex: index('audit_logs_created_at_idx').on(table.createdAt),
    actionIndex: index('audit_logs_action_idx').on(table.action),
    resourceTypeIndex: index('audit_logs_resource_type_idx').on(table.resourceType),
    orgCreatedIndex: index('audit_logs_org_created_idx').on(table.orgId, table.createdAt),
  }),
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
