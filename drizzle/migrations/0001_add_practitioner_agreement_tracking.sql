-- Add practitioner agreement tracking fields to profiles table for legal compliance
-- These fields track when and which version of the practitioner agreement was accepted
-- Required for GDPR Article 7, LGPD Article 8, and SOC 2 audit compliance

ALTER TABLE "profiles" ADD COLUMN "practitioner_agreement_accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "practitioner_agreement_version" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "practitioner_agreement_ip_address" text;--> statement-breakpoint

-- Add comment explaining the purpose of these fields
COMMENT ON COLUMN "profiles"."practitioner_agreement_accepted_at" IS 'Timestamp when practitioner accepted the agreement - required for legal audit trail';--> statement-breakpoint
COMMENT ON COLUMN "profiles"."practitioner_agreement_version" IS 'Version of practitioner agreement that was accepted (e.g., "1.0", "2024-10-01")';--> statement-breakpoint
COMMENT ON COLUMN "profiles"."practitioner_agreement_ip_address" IS 'IP address from which agreement was accepted - optional fraud prevention measure';

