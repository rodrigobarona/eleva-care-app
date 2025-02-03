ALTER TABLE "meetings" ADD COLUMN "stripeTransferId" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "stripeTransferAmount" integer;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "stripeTransferStatus" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "stripeTransferScheduledAt" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_transferId_idx" ON "meetings" USING btree ("stripeTransferId");--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_stripeTransferId_unique" UNIQUE("stripeTransferId");