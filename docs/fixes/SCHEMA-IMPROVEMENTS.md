# Schema Improvements for Payment Transfer Table

**Date:** October 28, 2025  
**Related To:** Duplicate Transfer Fix  
**Status:** RECOMMENDED

---

## 🎯 Recommended Schema Enhancements

### 1. Add Database Indexes

**Current State:** No indexes defined in schema.ts for `PaymentTransferTable`

**Problem:**

- Cron jobs query by `payment_intent_id`, `status`, `scheduled_transfer_time`, `transfer_id`
- Without indexes, these queries do full table scans (slow as data grows)

**Solution:** Add indexes to `drizzle/schema.ts`

```typescript
export const PaymentTransferTable = pgTable(
  'payment_transfers',
  {
    id: serial('id').primaryKey(),
    paymentIntentId: text('payment_intent_id').notNull(),
    checkoutSessionId: text('checkout_session_id').notNull(),
    eventId: text('event_id').notNull(),
    expertConnectAccountId: text('expert_connect_account_id').notNull(),
    expertClerkUserId: text('expert_clerk_user_id').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('eur'),
    platformFee: integer('platform_fee').notNull(),
    sessionStartTime: timestamp('session_start_time').notNull(),
    scheduledTransferTime: timestamp('scheduled_transfer_time').notNull(),
    status: paymentTransferStatusEnum('status').notNull().default(PAYMENT_TRANSFER_STATUS_PENDING),
    transferId: text('transfer_id'),
    payoutId: text('payout_id'),
    stripeErrorCode: text('stripe_error_code'),
    stripeErrorMessage: text('stripe_error_message'),
    retryCount: integer('retry_count').default(0),
    requiresApproval: boolean('requires_approval').default(false),
    adminUserId: text('admin_user_id'),
    adminNotes: text('admin_notes'),
    notifiedAt: timestamp('notified_at'),
    created: timestamp('created').notNull().defaultNow(),
    updated: timestamp('updated').notNull().defaultNow(),
  },
  (table) => ({
    // ✅ NEW INDEXES for better query performance
    paymentIntentIdIdx: index('payment_transfers_payment_intent_idx').on(table.paymentIntentId),
    transferIdIdx: index('payment_transfers_transfer_id_idx').on(table.transferId),
    statusIdx: index('payment_transfers_status_idx').on(table.status),
    scheduledTimeIdx: index('payment_transfers_scheduled_time_idx').on(table.scheduledTransferTime),
    expertUserIdIdx: index('payment_transfers_expert_user_idx').on(table.expertClerkUserId),
    // Composite index for common query pattern in cron jobs
    statusScheduledIdx: index('payment_transfers_status_scheduled_idx').on(
      table.status,
      table.scheduledTransferTime,
    ),
  }),
);
```

**Impact:**

- ✅ **10-100x faster queries** (depending on table size)
- ✅ **Better cron job performance** (sub-second instead of seconds)
- ✅ **Scales better** as data grows

---

### 2. Add Unique Constraint on `payment_intent_id`

**Current State:** No unique constraint (allows duplicates)

**Problem:**

- Same payment could theoretically have multiple transfer records
- Opens door to duplicate processing

**Solution:** Add unique constraint

```typescript
export const PaymentTransferTable = pgTable(
  'payment_transfers',
  {
    // ... fields ...
  },
  (table) => ({
    // ... existing indexes ...
    // ✅ NEW UNIQUE CONSTRAINT
    paymentIntentUnique: unique('payment_transfers_payment_intent_unique').on(
      table.paymentIntentId,
    ),
  }),
);
```

**Impact:**

