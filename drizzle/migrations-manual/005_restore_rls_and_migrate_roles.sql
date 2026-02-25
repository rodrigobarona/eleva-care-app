/**
 * EMERGENCY: Restore RLS + Run RBAC Data Migration
 *
 * drizzle-kit push dropped all RLS policies and disabled RLS on every table.
 * This script restores everything and also runs the role rename data migration.
 *
 * Apply with:
 *   psql $DATABASE_URL -f drizzle/migrations-manual/005_restore_rls_and_migrate_roles.sql
 */

-- ============================================================================
-- PART A: DATA MIGRATION (RBAC Role Rename)
-- ============================================================================

-- Rename 'user' role to 'member' in the users table
UPDATE "users" SET "role" = 'member' WHERE "role" = 'user';

-- Migrate any remaining 'expert_lecturer' rows to 'expert_community'
UPDATE "users" SET "role" = 'expert_community' WHERE "role" = 'expert_lecturer';

-- Rename roles in the roles table (WorkOS RBAC cache)
UPDATE "roles" SET "role" = 'member' WHERE "role" = 'patient';
UPDATE "roles" SET "role" = 'team_member' WHERE "role" = 'partner_member';
UPDATE "roles" SET "role" = 'team_admin' WHERE "role" = 'partner_admin';
DELETE FROM "roles" WHERE "role" = 'expert_lecturer';

-- Rename organization types
UPDATE "organizations" SET "type" = 'member_personal' WHERE "type" = 'patient_personal';
UPDATE "organizations" SET "type" = 'team' WHERE "type" = 'clinic';

-- ============================================================================
-- PART B: RE-ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE "annual_plan_eligibility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "blocked_dates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expert_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expert_setup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meetings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule_availabilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scheduling_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "slot_reservations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transaction_commissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_org_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART C: RE-CREATE POLICIES (from 001_enable_rls.sql)
-- ============================================================================

-- ORGANIZATIONS
CREATE POLICY organizations_read ON organizations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = organizations.id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);

CREATE POLICY organizations_update ON organizations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = organizations.id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.role IN ('owner', 'admin')
  )
);

-- USERS
CREATE POLICY users_read ON users
FOR SELECT USING (workos_user_id = auth.user_id());

CREATE POLICY users_update ON users
FOR UPDATE USING (workos_user_id = auth.user_id());

-- USER-ORG MEMBERSHIPS
CREATE POLICY memberships_read ON user_org_memberships
FOR SELECT USING (workos_user_id = auth.user_id());

-- EVENTS
CREATE POLICY events_read ON events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = events.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);

CREATE POLICY events_modify ON events
FOR ALL USING (workos_user_id = auth.user_id());

-- SCHEDULES
CREATE POLICY schedules_read ON schedules
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = schedules.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
  )
);

CREATE POLICY schedules_modify ON schedules
FOR ALL USING (workos_user_id = auth.user_id());

-- SCHEDULE AVAILABILITIES
CREATE POLICY schedule_availabilities_all ON schedule_availabilities
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM schedules
    WHERE schedules.id = schedule_availabilities.schedule_id
    AND schedules.workos_user_id = auth.user_id()
  )
);

-- MEETINGS
CREATE POLICY meetings_read ON meetings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = meetings.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
  )
);

CREATE POLICY meetings_modify ON meetings
FOR ALL USING (workos_user_id = auth.user_id());

-- CATEGORIES
CREATE POLICY categories_read ON categories
FOR SELECT USING (true);

CREATE POLICY categories_modify ON categories
FOR ALL USING (auth.user_id() IS NOT NULL);

-- PROFILES
CREATE POLICY profiles_read ON profiles
FOR SELECT USING (true);

CREATE POLICY profiles_modify ON profiles
FOR ALL USING (workos_user_id = auth.user_id());

-- RECORDS (PHI)
CREATE POLICY records_read ON records
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = records.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
  )
);

CREATE POLICY records_modify ON records
FOR ALL USING (expert_id = auth.user_id());

-- PAYMENT TRANSFERS
CREATE POLICY payment_transfers_read ON payment_transfers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = payment_transfers.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
  )
);

CREATE POLICY payment_transfers_modify ON payment_transfers
FOR ALL USING (expert_workos_user_id = auth.user_id());

-- SCHEDULING SETTINGS
CREATE POLICY scheduling_settings_all ON scheduling_settings
FOR ALL USING (workos_user_id = auth.user_id());

-- AUDIT LOGS
CREATE POLICY audit_logs_read ON audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = audit_logs.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);

