import { DAYS_OF_WEEK_IN_ORDER } from '@/app/data/constants';
import type { SocialMediaPlatform } from '@/lib/constants/social-media';
import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = timestamp('createdAt').notNull().defaultNow();
const updatedAt = timestamp('updatedAt')
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

// Define the role enum with all user role types
export const userRoleEnum = pgEnum('user_role', [
  'superadmin',
  'admin',
  'top_expert',
  'community_expert',
  'user',
]);

/**
 * User Roles Table
 *
 * Stores role assignments for users in a many-to-many relationship.
 * Each user can have multiple roles, and roles can be assigned to multiple users.
 *
 * @property {uuid} id - Unique identifier for the role assignment
 * @property {string} clerkUserId - External user ID from Clerk authentication
 * @property {string} role - Role from userRoleEnum assigned to the user
 * @property {string} assignedBy - ClerkUserId of the user who assigned this role
 */
export const UserRoleTable = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: text('clerk_user_id').notNull(),
    role: userRoleEnum('role').notNull(),
    assignedBy: text('assigned_by').notNull(), // ClerkUserId of the assigning user
    createdAt,
    updatedAt,
  },
  (table) => ({
    clerkUserIdIndex: index('user_roles_clerk_user_id_idx').on(table.clerkUserId),
    userRoleIndex: uniqueIndex('user_roles_unique_idx').on(table.clerkUserId, table.role),
  }),
);

/**
 * Permissions Table
 *
 * Defines system permissions that can be assigned to roles.
 * Used for fine-grained access control beyond basic role-based authorization.
 *
 * @property {uuid} id - Unique identifier for the permission
 * @property {string} name - Unique name of the permission
 * @property {string} description - Optional description of what the permission allows
 */
export const PermissionTable = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    description: text('description'),
    createdAt,
    updatedAt,
  },
  (table) => ({
    nameIndex: index('permissions_name_idx').on(table.name),
  }),
);

/**
 * Role Permissions Table
 *
 * Maps permissions to roles in a many-to-many relationship.
 * Defines which permissions are granted to which roles.
 *
 * @property {uuid} id - Unique identifier for the role-permission relationship
 * @property {string} role - Role from userRoleEnum that is granted the permission
 * @property {uuid} permissionId - Reference to the granted permission
 */
export const RolePermissionTable = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    role: userRoleEnum('role').notNull(),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => PermissionTable.id, { onDelete: 'cascade' }),
    createdAt,
    updatedAt,
  },
  (table) => ({
    rolePermissionIndex: uniqueIndex('role_permission_unique_idx').on(
      table.role,
      table.permissionId,
    ),
  }),
);

// Define relationships for user roles
export const userRoleRelations = relations(UserRoleTable, ({ one }) => ({
  user: one(UserTable, {
    fields: [UserRoleTable.clerkUserId],
    references: [UserTable.clerkUserId],
  }),
}));

// Define relationships for permissions
export const permissionRelations = relations(PermissionTable, ({ many }) => ({
  rolePermissions: many(RolePermissionTable),
}));

// Define relationships for role permissions
export const rolePermissionRelations = relations(RolePermissionTable, ({ one }) => ({
  permission: one(PermissionTable, {
    fields: [RolePermissionTable.permissionId],
    references: [PermissionTable.id],
  }),
}));

/**
 * Events Table
 *
 * Stores bookable event types that experts create.
 * Examples include "Initial Consultation", "Coaching Session", etc.
 *
 * @property {uuid} id - Unique identifier for the event
 * @property {string} name - Display name of the event
 * @property {string} slug - URL-friendly identifier for the event
 * @property {string} description - Detailed description of what the event includes
 * @property {number} durationInMinutes - Length of the event in minutes
 * @property {string} clerkUserId - ID of the user (expert) who created this event
 * @property {boolean} isActive - Whether the event is currently bookable
 * @property {number} order - Display order for sorting events
 * @property {number} price - Price in cents/smallest currency unit
 * @property {string} currency - Three-letter currency code (e.g., "usd", "eur")
 * @property {string} stripeProductId - Associated Stripe product ID
 * @property {string} stripePriceId - Associated Stripe price ID
 */
