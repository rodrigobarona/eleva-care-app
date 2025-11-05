# 🚀 Ready to Migrate - Standard Approach

## ✅ **What's Been Completed**

| Task                   | Status       | Details                                   |
| ---------------------- | ------------ | ----------------------------------------- |
| **WorkOS Setup**       | ✅ Complete  | Account created, API keys configured      |
| **Neon Database**      | ✅ Complete  | New database created with DEV/PROD URLs   |
| **Schema Design**      | ✅ Complete  | `schema-workos.ts` with org-scoped tables |
| **RLS Strategy**       | ✅ Complete  | Standard approach using `SET LOCAL`       |
| **Drizzle Migrations** | ✅ Generated | `0000_volatile_the_captain.sql`           |
| **RLS Policies**       | ✅ Ready     | `001_enable_rls_standard.sql`             |
| **Auth Integration**   | ✅ Complete  | WorkOS SDK + session management           |
| **RLS Client**         | ✅ Complete  | `lib/integrations/neon/rls-client.ts`     |
| **Audit Logging**      | ✅ Complete  | Unified schema with RLS                   |

---

## 🎯 **Next Steps** (In Order)

### **Step 1: Apply Drizzle Migrations (Create Tables)**

This creates all the database tables:

```bash
# Using development database
pnpm drizzle-kit push

# Or using migrate command
pnpm db:migrate
```

**What this does:**

- Creates all 15 tables (organizations, users, events, meetings, etc.)
- Sets up foreign keys and indexes
- Creates enums (payment_transfer_status, day_of_week)

**Verify:**

```sql
-- Check tables were created
\dt

-- Should show 15 tables:
-- audit_log_exports, audit_logs, audit_stats,
-- categories, events, meetings, organizations,
-- payment_transfers, profiles, records,
-- schedule_availabilities, schedules,
-- scheduling_settings, user_org_memberships, users
```

---

### **Step 2: Enable RLS Policies**

This applies Row-Level Security to protect your data:

```bash
# Connect to your Neon database
psql $DATABASE_DEV_URL

# Or copy and paste the SQL
cat drizzle/migrations-manual/001_enable_rls_standard.sql | psql $DATABASE_DEV_URL
```

**What this does:**

- Enables RLS on all 15 tables
- Creates helper functions (`app.current_user_id()`, `app.is_org_member()`)
- Applies org-scoped policies
- Creates append-only policies for audit logs

**Verify:**

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';

-- Test helper functions
SELECT app.current_user_id(); -- Should return NULL (no context set)
```

---

### **Step 3: Test RLS Context**

Create a test file to verify RLS works:

```typescript
// scripts/test-rls.ts
import { EventsTable } from '@/drizzle/schema-workos';
import { testRLSContext, withRLSContext } from '@/lib/integrations/neon/rls-client';

async function testRLS() {
  console.log('Testing RLS Context...');

  // Test 1: Check context setting
  const context = await testRLSContext();
  console.log('Context:', context);

  // Test 2: Query with RLS
  const result = await withRLSContext(async (tx) => {
    const events = await tx.select().from(EventsTable);
    return { eventCount: events.length };
  });

  console.log('Query result:', result);
}

testRLS();
```

Run:

```bash
tsx scripts/test-rls.ts
```

---

### **Step 4: Build Data Migration Scripts**

Now that the schema is ready, build scripts to migrate data from Clerk → WorkOS:

**What needs to be migrated:**

1. ✅ Users (map `clerk_user_id` → `workos_user_id`)
2. ✅ Create organizations (org-per-user model)
3. ✅ Create user-org memberships
4. ✅ Migrate events, schedules, meetings (add `org_id`)
5. ✅ Migrate profiles, records (add `org_id`)
6. ✅ Migrate audit logs (if they exist)

**Script structure:**

```typescript
// scripts/migrate-data.ts
import { db as legacyDb } from '@/drizzle/db';
// Legacy Clerk DB
import { getAdminDb } from '@/lib/integrations/neon/rls-client';

// New WorkOS DB