CREATE POLICY audit_logs_insert ON audit_logs
FOR INSERT WITH CHECK (auth.user_id() IS NOT NULL);

-- ============================================================================
-- PART D: RE-CREATE POLICIES (from 002_phase3_enable_rls.sql)
-- ============================================================================

-- EXPERT SETUP
CREATE POLICY "Users can view own expert setup"
  ON expert_setup FOR SELECT
  USING (workos_user_id = auth.user_id());

CREATE POLICY "Users can create own expert setup"
  ON expert_setup FOR INSERT
  WITH CHECK (workos_user_id = auth.user_id());

CREATE POLICY "Users can update own expert setup"
  ON expert_setup FOR UPDATE
  USING (workos_user_id = auth.user_id())
  WITH CHECK (workos_user_id = auth.user_id());

CREATE POLICY "Users can delete own expert setup"
  ON expert_setup FOR DELETE
  USING (workos_user_id = auth.user_id());

-- ============================================================================
-- PART E: RE-CREATE POLICIES (from 003_enable_rls_missing_tables.sql)
-- ============================================================================

-- ANNUAL PLAN ELIGIBILITY
CREATE POLICY "Users can view own eligibility"
  ON annual_plan_eligibility FOR SELECT
  USING (workos_user_id = auth.user_id());

CREATE POLICY "Users can create own eligibility"
  ON annual_plan_eligibility FOR INSERT
  WITH CHECK (workos_user_id = auth.user_id());

CREATE POLICY "Users can update own eligibility"
  ON annual_plan_eligibility FOR UPDATE
  USING (workos_user_id = auth.user_id())
  WITH CHECK (workos_user_id = auth.user_id());

CREATE POLICY "Org members can view org eligibility"
  ON annual_plan_eligibility FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships
      WHERE user_org_memberships.org_id = annual_plan_eligibility.org_id
      AND user_org_memberships.workos_user_id = auth.user_id()
      AND user_org_memberships.status = 'active'
    )
  );

-- BLOCKED DATES
CREATE POLICY "Users can view own blocked dates"
  ON blocked_dates FOR SELECT
  USING (workos_user_id = auth.user_id());

CREATE POLICY "Users can create own blocked dates"
  ON blocked_dates FOR INSERT
  WITH CHECK (workos_user_id = auth.user_id());

CREATE POLICY "Users can update own blocked dates"
  ON blocked_dates FOR UPDATE
  USING (workos_user_id = auth.user_id())
  WITH CHECK (workos_user_id = auth.user_id());

CREATE POLICY "Users can delete own blocked dates"
  ON blocked_dates FOR DELETE
  USING (workos_user_id = auth.user_id());

CREATE POLICY "Org members can view org blocked dates"
  ON blocked_dates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships
      WHERE user_org_memberships.org_id = blocked_dates.org_id
      AND user_org_memberships.workos_user_id = auth.user_id()
      AND user_org_memberships.status = 'active'
    )
  );

-- EXPERT APPLICATIONS
CREATE POLICY "Users can view own application"
  ON expert_applications FOR SELECT
  USING (workos_user_id = auth.user_id());

CREATE POLICY "Users can create own application"
  ON expert_applications FOR INSERT
  WITH CHECK (workos_user_id = auth.user_id());

CREATE POLICY "Users can update own application"
  ON expert_applications FOR UPDATE
  USING (
    workos_user_id = auth.user_id()
    AND status IN ('pending', 'rejected')
  )
  WITH CHECK (workos_user_id = auth.user_id());

CREATE POLICY "Admins can view all applications"
  ON expert_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.workos_user_id = auth.user_id()
      AND users.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update applications"
  ON expert_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.workos_user_id = auth.user_id()
      AND users.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.workos_user_id = auth.user_id()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- ROLES TABLE
CREATE POLICY "Users can view own roles"
  ON roles FOR SELECT
  USING (workos_user_id = auth.user_id());

CREATE POLICY "Admins can view all roles"
  ON roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.workos_user_id = auth.user_id()
      AND users.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can insert roles"
  ON roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.workos_user_id = auth.user_id()
      AND users.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update roles"
  ON roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.workos_user_id = auth.user_id()
      AND users.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.workos_user_id = auth.user_id()
      AND users.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can delete roles"
  ON roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.workos_user_id = auth.user_id()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- SLOT RESERVATIONS
CREATE POLICY "Users can view own reservations"
  ON slot_reservations FOR SELECT
  USING (guest_email = (SELECT email FROM users WHERE workos_user_id = auth.user_id()));

CREATE POLICY "Experts can view event reservations"
  ON slot_reservations FOR SELECT
  USING (workos_user_id = auth.user_id());

