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

const createdAt = timestamp('createdAt').notNull().defaultNow();
const updatedAt = timestamp('updatedAt')
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

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

export const profileRelations = relations(ProfileTable, ({ many, one }) => ({
  meetings: many(MeetingTable),
  events: many(EventTable),
  user: one(UserTable, {
    fields: [ProfileTable.clerkUserId],
    references: [UserTable.clerkUserId],
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

export const UserTable = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: text('clerkUserId').notNull().unique(),
    stripeCustomerId: text('stripeCustomerId').unique(),
    subscriptionId: text('subscriptionId'),
    subscriptionStatus: subscriptionStatusEnum('subscriptionStatus'),
    subscriptionPriceId: text('subscriptionPriceId'),
    subscriptionCurrentPeriodEnd: timestamp('subscriptionCurrentPeriodEnd'),
    subscriptionCanceledAt: timestamp('subscriptionCanceledAt'),
    hasHadSubscription: boolean('hasHadSubscription').default(false),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    imageUrl: text('image_url'),
    role: text('role', { enum: ['user', 'expert', 'admin'] })
      .default('user')
      .notNull(),
    stripeConnectAccountId: text('stripe_connect_account_id'),
    stripeConnectDetailsSubmitted: boolean('stripe_connect_details_submitted').default(false),
    stripeConnectChargesEnabled: boolean('stripe_connect_charges_enabled').default(false),
    stripeConnectPayoutsEnabled: boolean('stripe_connect_payouts_enabled').default(false),
    stripeConnectOnboardingComplete: boolean('stripe_connect_onboarding_complete').default(false),
    stripeBankAccountLast4: text('stripe_bank_account_last4'),
    stripeBankName: text('stripe_bank_name'),
    stripeIdentityVerificationId: text('stripe_identity_verification_id'),
    stripeIdentityVerified: boolean('stripe_identity_verified').default(false),
    stripeIdentityVerificationStatus: text('stripe_identity_verification_status'),
    stripeIdentityVerificationLastChecked: timestamp('stripe_identity_verification_last_checked'),
    country: text(),
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

export const userRelations = relations(UserTable, ({ many, one }) => ({
  events: many(EventTable),
  meetings: many(MeetingTable),
  profile: one(ProfileTable),
}));

export const eventRelations = relations(EventTable, ({ one }) => ({
  user: one(UserTable, {
    fields: [EventTable.clerkUserId],
    references: [UserTable.clerkUserId],
  }),
}));

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
