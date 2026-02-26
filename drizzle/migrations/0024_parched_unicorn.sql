ALTER TABLE "audit_logs" ALTER COLUMN "retain_until" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "data_subject_requests" ALTER COLUMN "response_deadline" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
CREATE INDEX "organizations_stripe_customer_id_idx" ON "organizations" USING btree ("stripe_customer_id");