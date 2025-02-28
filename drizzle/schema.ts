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
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Common timestamp fields used across multiple tables
 * - createdAt: Automatically set to current time when record is created
 * - updatedAt: Automatically set to current time when record is created and updated
 */
const createdAt = timestamp('createdAt').notNull().defaultNow();
const updatedAt = timestamp('updatedAt')
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

/**
 * Events table - defines bookable events/services offered by experts
 *
 * Each event represents a type of service that experts can offer and users can book.
 * Contains information about duration, pricing, and Stripe integration.
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
 * Schedules table - defines the availability timezones for experts
 *
 * Each expert has a single schedule that contains their timezone
 * and is linked to specific day/time availabilities.
 */
export const ScheduleTable = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  timezone: text('timezone').notNull(),
  clerkUserId: text('clerkUserId').notNull().unique(),
  createdAt,
  updatedAt,
});

/**
 * Relationship definition for ScheduleTable
 *
 * Establishes a one-to-many relationship with ScheduleAvailabilityTable.
 * Each schedule can have multiple availability time slots.
 */
export const scheduleRelations = relations(ScheduleTable, ({ many }) => ({
  availabilities: many(ScheduleAvailabilityTable),
}));

/**
 * Enum defining days of the week for availability scheduling
 */
export const scheduleDayOfWeekEnum = pgEnum('day', DAYS_OF_WEEK_IN_ORDER);

/**
 * Schedule Availability table - defines specific time slots when experts are available
 *
 * Each record represents a recurring availability window on a specific day of the week.
 * Combined with the user's schedule, this determines when meetings can be booked.
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

/**
 * Relationship definition for ScheduleAvailabilityTable
 *
 * Establishes a many-to-one relationship with ScheduleTable.
 * Each availability slot belongs to a specific schedule.
 */
export const ScheduleAvailabilityRelations = relations(ScheduleAvailabilityTable, ({ one }) => ({
  schedule: one(ScheduleTable, {
    fields: [ScheduleAvailabilityTable.scheduleId],
    references: [ScheduleTable.id],
  }),
}));

/**
 * Meetings table - core entity representing booked appointments between experts and guests
 *
 * Each meeting record contains all details about a scheduled appointment, including:
 * - Expert and guest information
 * - Start and end times
 * - Meeting URL for virtual meetings
 * - Extensive Stripe payment processing fields
 *
 * This table is central to the application's functionality, connecting experts, guests,
 * and handling the financial transactions for paid meetings.
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
    // Stripe payment processing fields
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
    // Stripe Connect fields for payouts to experts
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

/**
 * Relationship definition for MeetingTable
 *
 * Establishes a many-to-one relationship with EventTable.
 * Each meeting is based on a specific event type.
 */
export const meetingRelations = relations(MeetingTable, ({ one }) => ({
  event: one(EventTable, {
    fields: [MeetingTable.eventId],
    references: [EventTable.id],
  }),
}));

/**
 * Profiles table - contains public-facing information about users
 *
 * Stores professional profile information for experts, including:
 * - Personal details (name, bio, headline)
 * - Social media links
 * - Verification status
 *
 * This data is used to build expert profile pages and listings.
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

/**
 * Relationship definition for ProfileTable
 *
 * Establishes relationships with:
 * - MeetingTable: A profile can be associated with multiple meetings
 * - EventTable: A profile can offer multiple event types
 * - UserTable: Each profile belongs to a single user
 */
export const profileRelations = relations(ProfileTable, ({ many, one }) => ({
  meetings: many(MeetingTable),
  events: many(EventTable),
  user: one(UserTable, {
    fields: [ProfileTable.clerkUserId],
    references: [UserTable.clerkUserId],
  }),
}));

/**
 * Enum defining possible subscription statuses for user subscriptions
 */
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
 * Users table - core entity representing users in the system
 *
 * Stores authentication and account information, including:
 * - Clerk authentication details
 * - Stripe customer information and subscription status
 * - Stripe Connect details for experts who receive payments
 * - User roles and basic profile information
 *
 * This table is the central hub connecting a user to their roles, profile,
 * events, and meetings.
 */
export const UserTable = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: text('clerkUserId').notNull().unique(),
    // Stripe customer fields for subscription management
    stripeCustomerId: text('stripeCustomerId').unique(),
    subscriptionId: text('subscriptionId'),
    subscriptionStatus: subscriptionStatusEnum('subscriptionStatus'),
    subscriptionPriceId: text('subscriptionPriceId'),
    subscriptionCurrentPeriodEnd: timestamp('subscriptionCurrentPeriodEnd'),
    subscriptionCanceledAt: timestamp('subscriptionCanceledAt'),
    hasHadSubscription: boolean('hasHadSubscription').default(false),
    // Basic user information
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    imageUrl: text('image_url'),
    // Stripe Connect fields for experts receiving payments
    stripeConnectAccountId: text('stripe_connect_account_id'),
    stripeConnectDetailsSubmitted: boolean('stripe_connect_details_submitted').default(false),
    stripeConnectChargesEnabled: boolean('stripe_connect_charges_enabled').default(false),
    stripeConnectPayoutsEnabled: boolean('stripe_connect_payouts_enabled').default(false),
    stripeConnectOnboardingComplete: boolean('stripe_connect_onboarding_complete').default(false),
    stripeBankAccountLast4: text('stripe_bank_account_last4'),
    stripeBankName: text('stripe_bank_name'),
    // Identity verification fields
    stripeIdentityVerificationId: text('stripe_identity_verification_id'),
    stripeIdentityVerified: boolean('stripe_identity_verified').default(false),
    stripeIdentityVerificationStatus: text('stripe_identity_verification_status'),
    stripeIdentityVerificationLastChecked: timestamp('stripe_identity_verification_last_checked'),
    country: text('country').default('PT'),
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

/**
 * Relationship definition for UserTable
 *
 * Establishes relationships with:
 * - EventTable: A user can create multiple events
 * - MeetingTable: A user can participate in multiple meetings
 * - ProfileTable: Each user has one profile
 */
export const userRelations = relations(UserTable, ({ many, one }) => ({
  events: many(EventTable),
  meetings: many(MeetingTable),
  profile: one(ProfileTable),
}));

/**
 * Relationship definition for EventTable
 *
 * Establishes a many-to-one relationship with UserTable.
 * Each event is created by a specific user.
 */
export const eventRelations = relations(EventTable, ({ one }) => ({
  user: one(UserTable, {
    fields: [EventTable.clerkUserId],
    references: [UserTable.clerkUserId],
  }),
}));

/**
 * Records table - stores encrypted meeting records and notes
 *
 * Used to securely store sensitive information from meetings, such as:
 * - Encrypted content (meeting notes, diagnoses, recommendations)
 * - Encrypted metadata about the records
 * - Version tracking for change history
 *
 * Each record is associated with a specific meeting and expert.
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

/**
 * Relationship definition for RecordTable
 *
 * Establishes relationships with:
 * - MeetingTable: Each record belongs to a specific meeting
 * - UserTable: Each record is created by a specific expert
 */
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
