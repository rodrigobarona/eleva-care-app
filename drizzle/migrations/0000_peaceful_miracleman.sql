CREATE TYPE "public"."payment_transfer_status_enum" AS ENUM('PENDING', 'APPROVED', 'READY', 'COMPLETED', 'FAILED', 'REFUNDED', 'DISPUTED');--> statement-breakpoint
CREATE TYPE "public"."day" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blocked_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"date" date NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image" text,
	"parentId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"durationInMinutes" integer NOT NULL,
	"clerkUserId" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'eur' NOT NULL,
	"stripeProductId" text,
	"stripePriceId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eventId" uuid NOT NULL,
	"clerkUserId" text NOT NULL,
	"guestEmail" text NOT NULL,
	"guestName" text NOT NULL,
	"guestNotes" text,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"timezone" text NOT NULL,
	"meetingUrl" text,
	"stripePaymentIntentId" text,
	"stripeSessionId" text,
	"stripePaymentStatus" text DEFAULT 'pending',
	"stripeAmount" integer,
	"stripeApplicationFeeAmount" integer,
	"stripeApplicationFeeId" text,
	"stripeRefundId" text,
	"stripeMetadata" json,
	"stripeTransferId" text,
	"stripeTransferAmount" integer,
	"stripeTransferStatus" text DEFAULT 'pending',
	"stripeTransferScheduledAt" timestamp,
	"stripe_payout_id" text,
	"stripe_payout_amount" integer,
	"stripe_payout_failure_code" text,
	"stripe_payout_failure_message" text,
	"stripe_payout_paid_at" timestamp,
	"lastProcessedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meetings_stripePaymentIntentId_unique" UNIQUE("stripePaymentIntentId"),
	CONSTRAINT "meetings_stripeSessionId_unique" UNIQUE("stripeSessionId"),
	CONSTRAINT "meetings_stripeApplicationFeeId_unique" UNIQUE("stripeApplicationFeeId"),
	CONSTRAINT "meetings_stripeRefundId_unique" UNIQUE("stripeRefundId"),
	CONSTRAINT "meetings_stripeTransferId_unique" UNIQUE("stripeTransferId"),
	CONSTRAINT "meetings_stripe_payout_id_unique" UNIQUE("stripe_payout_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"action_url" text,
	"read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_intent_id" text NOT NULL,
	"checkout_session_id" text NOT NULL,
	"event_id" text NOT NULL,
	"expert_connect_account_id" text NOT NULL,
	"expert_clerk_user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'eur' NOT NULL,
	"platform_fee" integer NOT NULL,
	"session_start_time" timestamp NOT NULL,
	"scheduled_transfer_time" timestamp NOT NULL,
	"status" "payment_transfer_status_enum" DEFAULT 'PENDING' NOT NULL,
	"transfer_id" text,
	"stripe_error_code" text,
	"stripe_error_message" text,
	"retry_count" integer DEFAULT 0,
	"requires_approval" boolean DEFAULT false,
	"admin_user_id" text,
	"admin_notes" text,
	"notified_at" timestamp,
	"created" timestamp DEFAULT now() NOT NULL,
	"updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerkUserId" text NOT NULL,
	"profilePicture" text,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"headline" text,
	"shortBio" text,
	"longBio" text,
	"primaryCategoryId" uuid,
	"secondaryCategoryId" uuid,
	"socialLinks" json,
	"isVerified" boolean DEFAULT false NOT NULL,
	"isTopExpert" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_clerkUserId_unique" UNIQUE("clerkUserId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"expert_id" text NOT NULL,
	"guest_email" text NOT NULL,
	"encrypted_content" text NOT NULL,
	"encrypted_metadata" text,
	"last_modified_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduleAvailabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheduleId" uuid NOT NULL,
	"startTime" text NOT NULL,
	"endTime" text NOT NULL,
	"dayOfWeek" "day" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timezone" text NOT NULL,
	"clerkUserId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "schedules_clerkUserId_unique" UNIQUE("clerkUserId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "slotReservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eventId" uuid NOT NULL,
	"clerkUserId" text NOT NULL,
	"guestEmail" text NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"stripePaymentIntentId" text,
	"stripeSessionId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "slotReservations_stripePaymentIntentId_unique" UNIQUE("stripePaymentIntentId"),
	CONSTRAINT "slotReservations_stripeSessionId_unique" UNIQUE("stripeSessionId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerkUserId" text NOT NULL,
	"stripeCustomerId" text,
	"subscriptionId" text,
	"subscriptionStatus" "subscription_status",
	"subscriptionPriceId" text,
	"subscriptionCurrentPeriodEnd" timestamp,
	"subscriptionCanceledAt" timestamp,
	"hasHadSubscription" boolean DEFAULT false,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"image_url" text,
	"stripe_connect_account_id" text,
	"stripe_connect_details_submitted" boolean DEFAULT false,
	"stripe_connect_charges_enabled" boolean DEFAULT false,
	"stripe_connect_payouts_enabled" boolean DEFAULT false,
	"stripe_connect_onboarding_complete" boolean DEFAULT false,
	"stripe_bank_account_last4" text,
	"stripe_bank_name" text,
	"stripe_identity_verification_id" text,
	"stripe_identity_verified" boolean DEFAULT false,
	"stripe_identity_verification_status" text,
	"stripe_identity_verification_last_checked" timestamp,
	"country" text DEFAULT 'PT',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerkUserId_unique" UNIQUE("clerkUserId"),
	CONSTRAINT "users_stripeCustomerId_unique" UNIQUE("stripeCustomerId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduling_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"before_event_buffer" integer DEFAULT 0 NOT NULL,
	"after_event_buffer" integer DEFAULT 0 NOT NULL,
	"minimum_notice" integer DEFAULT 0 NOT NULL,
	"time_slot_interval" integer DEFAULT 15 NOT NULL,
	"booking_window_days" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_eventId_events_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_primaryCategoryId_categories_id_fk" FOREIGN KEY ("primaryCategoryId") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_secondaryCategoryId_categories_id_fk" FOREIGN KEY ("secondaryCategoryId") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "records" ADD CONSTRAINT "records_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "records" ADD CONSTRAINT "records_expert_id_users_clerkUserId_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."users"("clerkUserId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduleAvailabilities" ADD CONSTRAINT "scheduleAvailabilities_scheduleId_schedules_id_fk" FOREIGN KEY ("scheduleId") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slotReservations" ADD CONSTRAINT "slotReservations_eventId_events_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_clerk_user_id_idx" ON "events" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_clerkUserId_idx" ON "meetings" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_eventId_idx" ON "meetings" USING btree ("eventId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_paymentIntentId_idx" ON "meetings" USING btree ("stripePaymentIntentId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_sessionId_idx" ON "meetings" USING btree ("stripeSessionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_transferId_idx" ON "meetings" USING btree ("stripeTransferId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_payoutId_idx" ON "meetings" USING btree ("stripe_payout_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_clerkUserId_idx" ON "profiles" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduleIdIndex" ON "scheduleAvailabilities" USING btree ("scheduleId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slotReservations_clerkUserId_idx" ON "slotReservations" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slotReservations_eventId_idx" ON "slotReservations" USING btree ("eventId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slotReservations_expiresAt_idx" ON "slotReservations" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slotReservations_paymentIntentId_idx" ON "slotReservations" USING btree ("stripePaymentIntentId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slotReservations_sessionId_idx" ON "slotReservations" USING btree ("stripeSessionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_clerk_user_id_idx" ON "users" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_stripe_customer_id_idx" ON "users" USING btree ("stripeCustomerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_stripe_identity_verification_id_idx" ON "users" USING btree ("stripe_identity_verification_id");