CREATE POLICY "Experts can create event reservations"
  ON slot_reservations FOR INSERT
  WITH CHECK (workos_user_id = auth.user_id());

CREATE POLICY "Experts can update event reservations"
  ON slot_reservations FOR UPDATE
  USING (workos_user_id = auth.user_id())
  WITH CHECK (workos_user_id = auth.user_id());

CREATE POLICY "Experts can delete event reservations"
  ON slot_reservations FOR DELETE
  USING (workos_user_id = auth.user_id());

CREATE POLICY "Org members can view org reservations"
  ON slot_reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships
      WHERE user_org_memberships.org_id = slot_reservations.org_id
      AND user_org_memberships.workos_user_id = auth.user_id()
      AND user_org_memberships.status = 'active'
    )
  );

-- SUBSCRIPTION EVENTS (append-only audit trail)
CREATE POLICY "Users can view org subscription events"
  ON subscription_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships
      WHERE user_org_memberships.org_id = subscription_events.org_id
      AND user_org_memberships.workos_user_id = auth.user_id()
      AND user_org_memberships.status = 'active'
    )
  );

CREATE POLICY "System can insert subscription events"
  ON subscription_events FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

CREATE POLICY "Admins can view all subscription events"
  ON subscription_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.workos_user_id = auth.user_id()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- TRANSACTION COMMISSIONS
CREATE POLICY "Users can view org commissions"
  ON transaction_commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships
      WHERE user_org_memberships.org_id = transaction_commissions.org_id
      AND user_org_memberships.workos_user_id = auth.user_id()
      AND user_org_memberships.status = 'active'
    )
  );

CREATE POLICY "System can insert commissions"
  ON transaction_commissions FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

CREATE POLICY "System can update commissions"
  ON transaction_commissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships
      WHERE user_org_memberships.org_id = transaction_commissions.org_id
      AND user_org_memberships.workos_user_id = auth.user_id()
      AND user_org_memberships.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_org_memberships
      WHERE user_org_memberships.org_id = transaction_commissions.org_id
      AND user_org_memberships.workos_user_id = auth.user_id()
      AND user_org_memberships.status = 'active'
    )
  );

CREATE POLICY "Admins can view all commissions"
  ON transaction_commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.workos_user_id = auth.user_id()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- ============================================================================
-- PART F: RE-CREATE POLICIES (from 004_subscription_plans_rls.sql)
-- ============================================================================

CREATE POLICY "Org members can view org subscription"
  ON subscription_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships
      WHERE user_org_memberships.org_id = subscription_plans.org_id
      AND user_org_memberships.workos_user_id = auth.user_id()
      AND user_org_memberships.status = 'active'
    )
  );

CREATE POLICY "Billing admin can update subscription"
  ON subscription_plans FOR UPDATE
  USING (
    billing_admin_user_id = auth.user_id()
    OR EXISTS (
      SELECT 1 FROM user_org_memberships
      WHERE user_org_memberships.org_id = subscription_plans.org_id
      AND user_org_memberships.workos_user_id = auth.user_id()
      AND user_org_memberships.role IN ('owner', 'admin')
      AND user_org_memberships.status = 'active'
    )
  )
  WITH CHECK (
    billing_admin_user_id = auth.user_id()
    OR EXISTS (
      SELECT 1 FROM user_org_memberships
      WHERE user_org_memberships.org_id = subscription_plans.org_id
      AND user_org_memberships.workos_user_id = auth.user_id()
      AND user_org_memberships.role IN ('owner', 'admin')
      AND user_org_memberships.status = 'active'
    )
  );

CREATE POLICY "Org owners can insert subscription"
  ON subscription_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_org_memberships
      WHERE user_org_memberships.org_id = subscription_plans.org_id
      AND user_org_memberships.workos_user_id = auth.user_id()
      AND user_org_memberships.role IN ('owner', 'admin')
      AND user_org_memberships.status = 'active'
    )
  );

CREATE POLICY "Org owners can delete subscription"
  ON subscription_plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships
      WHERE user_org_memberships.org_id = subscription_plans.org_id
      AND user_org_memberships.workos_user_id = auth.user_id()
      AND user_org_memberships.role = 'owner'
      AND user_org_memberships.status = 'active'
    )
  );

CREATE POLICY "Admins can view all subscriptions"
  ON subscription_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.workos_user_id = auth.user_id()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- ============================================================================
-- PART G: VERIFICATION
-- ============================================================================

SELECT
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT
  tablename,
  COUNT(*) as "Policy Count"
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