export const EventTable = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    durationInMinutes: integer('durationInMinutes').notNull(),
    clerkUserId: text('clerkUserId').notNull(),
    isActive: boolean('isActive').notNull().default(true),
    order: integer('order').notNull().default(0),
    price: integer('price').notNull().default(0),
    currency: text('currency').notNull().default('eur'),
    stripeProductId: text('stripeProductId'),
    stripePriceId: text('stripePriceId'),
    createdAt,
    updatedAt,
  },
  (table) => ({
    clerkUserIdIndex: index('events_clerk_user_id_idx').on(table.clerkUserId),
  }),
);

/**
 * Schedules Table
 *
 * Stores users' availability schedules.
 * Each user has one schedule with their timezone and availability settings.
 *
 * @property {uuid} id - Unique identifier for the schedule
 * @property {string} timezone - User's preferred timezone (e.g., "Europe/Lisbon")
 * @property {string} clerkUserId - ID of the user this schedule belongs to
 */
export const ScheduleTable = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  timezone: text('timezone').notNull(),
  clerkUserId: text('clerkUserId').notNull().unique(),
  createdAt,
  updatedAt,
});

export const scheduleRelations = relations(ScheduleTable, ({ many }) => ({
  availabilities: many(ScheduleAvailabilityTable),
}));

export const scheduleDayOfWeekEnum = pgEnum('day', DAYS_OF_WEEK_IN_ORDER);

/**
 * Schedule Availability Table
 *
 * Stores specific time slots when a user is available for bookings.
 * Each record represents availability on a specific day of the week.
 *
 * @property {uuid} id - Unique identifier for the availability slot
 * @property {uuid} scheduleId - Reference to the parent schedule
 * @property {string} startTime - Start time in 24-hour format (e.g., "09:00")
 * @property {string} endTime - End time in 24-hour format (e.g., "17:00")
 * @property {string} dayOfWeek - Day of week from scheduleDayOfWeekEnum
 */
export const ScheduleAvailabilityTable = pgTable(
  'scheduleAvailabilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scheduleId: uuid('scheduleId')
      .notNull()
      .references(() => ScheduleTable.id, { onDelete: 'cascade' }),
    startTime: text('startTime').notNull(),
    endTime: text('endTime').notNull(),
    dayOfWeek: scheduleDayOfWeekEnum('dayOfWeek').notNull(),
  },
  (table) => ({
    scheduleIdIndex: index('scheduleIdIndex').on(table.scheduleId),
  }),
);

export const ScheduleAvailabilityRelations = relations(ScheduleAvailabilityTable, ({ one }) => ({
  schedule: one(ScheduleTable, {
    fields: [ScheduleAvailabilityTable.scheduleId],
    references: [ScheduleTable.id],
  }),
}));

/**
 * Meetings Table
 *
 * Stores scheduled meetings between experts and guests.
 * Includes all appointment details and payment information.
 *
 * @property {uuid} id - Unique identifier for the meeting
 * @property {uuid} eventId - Reference to the event type booked
 * @property {string} clerkUserId - ID of the expert being booked
 * @property {string} guestEmail - Email of the guest who booked
 * @property {string} guestName - Name of the guest who booked
 * @property {string} guestNotes - Optional notes provided by the guest
 * @property {Date} startTime - Scheduled start time of the meeting
 * @property {Date} endTime - Scheduled end time of the meeting
 * @property {string} timezone - Timezone the meeting was booked in
 * @property {string} meetingUrl - URL for the virtual meeting (if applicable)
 * @property {string} stripePaymentIntentId - Stripe payment intent ID
 * @property {string} stripeSessionId - Stripe checkout session ID
 * @property {string} stripePaymentStatus - Payment processing status
 * @property {number} stripeAmount - Payment amount in smallest currency unit
 * @property {number} stripeApplicationFeeAmount - Platform fee amount
 * @property {string} stripeApplicationFeeId - ID of the platform fee
 * @property {string} stripeRefundId - ID of any refund processed
 * @property {object} stripeMetadata - Additional Stripe metadata
 * @property {string} stripeTransferId - ID of transfer to expert's account
 * @property {number} stripeTransferAmount - Amount transferred to expert
 * @property {string} stripeTransferStatus - Status of the transfer
 * @property {Date} stripeTransferScheduledAt - When transfer was scheduled
 * @property {string} stripePayoutId - ID of payout to expert's bank account
 * @property {number} stripePayoutAmount - Amount of the payout
 * @property {string} stripePayoutFailureCode - Error code if payout failed
 * @property {string} stripePayoutFailureMessage - Error message if payout failed
 * @property {Date} stripePayoutPaidAt - When payout was completed
 * @property {Date} lastProcessedAt - Last webhook processing timestamp
 */