async function migrateData() {
  const adminDb = getAdminDb();

  // 1. Export users from legacy DB
  const legacyUsers = await legacyDb.select().from(LegacyUsersTable);

  // 2. Create WorkOS organizations (one per user)
  // 3. Create WorkOS users
  // 4. Create user-org memberships
  // 5. Migrate application data (events, meetings, etc.)
  // 6. Verify data integrity
}
```

---

### **Step 5: Update Application Code**

Replace Clerk auth with WorkOS:

**Files to update:**

1. **API Routes** (`app/api/*`)

   ```typescript
   // Before (Clerk)
   import { auth } from '@clerk/nextjs';
   const { userId } = auth();

   // After (WorkOS)
   import { requireAuth } from '@/lib/auth/workos-session';
   const session = await requireAuth();
   const userId = session.user.id;
   ```

2. **Server Actions** (`server/actions/*`)

   ```typescript
   // Before
   const userId = auth().userId;

   // After
   const session = await requireAuth();
   const userId = session.user.id;
   ```

3. **Database Queries** (use RLS client)

   ```typescript
   // Before
   import { db } from '@/drizzle/db';
   const events = await db.select().from(EventsTable)
     .where(eq(EventsTable.userId, userId));

   // After
   import { withRLSContext } from '@/lib/integrations/neon/rls-client';
   const events = await withRLSContext(async (tx) => {
     return await tx.select().from(EventsTable);
     // RLS automatically filters to user's org!
   });
   ```

4. **Components** (use WorkOS UI)
   - Replace `<ClerkProvider>` with `<WorkOSProvider>`
   - Replace `<UserButton>` with custom profile dropdown
   - Update sign-in/sign-up flows

---

### **Step 6: Google Calendar Migration**

Create a flow for experts to reconnect their Google calendars:

**What's needed:**

1. ✅ Notification banner for experts
2. ✅ Reconnection flow UI
3. ✅ Token migration script (optional - try to reuse tokens)
4. ✅ Email notification to experts

---

### **Step 7: Testing**

**Test Checklist:**

- [ ] ✅ Authentication works (sign in, sign out, callback)
- [ ] ✅ RLS policies enforce org isolation
- [ ] ✅ Users can only see their own data
- [ ] ✅ Audit logs are created correctly
- [ ] ✅ Bookings work end-to-end
- [ ] ✅ Payments process correctly
- [ ] ✅ Google Calendar integration works
- [ ] ✅ Expert profiles are public (no RLS blocking)
- [ ] ✅ Admin operations work (with getAdminDb())

---

### **Step 8: Deployment**

1. **Update Environment Variables (Vercel)**

   ```bash
   # Remove Clerk variables
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=xxx
   CLERK_SECRET_KEY=xxx

   # Add WorkOS variables
   WORKOS_API_KEY=sk_live_xxx
   WORKOS_CLIENT_ID=client_xxx
   WORKOS_REDIRECT_URI=https://eleva.care/auth/callback

   # Add new Neon database URLs
   DATABASE_URL=postgresql://...
   DATABASE_DEV_URL=postgresql://...
   ```

2. **Deploy to Vercel**

   ```bash
   vercel --prod
   ```

3. **Run migrations on production**

   ```bash
   # Use production DATABASE_URL
   DATABASE_URL=$PRODUCTION_URL pnpm db:migrate
   DATABASE_URL=$PRODUCTION_URL psql < drizzle/migrations-manual/001_enable_rls_standard.sql
   ```

4. **Execute data migration**
   ```bash
   tsx scripts/migrate-data.ts --production
   ```

---

### **Step 9: User Communication**

Send emails to all users:

**For Patients:**

> "We've upgraded our authentication system for better security. Please use the 'Sign in with WorkOS' button on your next visit."

**For Experts:**

> "We've migrated to a new authentication system. Please:
>
> 1. Sign in at [link]
> 2. Reconnect your Google Calendar
> 3. Verify your profile and availability"

---

### **Step 10: Monitoring**

Monitor for 48 hours:

- [ ] ✅ Authentication success rate
- [ ] ✅ RLS policy performance
- [ ] ✅ Calendar reconnection rate
- [ ] ✅ Booking completion rate
- [ ] ✅ Payment processing
- [ ] ✅ Error rates in logs

---

## 📊 **How RLS Works (Standard Approach)**

### **In Your Application:**

```typescript
// 3. Make database queries with RLS
import { withRLSContext } from '@/lib/integrations/neon/rls-client';

// 1. User authenticates with WorkOS
const code = searchParams.get('code');
const { user, organizationId } = await workos.authKit.authenticateWithCode(code);

// 2. Create session (stores user ID + org ID)
await createSession(user.id, organizationId);

const events = await withRLSContext(async (tx) => {
  // Behind the scenes:
  // - tx.execute(sql`SET LOCAL app.user_id = ${userId}`)
  // - tx.execute(sql`SET LOCAL app.org_id = ${orgId}`)

  // Then your query runs with RLS automatically applied:
  return await tx.select().from(EventsTable);

  // RLS policy filters: WHERE org_id IN (
  //   SELECT org_id FROM user_org_memberships
  //   WHERE workos_user_id = current_setting('app.user_id')
  // )
});
```

### **Benefits:**

✅ **Automatic data isolation** - Users can only see their org's data
✅ **Database-level security** - Can't be bypassed in application code
✅ **Performance** - Postgres optimizes RLS checks with indexes
✅ **Portable** - Works with any Postgres database, not Neon-specific
✅ **Production-ready** - Used by Stripe, GitHub, Heroku, and others

---

## 🎯 **Immediate Actions**

Run these commands now:

```bash
# 1. Apply Drizzle migrations (create tables)
pnpm drizzle-kit push

# 2. Enable RLS policies
cat drizzle/migrations-manual/001_enable_rls_standard.sql | psql $DATABASE_DEV_URL

# 3. Verify setup
psql $DATABASE_DEV_URL -c "\dt" # Should show 15 tables
psql $DATABASE_DEV_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';" # Should show RLS enabled

# 4. Test RLS context
tsx scripts/test-rls.ts
```

---

## 📚 **Documentation**

- ✅ **Schema**: `drizzle/schema-workos.ts`
- ✅ **RLS Policies**: `drizzle/migrations-manual/001_enable_rls_standard.sql`
- ✅ **RLS Client**: `lib/integrations/neon/rls-client.ts`
- ✅ **Auth Session**: `lib/auth/workos-session.ts`
- ✅ **WorkOS Client**: `lib/integrations/workos/client.ts`
- ✅ **Audit Utils**: `lib/utils/server/audit-workos.ts`

---

## 🆘 **Need Help?**

- **RLS not working?** Check that `SET LOCAL` is being called in a transaction
- **Data not isolated?** Verify RLS policies with `SELECT * FROM pg_policies;`
- **Performance slow?** Check indexes on `org_id` and `workos_user_id` columns
- **Auth failing?** Verify WorkOS credentials and redirect URI

---

## 🎉 **You're Ready!**

The foundation is complete. Now it's time to:

1. ✅ Apply migrations
2. ✅ Test RLS
3. ✅ Build data migration scripts
4. ✅ Start migrating!

**Good luck!** 🚀
