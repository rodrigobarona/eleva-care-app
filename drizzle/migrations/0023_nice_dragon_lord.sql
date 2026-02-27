CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"org_id" uuid NOT NULL,
	"consent_type" text NOT NULL,
	"version" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "data_subject_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"org_id" uuid NOT NULL,
	"request_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"response_deadline" timestamp with time zone DEFAULT now() + interval '30 days' NOT NULL,
	"admin_user_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "data_subject_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "slot_reservations" DROP CONSTRAINT "slot_reservations_active_slot_unique";--> statement-breakpoint
ALTER TABLE "subscription_events" DROP CONSTRAINT "subscription_events_subscription_plan_id_subscription_plans_id_fk";
--> statement-breakpoint
ALTER TABLE "subscription_plans" DROP CONSTRAINT "subscription_plans_billing_admin_user_id_users_workos_user_id_fk";
--> statement-breakpoint
ALTER TABLE "transaction_commissions" DROP CONSTRAINT "transaction_commissions_stripe_payment_intent_id_meetings_stripe_payment_intent_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "outcome" text DEFAULT 'success' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "phi_accessed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "severity" text DEFAULT 'info' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "retain_until" timestamp with time zone DEFAULT now() + interval '7 years' NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "vault_encrypted_guest_notes" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "records" ADD COLUMN "guest_workos_user_id" text;--> statement-breakpoint
ALTER TABLE "slot_reservations" ADD COLUMN "guest_workos_user_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_records_user_id_idx" ON "consent_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consent_records_org_id_idx" ON "consent_records" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "consent_records_type_idx" ON "consent_records" USING btree ("consent_type");--> statement-breakpoint
CREATE INDEX "dsar_user_id_idx" ON "data_subject_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dsar_org_id_idx" ON "data_subject_requests" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "dsar_status_idx" ON "data_subject_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dsar_deadline_idx" ON "data_subject_requests" USING btree ("response_deadline");--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "sub_events_plan_id_fk" FOREIGN KEY ("subscription_plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "sub_plans_billing_admin_fk" FOREIGN KEY ("billing_admin_user_id") REFERENCES "public"."users"("workos_user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_commissions" ADD CONSTRAINT "tx_commissions_payment_intent_fk" FOREIGN KEY ("stripe_payment_intent_id") REFERENCES "public"."meetings"("stripe_payment_intent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "slot_reservations_active_slot_unique" ON "slot_reservations" USING btree ("event_id","start_time","guest_workos_user_id");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "vault_google_access_token";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "vault_google_refresh_token";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "google_token_encryption_method";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "google_token_expiry";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "google_scopes";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "google_calendar_connected";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "google_calendar_connected_at";--> statement-breakpoint
CREATE POLICY "consent_records_read" ON "consent_records" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "consent_records_insert" ON "consent_records" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "dsar_read_own" ON "data_subject_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "dsar_insert_own" ON "data_subject_requests" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "dsar_admin_manage" ON "data_subject_requests" AS PERMISSIVE FOR ALL TO "authenticated" USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.workos_user_id = auth.user_id()
    AND users.role = 'admin'
  )
);--> statement-breakpoint
ALTER POLICY "Users can view own reservations" ON "slot_reservations" TO public USING (guest_workos_user_id = auth.user_id());