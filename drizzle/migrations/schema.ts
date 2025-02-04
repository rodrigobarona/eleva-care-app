import { pgTable, unique, uuid, text, timestamp, index, foreignKey, json, boolean, varchar, integer, check, jsonb, pgEnum } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const day = pgEnum("day", ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
export const stripeTransferStatus = pgEnum("stripe_transfer_status", ['pending', 'processing', 'succeeded', 'failed'])
export const subscriptionStatus = pgEnum("subscription_status", ['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid'])



export const schedules = pgTable("schedules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	timezone: text().notNull(),
	clerkUserId: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		schedulesClerkUserIdUnique: unique("schedules_clerkUserId_unique").on(table.clerkUserId),
	}
});

export const scheduleAvailabilities = pgTable("scheduleAvailabilities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	scheduleId: uuid().notNull(),
	startTime: text().notNull(),
	endTime: text().notNull(),
	dayOfWeek: day().notNull(),
},
(table) => {
	return {
		scheduleIdIndex: index("scheduleIdIndex").using("btree", table.scheduleId.asc().nullsLast()),
		scheduleAvailabilitiesScheduleIdSchedulesIdFk: foreignKey({
			columns: [table.scheduleId],
			foreignColumns: [schedules.id],
			name: "scheduleAvailabilities_scheduleId_schedules_id_fk"
		}).onDelete("cascade"),
	}
});

export const profiles = pgTable("profiles", {
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
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	lastName: text(),
},
(table) => {
	return {
		clerkUserIdIdx: index("profiles_clerk_user_id_idx").using("btree", table.clerkUserId.asc().nullsLast()),
		profilesClerkUserIdUnique: unique("profiles_clerkUserId_unique").on(table.clerkUserId),
	}
});

export const events = pgTable("events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar().default('{}').notNull(),
	description: text(),
	durationInMinutes: integer().notNull(),
	clerkUserId: text().notNull(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	slug: text().notNull(),
	order: integer().default(0).notNull(),
	price: integer().default(0).notNull(),
	currency: text().default('eur').notNull(),
	stripeProductId: text(),
	stripePriceId: text(),
},
(table) => {
	return {
		clerkUserIdIndex: index("clerkUserIdIndex").using("btree", table.clerkUserId.asc().nullsLast()),
		clerkUserIdIdx: index("events_clerk_user_id_idx").using("btree", table.clerkUserId.asc().nullsLast()),
	}
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkUserId: text().notNull(),
	stripeCustomerId: text(),
	subscriptionId: text(),
	subscriptionStatus: text(),
	subscriptionPriceId: text(),
	subscriptionCurrentPeriodEnd: timestamp({ mode: 'string' }),
	subscriptionCanceledAt: timestamp({ mode: 'string' }),
	hasHadSubscription: boolean().default(false),
	email: text().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	imageUrl: text("image_url"),
	role: text().default('user').notNull(),
	stripeConnectAccountId: text("stripe_connect_account_id"),
	stripeConnectOnboardingComplete: boolean("stripe_connect_onboarding_complete").default(false).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		clerkUserIdIdx: index("users_clerk_user_id_idx").using("btree", table.clerkUserId.asc().nullsLast()),
		stripeCustomerIdIdx: index("users_stripe_customer_id_idx").using("btree", table.stripeCustomerId.asc().nullsLast()),
		usersClerkUserIdKey: unique("users_clerkUserId_key").on(table.clerkUserId),
		usersStripeCustomerIdKey: unique("users_stripeCustomerId_key").on(table.stripeCustomerId),
		usersStripeConnectAccountIdKey: unique("users_stripe_connect_account_id_key").on(table.stripeConnectAccountId),
		usersSubscriptionStatusCheck: check("users_subscriptionStatus_check", sql`"subscriptionStatus" = ANY (ARRAY['active'::text, 'canceled'::text, 'incomplete'::text, 'incomplete_expired'::text, 'past_due'::text, 'trialing'::text, 'unpaid'::text])`),
		usersRoleCheck: check("users_role_check", sql`role = ANY (ARRAY['user'::text, 'expert'::text, 'admin'::text])`),
	}
});

export const meetings = pgTable("meetings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventId: uuid().notNull(),
	clerkUserId: text().notNull(),
	guestEmail: text().notNull(),
	guestName: text().notNull(),
	guestNotes: text(),
	startTime: timestamp({ mode: 'string' }).notNull(),
	endTime: timestamp({ mode: 'string' }).notNull(),
	timezone: text().notNull(),
	meetingUrl: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	paymentError: text("payment_error"),
	stripePaymentIntentId: text(),
	stripePaymentStatus: text().default('pending').notNull(),
	stripeAmount: integer().default(0).notNull(),
	stripeApplicationFeeAmount: integer(),
	stripeApplicationFeeId: text(),
	stripeRefundId: text(),
	stripeMetadata: jsonb(),
	lastProcessedAt: timestamp({ mode: 'string' }),
	stripeSessionId: text(),
	stripeTransferId: text(),
	stripeTransferAmount: integer(),
	stripeTransferStatus: stripeTransferStatus().default('pending'),
	stripeTransferScheduledAt: timestamp({ mode: 'string' }),
},
(table) => {
	return {
		clerkUserIdIdx: index("meetings_clerkUserId_idx").using("btree", table.clerkUserId.asc().nullsLast()),
		eventIdIdx: index("meetings_eventId_idx").using("btree", table.eventId.asc().nullsLast()),
		paymentIntentIdIdx: index("meetings_paymentIntentId_idx").using("btree", table.stripePaymentIntentId.asc().nullsLast()),
		sessionIdIdx: index("meetings_sessionId_idx").using("btree", table.stripeSessionId.asc().nullsLast()),
		transferIdIdx: index("meetings_transferId_idx").using("btree", table.stripeTransferId.asc().nullsLast()),
		meetingsEventIdEventsIdFk: foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "meetings_eventId_events_id_fk"
		}),
		meetingsStripePaymentIntentIdKey: unique("meetings_stripePaymentIntentId_key").on(table.stripePaymentIntentId),
		meetingsStripeApplicationFeeIdKey: unique("meetings_stripeApplicationFeeId_key").on(table.stripeApplicationFeeId),
		meetingsStripeRefundIdKey: unique("meetings_stripeRefundId_key").on(table.stripeRefundId),
		meetingsStripeSessionIdUnique: unique("meetings_stripeSessionId_unique").on(table.stripeSessionId),
		meetingsStripeTransferIdUnique: unique("meetings_stripeTransferId_unique").on(table.stripeTransferId),
		meetingsStripePaymentStatusCheck: check("meetings_stripePaymentStatus_check", sql`"stripePaymentStatus" = ANY (ARRAY['pending'::text, 'processing'::text, 'succeeded'::text, 'failed'::text, 'refunded'::text])`),
	}
});
