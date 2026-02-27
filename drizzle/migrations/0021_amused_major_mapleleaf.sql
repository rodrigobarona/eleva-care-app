ALTER TABLE "annual_plan_eligibility" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blocked_dates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "destination_calendars" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expert_applications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expert_setup" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "meetings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_transfers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "schedule_availabilities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "scheduling_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "slot_reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscription_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscription_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transaction_commissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_org_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "Users can view own eligibility" ON "annual_plan_eligibility" AS PERMISSIVE FOR SELECT TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Users can create own eligibility" ON "annual_plan_eligibility" AS PERMISSIVE FOR INSERT TO public WITH CHECK (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Users can update own eligibility" ON "annual_plan_eligibility" AS PERMISSIVE FOR UPDATE TO public USING (workos_user_id = auth.user_id()) WITH CHECK (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Org members can view org eligibility" ON "annual_plan_eligibility" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = annual_plan_eligibility.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);--> statement-breakpoint
CREATE POLICY "audit_logs_read" ON "audit_logs" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = audit_logs.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);--> statement-breakpoint
CREATE POLICY "audit_logs_insert" ON "audit_logs" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.user_id() IS NOT NULL);--> statement-breakpoint
CREATE POLICY "Users can view own blocked dates" ON "blocked_dates" AS PERMISSIVE FOR SELECT TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Users can create own blocked dates" ON "blocked_dates" AS PERMISSIVE FOR INSERT TO public WITH CHECK (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Users can update own blocked dates" ON "blocked_dates" AS PERMISSIVE FOR UPDATE TO public USING (workos_user_id = auth.user_id()) WITH CHECK (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Users can delete own blocked dates" ON "blocked_dates" AS PERMISSIVE FOR DELETE TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Org members can view org blocked dates" ON "blocked_dates" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = blocked_dates.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);--> statement-breakpoint
CREATE POLICY "categories_read" ON "categories" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "categories_modify" ON "categories" AS PERMISSIVE FOR ALL TO public USING (auth.user_id() IS NOT NULL);--> statement-breakpoint
CREATE POLICY "destination_calendars_all" ON "destination_calendars" AS PERMISSIVE FOR ALL TO public USING (user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "events_read" ON "events" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = events.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);--> statement-breakpoint
CREATE POLICY "events_modify" ON "events" AS PERMISSIVE FOR ALL TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Users can view own application" ON "expert_applications" AS PERMISSIVE FOR SELECT TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Users can create own application" ON "expert_applications" AS PERMISSIVE FOR INSERT TO public WITH CHECK (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Users can update own application" ON "expert_applications" AS PERMISSIVE FOR UPDATE TO public USING (
        workos_user_id = auth.user_id()
        AND status IN ('pending', 'rejected')
      ) WITH CHECK (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Admins can view all applications" ON "expert_applications" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.workos_user_id = auth.user_id()
    AND users.role = 'admin'
  )
);--> statement-breakpoint
CREATE POLICY "Admins can update applications" ON "expert_applications" AS PERMISSIVE FOR UPDATE TO public USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.workos_user_id = auth.user_id()
    AND users.role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.workos_user_id = auth.user_id()
    AND users.role = 'admin'
  )
);--> statement-breakpoint
CREATE POLICY "Users can view own expert setup" ON "expert_setup" AS PERMISSIVE FOR SELECT TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Users can create own expert setup" ON "expert_setup" AS PERMISSIVE FOR INSERT TO public WITH CHECK (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Users can update own expert setup" ON "expert_setup" AS PERMISSIVE FOR UPDATE TO public USING (workos_user_id = auth.user_id()) WITH CHECK (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Users can delete own expert setup" ON "expert_setup" AS PERMISSIVE FOR DELETE TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "meetings_read" ON "meetings" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = meetings.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);--> statement-breakpoint
CREATE POLICY "meetings_modify" ON "meetings" AS PERMISSIVE FOR ALL TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "organizations_read" ON "organizations" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = organizations.id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);--> statement-breakpoint
CREATE POLICY "organizations_update" ON "organizations" AS PERMISSIVE FOR UPDATE TO public USING (
        EXISTS (
          SELECT 1 FROM user_org_memberships
          WHERE user_org_memberships.org_id = organizations.id
          AND user_org_memberships.workos_user_id = auth.user_id()
          AND user_org_memberships.role IN ('owner', 'admin')
        )
      );--> statement-breakpoint
CREATE POLICY "payment_transfers_read" ON "payment_transfers" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = payment_transfers.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);--> statement-breakpoint
CREATE POLICY "payment_transfers_modify" ON "payment_transfers" AS PERMISSIVE FOR ALL TO public USING (expert_workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "profiles_read" ON "profiles" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "profiles_modify" ON "profiles" AS PERMISSIVE FOR ALL TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "records_read" ON "records" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = records.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);--> statement-breakpoint
CREATE POLICY "records_modify" ON "records" AS PERMISSIVE FOR ALL TO public USING (expert_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Users can view own roles" ON "roles" AS PERMISSIVE FOR SELECT TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Admins can view all roles" ON "roles" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.workos_user_id = auth.user_id()
    AND users.role = 'admin'
  )
);--> statement-breakpoint
CREATE POLICY "Admins can insert roles" ON "roles" AS PERMISSIVE FOR INSERT TO public WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.workos_user_id = auth.user_id()
    AND users.role = 'admin'
  )
);--> statement-breakpoint
CREATE POLICY "Admins can update roles" ON "roles" AS PERMISSIVE FOR UPDATE TO public USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.workos_user_id = auth.user_id()
    AND users.role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.workos_user_id = auth.user_id()
    AND users.role = 'admin'
  )
);--> statement-breakpoint
CREATE POLICY "Admins can delete roles" ON "roles" AS PERMISSIVE FOR DELETE TO public USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.workos_user_id = auth.user_id()
    AND users.role = 'admin'
  )
);--> statement-breakpoint
CREATE POLICY "schedule_availabilities_all" ON "schedule_availabilities" AS PERMISSIVE FOR ALL TO public USING (
        EXISTS (
          SELECT 1 FROM schedules
          WHERE schedules.id = schedule_availabilities.schedule_id
          AND schedules.workos_user_id = auth.user_id()
        )
      );--> statement-breakpoint
