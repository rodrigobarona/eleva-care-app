CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerkUserId" text NOT NULL,
	"action" varchar(50) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar(255),
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "events";--> statement-breakpoint
DROP TABLE "scheduleAvailabilities";--> statement-breakpoint
DROP TABLE "schedules";--> statement-breakpoint
DROP TYPE "public"."day";