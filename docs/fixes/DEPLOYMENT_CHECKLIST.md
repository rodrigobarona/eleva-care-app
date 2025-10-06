# 🚀 Deployment Checklist: Duplicate Welcome Email Fix

**Date:** October 6, 2025  
**Priority:** 🔴 CRITICAL FIX

---

## ✅ **Pre-Deployment Checklist**

### **1. Code Review**

- [x] Database schema changes reviewed
- [x] Migration script reviewed
- [x] Event mapping changes reviewed
- [x] Idempotency logic reviewed
- [x] No linting errors
- [x] TypeScript compilation successful

### **2. Local Testing**

- [ ] Run migration locally: `pnpm drizzle-kit push`
- [ ] Verify new columns exist in local database
- [ ] Test new user creation flow
- [ ] Test user update flow (should NOT send email)
- [ ] Verify idempotency checks work

---

## 📦 **Deployment Steps**

### **Step 1: Backup Database**

```bash
# Create backup before migration
pg_dump $DATABASE_URL > backup_before_welcome_fix_$(date +%Y%m%d).sql
```

### **Step 2: Run Database Migration**

**Option A: Using Drizzle Kit (Recommended)**

```bash
pnpm drizzle-kit push
```

**Option B: Manual SQL Execution**

```bash
psql $DATABASE_URL -f drizzle/migrations/0004_add_welcome_email_tracking.sql
```

**Verify Migration:**

```sql
-- Check if columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('welcome_email_sent_at', 'onboarding_completed_at');

-- Check if index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND indexname = 'users_welcome_email_sent_at_idx';

-- Verify backfill for existing users
SELECT
  COUNT(*) as total_users,
  COUNT(welcome_email_sent_at) as users_with_timestamp,
  COUNT(*) - COUNT(welcome_email_sent_at) as users_without_timestamp
FROM users;
```

### **Step 3: Deploy Code Changes**

```bash
# Commit changes
git add .
git commit -m "fix: prevent duplicate welcome emails to existing users

- Added welcomeEmailSentAt tracking field to UserTable
- Removed user.updated from workflow event mappings
- Implemented idempotency checks in Clerk webhook
- Backfilled existing users to prevent duplicates
- Fixes issue where existing users received welcome emails repeatedly"

# Push to production
git push origin main
```

### **Step 4: Monitor Deployment**

**Vercel Dashboard:**

1. Check deployment status: https://vercel.com/dashboard
2. Monitor build logs for errors
3. Verify deployment successful

**Check Application Logs:**

```bash
# Look for these log messages in Vercel logs:
# ✅ "Marked welcome email as sent for user: user_xxx"
# ✅ "Skipping welcome notification - already sent to user: user_xxx"
# ✅ "Successfully triggered Novu workflow for Clerk event: user.created"
```

---

## 🧪 **Post-Deployment Testing**

### **Test 1: New User Registration**

```bash
# Steps:
1. Create a new user via your app's signup flow
2. Check email inbox for welcome email
3. Verify in database:
   SELECT clerkUserId, email, welcomeEmailSentAt
   FROM users
   WHERE email = 'test@example.com';

# Expected Results:
✅ Welcome email received ONCE
✅ welcomeEmailSentAt timestamp is set in database
✅ Logs show: "Marked welcome email as sent"
```

### **Test 2: User Profile Update**

```bash
# Steps:
1. Update an existing user's profile (name, bio, etc.)
2. Check if welcome email is sent (it should NOT be)
3. Verify in Vercel logs

# Expected Results:
✅ NO welcome email sent
✅ Logs show: "Skipping welcome notification - already sent"
✅ welcomeEmailSentAt timestamp unchanged
```

### **Test 3: Clerk Webhook Test**

```bash
# Steps:
1. Go to Clerk Dashboard > Webhooks
2. Manually trigger a "user.updated" webhook
3. Check Vercel logs and email

# Expected Results:
✅ NO welcome email sent
✅ Logs show: "No workflow mapped for event type: user.updated"
```

### **Test 4: Duplicate Prevention**

```bash
# Steps:
1. Find a user with welcomeEmailSentAt set
2. Manually trigger user.created webhook for that user
3. Check logs and email

# Expected Results:
✅ NO email sent (idempotency check prevents it)
✅ Logs show: "Skipping welcome notification - already sent"
```

---

## 📊 **Monitoring & Validation**

### **Database Queries to Run**

