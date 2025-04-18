CREATE TYPE "public"."day" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid');--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerkUserId" text NOT NULL,
	"profilePicture" text,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"headline" text,
	"shortBio" text,
	"longBio" text,
	"socialLinks" json,
	"isVerified" boolean DEFAULT false NOT NULL,
	"isTopExpert" boolean DEFAULT false NOT NULL,
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
	"role" text DEFAULT 'user' NOT NULL,
	"stripe_connect_account_id" text,
	"stripe_connect_details_submitted" boolean DEFAULT false,
	"stripe_connect_charges_enabled" boolean DEFAULT false,
	"stripe_connect_payouts_enabled" boolean DEFAULT false,
	"stripe_connect_onboarding_complete" boolean DEFAULT false,
	"stripe_bank_account_last4" text,
	"stripe_bank_name" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerkUserId_unique" UNIQUE("clerkUserId"),
	CONSTRAINT "users_stripeCustomerId_unique" UNIQUE("stripeCustomerId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_eventId_events_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
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
CREATE INDEX IF NOT EXISTS "events_clerk_user_id_idx" ON "events" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_clerkUserId_idx" ON "meetings" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_eventId_idx" ON "meetings" USING btree ("eventId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_paymentIntentId_idx" ON "meetings" USING btree ("stripePaymentIntentId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_sessionId_idx" ON "meetings" USING btree ("stripeSessionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_transferId_idx" ON "meetings" USING btree ("stripeTransferId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_payoutId_idx" ON "meetings" USING btree ("stripe_payout_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_clerk_user_id_idx" ON "profiles" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduleIdIndex" ON "scheduleAvailabilities" USING btree ("scheduleId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_clerk_user_id_idx" ON "users" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_stripe_customer_id_idx" ON "users" USING btree ("stripeCustomerId");