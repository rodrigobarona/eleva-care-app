ALTER TABLE "meetings" ADD COLUMN "stripe_payout_id" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "calendar_creation_claimed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_payout_id_idx" ON "meetings" USING btree ("stripe_payout_id");