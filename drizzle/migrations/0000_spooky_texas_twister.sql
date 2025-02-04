-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."day" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TYPE "public"."stripe_transfer_status" AS ENUM('pending', 'processing', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timezone" text NOT NULL,
	"clerkUserId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "schedules_clerkUserId_unique" UNIQUE("clerkUserId")
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
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerkUserId" text NOT NULL,
	"profilePicture" text,
	"firstName" text NOT NULL,
	"headline" text,
	"shortBio" text,
	"longBio" text,
	"socialLinks" json,
	"isVerified" boolean DEFAULT false NOT NULL,
	"isTopExpert" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastName" text,
	CONSTRAINT "profiles_clerkUserId_unique" UNIQUE("clerkUserId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar DEFAULT '{}' NOT NULL,
	"description" text,
	"durationInMinutes" integer NOT NULL,
	"clerkUserId" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"slug" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'eur' NOT NULL,
	"stripeProductId" text,
	"stripePriceId" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerkUserId" text NOT NULL,
	"stripeCustomerId" text,
	"subscriptionId" text,
	"subscriptionStatus" text,
	"subscriptionPriceId" text,
	"subscriptionCurrentPeriodEnd" timestamp,
	"subscriptionCanceledAt" timestamp,
	"hasHadSubscription" boolean DEFAULT false,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"image_url" text,
	"role" text DEFAULT 'user' NOT NULL,
	"stripe_connect_account_id" text,
	"stripe_connect_onboarding_complete" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerkUserId_key" UNIQUE("clerkUserId"),
	CONSTRAINT "users_stripeCustomerId_key" UNIQUE("stripeCustomerId"),
	CONSTRAINT "users_stripe_connect_account_id_key" UNIQUE("stripe_connect_account_id"),
	CONSTRAINT "users_subscriptionStatus_check" CHECK ("subscriptionStatus" = ANY (ARRAY['active'::text, 'canceled'::text, 'incomplete'::text, 'incomplete_expired'::text, 'past_due'::text, 'trialing'::text, 'unpaid'::text])),
	CONSTRAINT "users_role_check" CHECK (role = ANY (ARRAY['user'::text, 'expert'::text, 'admin'::text]))
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
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"payment_error" text,
	"stripePaymentIntentId" text,
	"stripePaymentStatus" text DEFAULT 'pending' NOT NULL,
	"stripeAmount" integer DEFAULT 0 NOT NULL,
	"stripeApplicationFeeAmount" integer,
	"stripeApplicationFeeId" text,
	"stripeRefundId" text,
	"stripeMetadata" jsonb,
	"lastProcessedAt" timestamp,
	"stripeSessionId" text,
	"stripeTransferId" text,
	"stripeTransferAmount" integer,
	"stripeTransferStatus" "stripe_transfer_status" DEFAULT 'pending',
	"stripeTransferScheduledAt" timestamp,
	CONSTRAINT "meetings_stripePaymentIntentId_key" UNIQUE("stripePaymentIntentId"),
	CONSTRAINT "meetings_stripeApplicationFeeId_key" UNIQUE("stripeApplicationFeeId"),
	CONSTRAINT "meetings_stripeRefundId_key" UNIQUE("stripeRefundId"),
	CONSTRAINT "meetings_stripeSessionId_unique" UNIQUE("stripeSessionId"),
	CONSTRAINT "meetings_stripeTransferId_unique" UNIQUE("stripeTransferId"),
	CONSTRAINT "meetings_stripePaymentStatus_check" CHECK ("stripePaymentStatus" = ANY (ARRAY['pending'::text, 'processing'::text, 'succeeded'::text, 'failed'::text, 'refunded'::text]))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduleAvailabilities" ADD CONSTRAINT "scheduleAvailabilities_scheduleId_schedules_id_fk" FOREIGN KEY ("scheduleId") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_eventId_events_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduleIdIndex" ON "scheduleAvailabilities" USING btree ("scheduleId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_clerk_user_id_idx" ON "profiles" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clerkUserIdIndex" ON "events" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_clerk_user_id_idx" ON "events" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_clerk_user_id_idx" ON "users" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_stripe_customer_id_idx" ON "users" USING btree ("stripeCustomerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_clerkUserId_idx" ON "meetings" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_eventId_idx" ON "meetings" USING btree ("eventId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_paymentIntentId_idx" ON "meetings" USING btree ("stripePaymentIntentId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_sessionId_idx" ON "meetings" USING btree ("stripeSessionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_transferId_idx" ON "meetings" USING btree ("stripeTransferId");
*/