export const MeetingTable = pgTable(
  'meetings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('eventId')
      .notNull()
      .references(() => EventTable.id, { onDelete: 'cascade' }),
    clerkUserId: text('clerkUserId').notNull(),
    guestEmail: text('guestEmail').notNull(),
    guestName: text('guestName').notNull(),
    guestNotes: text('guestNotes'),
    startTime: timestamp('startTime').notNull(),
    endTime: timestamp('endTime').notNull(),
    timezone: text('timezone').notNull(),
    meetingUrl: text('meetingUrl'),
    stripePaymentIntentId: text('stripePaymentIntentId').unique(),
    stripeSessionId: text('stripeSessionId').unique(),
    stripePaymentStatus: text('stripePaymentStatus', {
      enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded'],
    }).default('pending'),
    stripeAmount: integer('stripeAmount'),
    stripeApplicationFeeAmount: integer('stripeApplicationFeeAmount'),
    stripeApplicationFeeId: text('stripeApplicationFeeId').unique(),
    stripeRefundId: text('stripeRefundId').unique(),
    stripeMetadata: json('stripeMetadata'),
    stripeTransferId: text('stripeTransferId').unique(),
    stripeTransferAmount: integer('stripeTransferAmount'),
    stripeTransferStatus: text('stripeTransferStatus', {
      enum: ['pending', 'processing', 'succeeded', 'failed'],
    }).default('pending'),
    stripeTransferScheduledAt: timestamp('stripeTransferScheduledAt'),
    stripePayoutId: text('stripe_payout_id').unique(),
    stripePayoutAmount: integer('stripe_payout_amount'),
    stripePayoutFailureCode: text('stripe_payout_failure_code'),
    stripePayoutFailureMessage: text('stripe_payout_failure_message'),
    stripePayoutPaidAt: timestamp('stripe_payout_paid_at'),
    lastProcessedAt: timestamp('lastProcessedAt'),
    createdAt,
    updatedAt,
  },
  (table) => ({
    clerkUserIdIndex: index('meetings_clerkUserId_idx').on(table.clerkUserId),
    eventIdIndex: index('meetings_eventId_idx').on(table.eventId),
    paymentIntentIdIndex: index('meetings_paymentIntentId_idx').on(table.stripePaymentIntentId),
    sessionIdIndex: index('meetings_sessionId_idx').on(table.stripeSessionId),
    transferIdIndex: index('meetings_transferId_idx').on(table.stripeTransferId),
    payoutIdIndex: index('meetings_payoutId_idx').on(table.stripePayoutId),
  }),
);

export const meetingRelations = relations(MeetingTable, ({ one }) => ({
  event: one(EventTable, {
    fields: [MeetingTable.eventId],
    references: [EventTable.id],
  }),
}));

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'trialing',
  'unpaid',
]);

