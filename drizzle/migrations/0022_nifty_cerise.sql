ALTER TABLE "annual_plan_eligibility" ALTER COLUMN "eligible_since" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "annual_plan_eligibility" ALTER COLUMN "last_calculated" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "annual_plan_eligibility" ALTER COLUMN "last_calculated" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "annual_plan_eligibility" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "annual_plan_eligibility" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "annual_plan_eligibility" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "annual_plan_eligibility" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "blocked_dates" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "blocked_dates" DROP CONSTRAINT "blocked_dates_pkey";--> statement-breakpoint
ALTER TABLE "blocked_dates" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "blocked_dates" RENAME COLUMN "new_id" TO "id";--> statement-breakpoint
ALTER TABLE "blocked_dates" ADD PRIMARY KEY ("id");--> statement-breakpoint
DROP SEQUENCE IF EXISTS "blocked_dates_id_seq";--> statement-breakpoint
ALTER TABLE "blocked_dates" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "blocked_dates" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "blocked_dates" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "blocked_dates" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "expert_applications" ALTER COLUMN "reviewed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expert_applications" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expert_applications" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "expert_applications" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expert_applications" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "expert_setup" ALTER COLUMN "setup_completed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expert_setup" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expert_setup" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "expert_setup" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expert_setup" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "start_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "end_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "stripe_transfer_scheduled_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "payment_transfers" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_transfers" DROP CONSTRAINT "payment_transfers_pkey";--> statement-breakpoint
ALTER TABLE "payment_transfers" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "payment_transfers" RENAME COLUMN "new_id" TO "id";--> statement-breakpoint
ALTER TABLE "payment_transfers" ADD PRIMARY KEY ("id");--> statement-breakpoint
DROP SEQUENCE IF EXISTS "payment_transfers_id_seq";--> statement-breakpoint
ALTER TABLE "payment_transfers" ALTER COLUMN "session_start_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_transfers" ALTER COLUMN "scheduled_transfer_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_transfers" ALTER COLUMN "notified_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_transfers" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_transfers" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "payment_transfers" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_transfers" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "practitioner_agreement_accepted_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "records" ALTER COLUMN "last_modified_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "records" ALTER COLUMN "last_modified_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "records" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "records" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "scheduling_settings" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduling_settings" DROP CONSTRAINT "scheduling_settings_pkey";--> statement-breakpoint
ALTER TABLE "scheduling_settings" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "scheduling_settings" RENAME COLUMN "new_id" TO "id";--> statement-breakpoint
ALTER TABLE "scheduling_settings" ADD PRIMARY KEY ("id");--> statement-breakpoint
DROP SEQUENCE IF EXISTS "scheduling_settings_id_seq";--> statement-breakpoint
ALTER TABLE "scheduling_settings" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "scheduling_settings" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "scheduling_settings" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduling_settings" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "scheduling_settings" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "scheduling_settings" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "slot_reservations" ALTER COLUMN "start_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "slot_reservations" ALTER COLUMN "end_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "slot_reservations" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "slot_reservations" ALTER COLUMN "gentle_reminder_sent_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "slot_reservations" ALTER COLUMN "urgent_reminder_sent_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "slot_reservations" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "slot_reservations" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "slot_reservations" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "slot_reservations" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "subscription_events" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_events" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "subscription_start_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "subscription_end_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "upgraded_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "eligibility_last_checked" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "transaction_commissions" ALTER COLUMN "processed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transaction_commissions" ALTER COLUMN "refunded_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transaction_commissions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transaction_commissions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "transaction_commissions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transaction_commissions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_org_memberships" ALTER COLUMN "joined_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_org_memberships" ALTER COLUMN "joined_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_org_memberships" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_org_memberships" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_org_memberships" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_org_memberships" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "stripe_identity_verification_last_checked" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "welcome_email_sent_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "onboarding_completed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "google_token_expiry" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "google_calendar_connected_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER POLICY "categories_read" ON "categories" TO anonymous USING (true);--> statement-breakpoint
ALTER POLICY "categories_modify" ON "categories" TO authenticated USING (auth.user_id() IS NOT NULL);--> statement-breakpoint
ALTER POLICY "profiles_read" ON "profiles" TO anonymous USING (true);--> statement-breakpoint
ALTER POLICY "profiles_modify" ON "profiles" TO authenticated USING (workos_user_id = auth.user_id());