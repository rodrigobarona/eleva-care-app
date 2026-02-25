CREATE TABLE "destination_calendars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"calendar_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destination_calendars_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "payment_transfers" RENAME COLUMN "expert_clerk_user_id" TO "expert_workos_user_id";--> statement-breakpoint
ALTER TABLE "payment_transfers" RENAME COLUMN "created" TO "created_at";--> statement-breakpoint
ALTER TABLE "payment_transfers" RENAME COLUMN "updated" TO "updated_at";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'member';--> statement-breakpoint
ALTER TABLE "destination_calendars" ADD CONSTRAINT "destination_calendars_user_id_users_workos_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("workos_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "destination_calendars_user_id_idx" ON "destination_calendars" USING btree ("user_id");