/**
 * Users Table
 *
 * Core user database with authentication and payment information.
 * Linked to Clerk for authentication and Stripe for payments.
 *
 * @property {uuid} id - Internal unique identifier
 * @property {string} clerkUserId - External ID from Clerk authentication
 * @property {string} username - Unique username for profile URLs
 * @property {string} email - User's email address
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} imageUrl - Profile picture URL
 * @property {string} primaryRole - Main user role from userRoleEnum
 * @property {string} stripeCustomerId - Stripe customer ID for payments
 * @property {string} subscriptionId - Active subscription ID
 * @property {string} subscriptionStatus - Current subscription status
 * @property {string} subscriptionPriceId - Price ID of current subscription
 * @property {Date} subscriptionCurrentPeriodEnd - When current billing period ends
 * @property {Date} subscriptionCanceledAt - When subscription was canceled
 * @property {boolean} hasHadSubscription - Whether user has ever subscribed
 * @property {string} stripeConnectAccountId - Stripe Connect account for receiving payments
 * @property {boolean} stripeConnectDetailsSubmitted - Whether Connect onboarding was started
 * @property {boolean} stripeConnectChargesEnabled - Whether account can receive charges
 * @property {boolean} stripeConnectPayoutsEnabled - Whether account can receive payouts
 * @property {boolean} stripeConnectOnboardingComplete - Whether onboarding is complete
 * @property {string} stripeBankAccountLast4 - Last 4 digits of connected bank account
 * @property {string} stripeBankName - Name of the connected bank
 * @property {string} stripeIdentityVerificationId - ID of Stripe identity verification
 * @property {boolean} stripeIdentityVerified - Whether identity is verified
 * @property {string} stripeIdentityVerificationStatus - Status of verification
 * @property {Date} stripeIdentityVerificationLastChecked - When verification was last checked
 * @property {string} country - User's country code (ISO)
 * @property {string} expertOnboardingStatus - Status of expert onboarding
 */
export const UserTable = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: text('clerkUserId').notNull().unique(),
    username: text('username').unique(),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    imageUrl: text('image_url'),
    primaryRole: userRoleEnum('primary_role').default('user').notNull(),

    // Payment/subscription fields
    stripeCustomerId: text('stripeCustomerId').unique(),
    subscriptionId: text('subscriptionId'),
    subscriptionStatus: subscriptionStatusEnum('subscriptionStatus'),
    subscriptionPriceId: text('subscriptionPriceId'),
    subscriptionCurrentPeriodEnd: timestamp('subscriptionCurrentPeriodEnd'),
    subscriptionCanceledAt: timestamp('subscriptionCanceledAt'),
    hasHadSubscription: boolean('hasHadSubscription').default(false),

    // Stripe Connect fields
    stripeConnectAccountId: text('stripe_connect_account_id'),
    stripeConnectDetailsSubmitted: boolean('stripe_connect_details_submitted').default(false),
    stripeConnectChargesEnabled: boolean('stripe_connect_charges_enabled').default(false),
    stripeConnectPayoutsEnabled: boolean('stripe_connect_payouts_enabled').default(false),
    stripeConnectOnboardingComplete: boolean('stripe_connect_onboarding_complete').default(false),
    stripeBankAccountLast4: text('stripe_bank_account_last4'),
    stripeBankName: text('stripe_bank_name'),

    // Identity verification
    stripeIdentityVerificationId: text('stripe_identity_verification_id'),
    stripeIdentityVerified: boolean('stripe_identity_verified').default(false),
    stripeIdentityVerificationStatus: text('stripe_identity_verification_status'),
    stripeIdentityVerificationLastChecked: timestamp('stripe_identity_verification_last_checked'),

    country: text('country').default('PT'),
    expertOnboardingStatus: text('expert_onboarding_status'),
    createdAt,
    updatedAt,
  },
  (table) => ({
    clerkUserIdIndex: index('users_clerk_user_id_idx').on(table.clerkUserId),
    stripeCustomerIdIndex: index('users_stripe_customer_id_idx').on(table.stripeCustomerId),
    stripeIdentityVerificationIdIndex: index('users_stripe_identity_verification_id_idx').on(
      table.stripeIdentityVerificationId,
    ),
  }),
);

export const userRelations = relations(UserTable, ({ many }) => ({
  events: many(EventTable),
  meetings: many(MeetingTable),
  roles: many(UserRoleTable),
}));

export const eventRelations = relations(EventTable, ({ one }) => ({
  user: one(UserTable, {
    fields: [EventTable.clerkUserId],
    references: [UserTable.clerkUserId],
  }),
}));