CREATE POLICY "schedules_read" ON "schedules" AS PERMISSIVE FOR SELECT TO public USING (
        EXISTS (
          SELECT 1 FROM user_org_memberships
          WHERE user_org_memberships.org_id = schedules.org_id
          AND user_org_memberships.workos_user_id = auth.user_id()
        )
      );--> statement-breakpoint
CREATE POLICY "schedules_modify" ON "schedules" AS PERMISSIVE FOR ALL TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "scheduling_settings_all" ON "scheduling_settings" AS PERMISSIVE FOR ALL TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Users can view own reservations" ON "slot_reservations" AS PERMISSIVE FOR SELECT TO public USING (
        guest_email = (
          SELECT email FROM users WHERE workos_user_id = auth.user_id()
        )
      );--> statement-breakpoint
CREATE POLICY "Experts can view event reservations" ON "slot_reservations" AS PERMISSIVE FOR SELECT TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Experts can create event reservations" ON "slot_reservations" AS PERMISSIVE FOR INSERT TO public WITH CHECK (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Experts can update event reservations" ON "slot_reservations" AS PERMISSIVE FOR UPDATE TO public USING (workos_user_id = auth.user_id()) WITH CHECK (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Experts can delete event reservations" ON "slot_reservations" AS PERMISSIVE FOR DELETE TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "Org members can view org reservations" ON "slot_reservations" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = slot_reservations.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);--> statement-breakpoint
CREATE POLICY "Users can view org subscription events" ON "subscription_events" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = subscription_events.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);--> statement-breakpoint
CREATE POLICY "System can insert subscription events" ON "subscription_events" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.user_id() IS NOT NULL);--> statement-breakpoint
CREATE POLICY "Admins can view all subscription events" ON "subscription_events" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.workos_user_id = auth.user_id()
    AND users.role = 'admin'
  )
);--> statement-breakpoint
CREATE POLICY "Org members can view org subscription" ON "subscription_plans" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = subscription_plans.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);--> statement-breakpoint
CREATE POLICY "Billing admin can update subscription" ON "subscription_plans" AS PERMISSIVE FOR UPDATE TO public USING (
        billing_admin_user_id = auth.user_id()
        OR EXISTS (
          SELECT 1 FROM user_org_memberships
          WHERE user_org_memberships.org_id = subscription_plans.org_id
          AND user_org_memberships.workos_user_id = auth.user_id()
          AND user_org_memberships.role IN ('owner', 'admin')
          AND user_org_memberships.status = 'active'
        )
      ) WITH CHECK (
        billing_admin_user_id = auth.user_id()
        OR EXISTS (
          SELECT 1 FROM user_org_memberships
          WHERE user_org_memberships.org_id = subscription_plans.org_id
          AND user_org_memberships.workos_user_id = auth.user_id()
          AND user_org_memberships.role IN ('owner', 'admin')
          AND user_org_memberships.status = 'active'
        )
      );--> statement-breakpoint
CREATE POLICY "Org owners can insert subscription" ON "subscription_plans" AS PERMISSIVE FOR INSERT TO public WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_org_memberships
          WHERE user_org_memberships.org_id = subscription_plans.org_id
          AND user_org_memberships.workos_user_id = auth.user_id()
          AND user_org_memberships.role IN ('owner', 'admin')
          AND user_org_memberships.status = 'active'
        )
      );--> statement-breakpoint
CREATE POLICY "Org owners can delete subscription" ON "subscription_plans" AS PERMISSIVE FOR DELETE TO public USING (
        EXISTS (
          SELECT 1 FROM user_org_memberships
          WHERE user_org_memberships.org_id = subscription_plans.org_id
          AND user_org_memberships.workos_user_id = auth.user_id()
          AND user_org_memberships.role = 'owner'
          AND user_org_memberships.status = 'active'
        )
      );--> statement-breakpoint
CREATE POLICY "Admins can view all subscriptions" ON "subscription_plans" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.workos_user_id = auth.user_id()
    AND users.role = 'admin'
  )
);--> statement-breakpoint
CREATE POLICY "Users can view org commissions" ON "transaction_commissions" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = transaction_commissions.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);--> statement-breakpoint
CREATE POLICY "System can insert commissions" ON "transaction_commissions" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.user_id() IS NOT NULL);--> statement-breakpoint
CREATE POLICY "System can update commissions" ON "transaction_commissions" AS PERMISSIVE FOR UPDATE TO public USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = transaction_commissions.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = transaction_commissions.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);--> statement-breakpoint
CREATE POLICY "Admins can view all commissions" ON "transaction_commissions" AS PERMISSIVE FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.workos_user_id = auth.user_id()
    AND users.role = 'admin'
  )
);--> statement-breakpoint
CREATE POLICY "memberships_read" ON "user_org_memberships" AS PERMISSIVE FOR SELECT TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "users_read" ON "users" AS PERMISSIVE FOR SELECT TO public USING (workos_user_id = auth.user_id());--> statement-breakpoint
CREATE POLICY "users_update" ON "users" AS PERMISSIVE FOR UPDATE TO public USING (workos_user_id = auth.user_id());