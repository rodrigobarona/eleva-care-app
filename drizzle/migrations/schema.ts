import {
  pgTable,
  unique,
  uuid,
  text,
  timestamp,
  index,
  foreignKey,
  json,
  boolean,
  varchar,
  integer,
  check,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const dayEnum = pgEnum("day", [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "trialing",
  "unpaid",
]);

export const EventTable = pgTable(
  "events",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    description: text(),
    durationInMinutes: integer().notNull(),
    clerkUserId: text().notNull(),
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    slug: text().notNull(),
    order: integer().default(0).notNull(),
    price: integer().default(0).notNull(),
    currency: text().default("eur").notNull(),
    stripeProductId: text(),
    stripePriceId: text(),
  },
  (table) => {
    return {
      clerkUserIdIndex: index("events_clerk_user_id_idx").on(table.clerkUserId),
    };
  }
);

export const ScheduleTable = pgTable(
  "schedules",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    timezone: text().notNull(),
    clerkUserId: text().notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => {
    return {
      schedulesClerkUserIdUnique: unique("schedules_clerkUserId_unique").on(
        table.clerkUserId
      ),
    };
  }
);

export const ScheduleAvailabilityTable = pgTable(
  "scheduleAvailabilities",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    scheduleId: uuid().notNull(),
    startTime: text().notNull(),
    endTime: text().notNull(),
    dayOfWeek: dayEnum().notNull(),
  },
  (table) => {
    return {
      scheduleIdIndex: index("scheduleIdIndex").on(table.scheduleId),
      scheduleAvailabilitiesScheduleIdSchedulesIdFk: foreignKey({
        columns: [table.scheduleId],
        foreignColumns: [ScheduleTable.id],
        name: "scheduleAvailabilities_scheduleId_schedules_id_fk",
      }).onDelete("cascade"),
    };
  }
);

export const ProfileTable = pgTable(
  "profiles",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    clerkUserId: text().notNull(),
    profilePicture: text(),
    firstName: text().notNull(),
    headline: text(),
    shortBio: text(),
    longBio: text(),
    socialLinks: json(),
    isVerified: boolean().default(false).notNull(),
    isTopExpert: boolean().default(false).notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    lastName: text(),
  },
  (table) => {
    return {
      clerkUserIdIdx: index("profiles_clerk_user_id_idx").on(table.clerkUserId),
      profilesClerkUserIdUnique: unique("profiles_clerkUserId_unique").on(
        table.clerkUserId
      ),
    };
  }
);

export const MeetingTable = pgTable(
  "meetings",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    eventId: uuid().notNull(),
    clerkUserId: text().notNull(),
    guestEmail: text().notNull(),
    guestName: text().notNull(),
    guestNotes: text(),
    startTime: timestamp({ mode: "string" }).notNull(),
    endTime: timestamp({ mode: "string" }).notNull(),
    timezone: text().notNull(),
    meetingUrl: text(),
    stripePaymentIntentId: text().unique(),
    stripeSessionId: text().unique(),
    stripePaymentStatus: text().default("pending").notNull(),
    stripeAmount: integer().default(0).notNull(),
    stripeApplicationFeeAmount: integer(),
    stripeApplicationFeeId: text().unique(),
    stripeRefundId: text().unique(),
    stripeMetadata: jsonb(),
    lastProcessedAt: timestamp({ mode: "string" }),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => {
    return {
      clerkUserIdIdx: index("meetings_clerkUserId_idx").on(table.clerkUserId),
      eventIdIdx: index("meetings_eventId_idx").on(table.eventId),
      paymentIntentIdIdx: index("meetings_paymentIntentId_idx").on(
        table.stripePaymentIntentId
      ),
      sessionIdIdx: index("meetings_sessionId_idx").on(table.stripeSessionId),
      meetingsEventIdEventsIdFk: foreignKey({
        columns: [table.eventId],
        foreignColumns: [EventTable.id],
        name: "meetings_eventId_events_id_fk",
      }),
    };
  }
);

export const UserTable = pgTable(
  "users",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    clerkUserId: text().notNull(),
    stripeCustomerId: text(),
    subscriptionId: text(),
    subscriptionStatus: text(),
    subscriptionPriceId: text(),
    subscriptionCurrentPeriodEnd: timestamp({ mode: "string" }),
    subscriptionCanceledAt: timestamp({ mode: "string" }),
    hasHadSubscription: boolean().default(false),
    email: text().notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    imageUrl: text("image_url"),
    role: text().default("user").notNull(),
    stripeConnectAccountId: text("stripe_connect_account_id"),
    stripeConnectOnboardingComplete: boolean(
      "stripe_connect_onboarding_complete"
    )
      .default(false)
      .notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => {
    return {
      clerkUserIdIdx: index("users_clerk_user_id_idx").on(table.clerkUserId),
      stripeCustomerIdIdx: index("users_stripe_customer_id_idx").on(
        table.stripeCustomerId
      ),
      usersClerkUserIdKey: unique("users_clerkUserId_key").on(
        table.clerkUserId
      ),
      usersStripeCustomerIdKey: unique("users_stripeCustomerId_key").on(
        table.stripeCustomerId
      ),
      usersStripeConnectAccountIdKey: unique(
        "users_stripe_connect_account_id_key"
      ).on(table.stripeConnectAccountId),
      usersSubscriptionStatusCheck: check(
        "users_subscriptionStatus_check",
        sql`"subscriptionStatus" = ANY (ARRAY['active'::text, 'canceled'::text, 'incomplete'::text, 'incomplete_expired'::text, 'past_due'::text, 'trialing'::text, 'unpaid'::text])`
      ),
      usersRoleCheck: check(
        "users_role_check",
        sql`role = ANY (ARRAY['user'::text, 'expert'::text, 'admin'::text])`
      ),
    };
  }
);

export const TokenTable = pgTable(
  "tokens",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    clerkUserId: text().notNull(),
    accessToken: text().notNull(),
    refreshToken: text().notNull(),
    expiryDate: timestamp({ mode: "string" }),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => {
    return {
      tokensClerkUserIdFkey: foreignKey({
        columns: [table.clerkUserId],
        foreignColumns: [UserTable.clerkUserId],
        name: "tokens_clerkUserId_fkey",
      }).onDelete("cascade"),
      tokensClerkUserIdKey: unique("tokens_clerkUserId_key").on(
        table.clerkUserId
      ),
    };
  }
);