/**
 * Records Table
 *
 * Stores encrypted client records/notes for meetings.
 * Used by experts to keep confidential information about clients.
 *
 * @property {uuid} id - Unique identifier for the record
 * @property {uuid} meetingId - Reference to the associated meeting
 * @property {string} expertId - ID of the expert who created the record
 * @property {string} guestEmail - Email of the guest the record is about
 * @property {string} encryptedContent - Encrypted content of the record
 * @property {string} encryptedMetadata - Encrypted metadata about the record
 * @property {Date} lastModifiedAt - When the record was last updated
 * @property {Date} createdAt - When the record was created
 * @property {number} version - Record version for tracking changes
 */
export const RecordTable = pgTable('records', {
  id: uuid('id').defaultRandom().primaryKey(),
  meetingId: uuid('meeting_id')
    .notNull()
    .references(() => MeetingTable.id, { onDelete: 'cascade' }),
  expertId: text('expert_id')
    .notNull()
    .references(() => UserTable.clerkUserId),
  guestEmail: text('guest_email').notNull(),
  encryptedContent: text('encrypted_content').notNull(),
  encryptedMetadata: text('encrypted_metadata'),
  lastModifiedAt: timestamp('last_modified_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
});

export const recordsRelations = relations(RecordTable, ({ one }) => ({
  meeting: one(MeetingTable, {
    fields: [RecordTable.meetingId],
    references: [MeetingTable.id],
  }),
  expert: one(UserTable, {
    fields: [RecordTable.expertId],
    references: [UserTable.clerkUserId],
  }),
}));

/**
 * Profiles Table
 *
 * Extended user profile information, especially for experts.
 * Contains public-facing details about users shown on profile pages.
 *
 * @property {uuid} id - Unique identifier for the profile
 * @property {string} clerkUserId - ID of the user this profile belongs to
 * @property {string} profilePicture - URL to profile picture
 * @property {string} firstName - User's first name for display
 * @property {string} lastName - User's last name for display
 * @property {string} headline - Short professional headline/title
 * @property {string} shortBio - Brief bio for display in cards
 * @property {string} longBio - Detailed bio for profile page
 * @property {boolean} isExpert - Whether user is an expert
 * @property {string} expertBio - Expert-specific biography
 * @property {string[]} expertSpecialties - List of specialties/focus areas
 * @property {string[]} expertQualifications - List of qualifications
 * @property {boolean} isExpertProfilePublished - Whether profile is public
 * @property {object[]} socialLinks - Array of social media links
 * @property {boolean} isVerified - Whether profile is verified
 * @property {boolean} isTopExpert - Whether user is a featured expert
 * @property {number} order - Display order for featured experts
 */
export const ProfileTable = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: text('clerkUserId').notNull().unique(),
    profilePicture: text('profilePicture'),
    firstName: text('firstName').notNull(),
    lastName: text('lastName').notNull(),
    headline: text('headline'),
    shortBio: text('shortBio'),
    longBio: text('longBio'),

    // Expert-specific fields
    isExpert: boolean('isExpert').default(false).notNull(),
    expertBio: text('expertBio'),
    expertSpecialties: json('expertSpecialties').$type<string[]>(),
    expertQualifications: json('expertQualifications').$type<string[]>(),
    isExpertProfilePublished: boolean('isExpertProfilePublished').default(false),

    // Other profile fields
    socialLinks: json('socialLinks').$type<
      Array<{
        name: SocialMediaPlatform;
        url: string;
      }>
    >(),
    isVerified: boolean('isVerified').notNull().default(false),
    isTopExpert: boolean('isTopExpert').notNull().default(false),
    order: integer('order').notNull().default(0),

    createdAt,
    updatedAt,
  },
  (table) => ({
    clerkUserIdIndex: index('profiles_clerk_user_id_idx').on(table.clerkUserId),
  }),
);

export const profileRelations = relations(ProfileTable, ({ many, one }) => ({
  meetings: many(MeetingTable),
  events: many(EventTable),
  user: one(UserTable, {
    fields: [ProfileTable.clerkUserId],
    references: [UserTable.clerkUserId],
  }),
}));