- ✅ **Prevents duplicate records** at database level
- ✅ **Fails fast** if duplicate attempted
- ⚠️ **Requires data cleanup** before migration (check Query #2 in audit script)

---

### 3. Make `transfer_id` Unique (Optional but Recommended)

**Current State:** `transferId` is not unique

**Problem:**

- Same Stripe transfer ID could theoretically be used in multiple records
- Could mask data integrity issues

**Solution:** Add unique constraint

```typescript
transferId: text('transfer_id').unique(),
```

**Impact:**

- ✅ **Ensures one-to-one mapping** between database and Stripe
- ✅ **Catches sync errors** early
- ⚠️ **Requires NULL values** to be handled (NULL is always unique in PostgreSQL)

---

### 4. Add `chargeId` Field (Future Enhancement)

**Current State:** Only stores `paymentIntentId`

**Problem:**

- Current fix requires fetching PaymentIntent to get charge ID
- Extra API call on every transfer creation check

**Solution:** Store charge ID directly

```typescript
export const PaymentTransferTable = pgTable('payment_transfers', {
  // ... existing fields ...
  paymentIntentId: text('payment_intent_id').notNull(),
  chargeId: text('charge_id'), // ✅ NEW FIELD
  // ... rest of fields ...
});
```

**Benefits:**

- ✅ **Faster duplicate checks** (one API call instead of two)
- ✅ **Better debugging** (direct link to charge in Stripe)
- ✅ **Audit trail** (know exactly which charge was used)

**Migration:**

- Backfill charge IDs from Stripe for existing records
- Populate in webhook when creating transfer record

---

### 5. Add `sync_status` Field (Audit Tracking)

**Current State:** No tracking of database-Stripe sync status

**Problem:**

- Can't tell if `transferId` was synced from Stripe or created by us
- Hard to track which records need re-sync

**Solution:** Add sync tracking

```typescript
const syncStatusEnum = pgEnum('sync_status', ['created_by_us', 'synced_from_stripe', 'needs_sync']);

export const PaymentTransferTable = pgTable('payment_transfers', {
  // ... existing fields ...
  syncStatus: syncStatusEnum('sync_status').default('needs_sync'),
  lastSyncedAt: timestamp('last_synced_at'),
  // ... rest of fields ...
});
```

**Benefits:**

- ✅ **Track sync state** explicitly
- ✅ **Easier monitoring** (find records that need sync)
- ✅ **Better debugging** (know source of truth)

---

## 📋 Migration Checklist

### Before Applying Schema Changes

1. **Run audit queries** (DATABASE-AUDIT-QUERIES.sql)
2. **Check for duplicates** (Query #2)
3. **Backup database** (Neon automatic backups)
4. **Test in development** first

### Migration Order

```bash
# 1. Add indexes (safe, no data changes)
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 2. Add chargeId field (nullable, backfill later)
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 3. Clean up any duplicate payment_intent_ids
# Run manual SQL to consolidate if Query #2 shows duplicates

# 4. Add unique constraint on payment_intent_id
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 5. Add sync tracking fields
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### After Migration

1. **Verify indexes created:**

   ```sql
   SELECT indexname, indexdef FROM pg_indexes
   WHERE tablename = 'payment_transfers';
   ```

2. **Check constraints:**

   ```sql
   SELECT conname, contype, pg_get_constraintdef(oid)
   FROM pg_constraint
   WHERE conrelid = 'payment_transfers'::regclass;
   ```

3. **Monitor query performance:**
   - Check cron job execution time
   - Verify queries use indexes (EXPLAIN ANALYZE)

---

## 🎬 Implementation Priority

### High Priority (Do Now)

1. ✅ **Add indexes** - Critical for performance
2. ✅ **Run audit queries** - Verify data integrity

### Medium Priority (Next Sprint)

3. 🔶 **Add unique constraint** on `payment_intent_id`
4. 🔶 **Add `chargeId` field** for better performance

### Low Priority (Future Enhancement)

5. 🔵 **Add sync tracking** for better audit trail
6. 🔵 **Make `transferId` unique**

---

## 📊 Performance Impact Estimates

### Current Performance (No Indexes)

```sql
-- Cron job query (finds pending transfers)
SELECT * FROM payment_transfers
WHERE status = 'PENDING'
  AND transfer_id IS NULL
  AND scheduled_transfer_time <= NOW();

-- Performance: ~200-500ms (with 10K records)
-- Scan: FULL TABLE SCAN
```

### After Indexes

```sql
-- Same query
-- Performance: ~5-20ms (with 10K records)
-- Scan: INDEX SCAN (uses status_scheduled_idx)
```

**Improvement: 10-100x faster** ⚡

---

## 🧪 Testing Recommendations

### Before Production Deployment

1. **Load test:**
   - Create 1000 test transfer records
   - Run cron job
   - Measure execution time

2. **Index verification:**

   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM payment_transfers
   WHERE status = 'PENDING'
     AND scheduled_transfer_time <= NOW()
     AND transfer_id IS NULL;
   ```

   Should show "Index Scan" not "Seq Scan"

3. **Unique constraint test:**
   - Try inserting duplicate payment_intent_id
   - Should fail with constraint violation

---

## 📝 Related Files

- **Schema:** `drizzle/schema.ts` (lines 460-484)
- **Cron Jobs:**
  - `app/api/cron/process-tasks/route.ts` (line 112-126)
  - `app/api/cron/process-expert-transfers/route.ts`
- **Audit Queries:** `docs/fixes/DATABASE-AUDIT-QUERIES.sql`

---

**Author:** AI Assistant  
**Status:** Recommendations for review  
**Next Step:** Run audit queries, then implement indexes
