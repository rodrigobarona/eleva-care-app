ALTER TABLE "profiles" ADD COLUMN "practitioner_agreement_accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "practitioner_agreement_version" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "practitioner_agreement_ip_address" text;