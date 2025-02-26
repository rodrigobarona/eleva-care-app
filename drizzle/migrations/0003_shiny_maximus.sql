ALTER TABLE "users" ALTER COLUMN "country" SET DEFAULT 'PT';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_identity_verification_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_identity_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_identity_verification_status" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_identity_verification_last_checked" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_stripe_identity_verification_id_idx" ON "users" USING btree ("stripe_identity_verification_id");