```sql
-- 1. Check if all existing users have timestamp set
SELECT
  COUNT(*) as total_users,
  COUNT(welcome_email_sent_at) as users_with_welcome_timestamp,
  ROUND(COUNT(welcome_email_sent_at)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as percentage
FROM users;

-- 2. Find users created in last 24 hours
SELECT
  clerkUserId,
  email,
  createdAt,
  welcomeEmailSentAt,
  CASE
    WHEN welcomeEmailSentAt IS NOT NULL THEN 'Email Sent'
    ELSE 'No Email'
  END as status
FROM users
WHERE createdAt > NOW() - INTERVAL '24 hours'
ORDER BY createdAt DESC;

-- 3. Check for users without timestamp (should be minimal)
SELECT
  clerkUserId,
  email,
  createdAt,
  welcomeEmailSentAt
FROM users
WHERE welcomeEmailSentAt IS NULL
  AND createdAt < NOW() - INTERVAL '1 day'
ORDER BY createdAt DESC
LIMIT 10;
```

### **Novu Dashboard**

1. Go to https://web.novu.co
2. Navigate to "Workflows" > "user-lifecycle"
3. Check "Activity Feed" for recent triggers
4. Verify no duplicate triggers for same user

### **Vercel Logs**

Monitor for these patterns:

**✅ Good Patterns:**

```
🔔 Triggering Novu workflow 'user-lifecycle' for Clerk event 'user.created'
✅ Successfully triggered Novu workflow for Clerk event: user.created
✅ Marked welcome email as sent for user: user_2xxx
```

**✅ Expected (Not Error):**

```
🔕 Skipping welcome notification - already sent to user: user_2xxx
🔕 No workflow mapped for event type: user.updated
```

**❌ Bad Patterns (Should Not See):**

```
❌ Failed to trigger Novu workflow
Error checking welcome email status
Error marking welcome email as sent
```

---

## 🔄 **Rollback Plan** (If Needed)

If issues are detected after deployment:

### **Step 1: Rollback Code**

```bash
# Revert the commit
git revert HEAD
git push origin main
```

### **Step 2: Database Rollback** (Optional)

```sql
-- Remove the new columns (ONLY if causing issues)
ALTER TABLE users DROP COLUMN IF EXISTS welcome_email_sent_at;
ALTER TABLE users DROP COLUMN IF EXISTS onboarding_completed_at;
DROP INDEX IF EXISTS users_welcome_email_sent_at_idx;
```

### **Step 3: Restore from Backup** (Last Resort)

```bash
# Restore database from backup
psql $DATABASE_URL < backup_before_welcome_fix_YYYYMMDD.sql
```

---

## 📝 **Communication Plan**

### **Internal Team Notification**

**Subject:** 🔧 Critical Fix Deployed - Duplicate Welcome Emails

**Message:**

```
Hi team,

We've deployed a critical fix to resolve the issue where existing users
were receiving duplicate welcome emails.

✅ What was fixed:
- Removed user.updated event from triggering welcome workflow
- Added database tracking to prevent duplicate sends
- Implemented idempotency checks

✅ What to expect:
- New users will receive welcome email ONCE on signup
- Existing users will NOT receive duplicate welcome emails
- User profile updates will NOT trigger welcome emails

Please report any issues immediately.

Deployment docs: /docs/fixes/duplicate-welcome-email-fix.md
```

### **User Communication** (If Needed)

**Subject:** Apology - Duplicate Welcome Emails

**Message:**

```
Dear Valued User,

We recently identified and resolved an issue that caused some users to
receive duplicate welcome emails. We apologize for any confusion this
may have caused.

This has been fixed, and you will no longer receive duplicate notifications
from us.

Thank you for your patience and understanding.

Best regards,
The Eleva Care Team
```

---

## ✅ **Final Verification**

- [ ] Migration executed successfully
- [ ] Code deployed to production
- [ ] New user test passed
- [ ] User update test passed
- [ ] No duplicate emails sent
- [ ] Database queries show expected results
- [ ] Vercel logs show correct behavior
- [ ] Novu dashboard shows single triggers
- [ ] Team notified of deployment
- [ ] Documentation updated

---

## 📞 **Support & Escalation**

If issues arise:

1. **Check Vercel Logs:** https://vercel.com/dashboard
2. **Check Novu Logs:** https://web.novu.co
3. **Check Database:** Run monitoring queries above
4. **Rollback if needed:** Follow rollback plan
5. **Report to team:** Notify via Slack/Email

---

**Deployment Date:** **\*\***\_**\*\***  
**Deployed By:** **\*\***\_**\*\***  
**Verified By:** **\*\***\_**\*\***  
**Sign-Off:** **\*\***\_**\*\***

---

**Status:** 🟢 READY FOR DEPLOYMENT
