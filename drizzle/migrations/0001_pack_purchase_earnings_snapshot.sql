ALTER TABLE "pack_purchases"
ADD COLUMN "expert_clerk_user_id" text;
--> statement-breakpoint
ALTER TABLE "pack_purchases"
ADD COLUMN "pack_name_snapshot" text;
--> statement-breakpoint
ALTER TABLE "pack_purchases"
ADD COLUMN "event_name_snapshot" text;
--> statement-breakpoint
ALTER TABLE "pack_purchases"
ADD COLUMN "currency" text;
--> statement-breakpoint
ALTER TABLE "pack_purchases"
ADD COLUMN "gross_amount" integer;
--> statement-breakpoint
ALTER TABLE "pack_purchases"
ADD COLUMN "platform_fee_amount" integer;
--> statement-breakpoint
ALTER TABLE "pack_purchases"
ADD COLUMN "net_amount" integer;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pack_purchases_expert_clerk_user_id_idx"
ON "pack_purchases" USING btree ("expert_clerk_user_id");
