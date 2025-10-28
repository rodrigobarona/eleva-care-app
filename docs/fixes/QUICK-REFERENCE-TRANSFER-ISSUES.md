# Quick Reference: Stripe Transfer Issues

**Last Updated:** October 28, 2025

---

## ⚡ Quick Diagnosis

### Symptom: "Transfer already exists for this charge"

**Error Message:**

```
Transfers using this transaction as a source must not exceed
the source amount of €XX.XX. (There is already a transfer using
this source, amounting to €XX.XX.)
```

**Quick Fix:**

1. Check if transfer exists in Stripe Dashboard
2. If yes, manually update database record with transfer ID
3. System will auto-sync on next cron run after fix deployment

**Prevention:**

- ✅ **FIXED** — pending v1.1.0 release
- Both cron jobs now check Stripe before creating transfers
- Self-healing: syncs database with Stripe automatically

---

## 🔍 How to Check Transfer Status

### In Database

```sql
SELECT
  id,
  payment_intent_id,
  status,
  transfer_id,
  scheduled_transfer_time,
  created,
  updated,
  stripe_error_message
FROM payment_transfers
WHERE payment_intent_id = 'pi_xxxxx';
```

### In Stripe Dashboard

1. Go to: https://dashboard.stripe.com/payments
2. Search for Payment Intent: `pi_xxxxx`
3. Click on payment
4. Scroll to "Transfers" section
5. Check if transfer exists

### Via Stripe API (curl)

> **⚠️ Security Warning:** The examples below use raw API keys in curl commands, which can expose secrets in shell history and process listings. **Recommended:** Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) instead (e.g., `stripe charges retrieve ch_xxx`) to avoid handling raw secrets directly.

```bash
# Get the payment intent
curl https://api.stripe.com/v1/payment_intents/pi_xxxxx \
  -H "Authorization: Bearer ${STRIPE_SECRET_KEY}"

# Get the charge with transfer expanded
curl https://api.stripe.com/v1/charges/py_xxxxx?expand[]=transfer \
  -H "Authorization: Bearer ${STRIPE_SECRET_KEY}"
```

**Safer alternative with Stripe CLI:**

```bash
# Get the payment intent
stripe payment_intents retrieve pi_xxxxx

# Get the charge with transfer expanded
stripe charges retrieve py_xxxxx --expand transfer
```

---

## 🛠️ Manual Fix Steps

### If Database Shows `transferId: NULL` but Stripe Has Transfer

**Scenario:** Cron fails, database out of sync with Stripe

> **⚠️ Security Note:** Prefer using the Stripe CLI when available to avoid exposing secrets. The curl examples below are provided for reference but can leak secrets via shell history.

**Steps:**

#### Step 1: Get the charge ID

```bash
# Using curl (less secure)
curl https://api.stripe.com/v1/payment_intents/pi_xxxxx \
  -H "Authorization: Bearer ${STRIPE_SECRET_KEY}" \
  | jq '.latest_charge'

# Using Stripe CLI (recommended)
stripe payment_intents retrieve pi_xxxxx --format json | jq '.latest_charge'
```

#### Step 2: Get the transfer ID

```bash
# Using curl (less secure)
curl https://api.stripe.com/v1/charges/py_xxxxx?expand[]=transfer \
  -H "Authorization: Bearer ${STRIPE_SECRET_KEY}" \
  | jq '.transfer.id'

# Using Stripe CLI (recommended)
stripe charges retrieve py_xxxxx --expand transfer --format json | jq '.transfer.id'
```

#### Step 3: Update database

```sql
UPDATE payment_transfers
SET
  transfer_id = 'tr_xxxxx',
  status = 'COMPLETED',
  updated = NOW()
WHERE payment_intent_id = 'pi_xxxxx';
```

#### Step 4: Verify

```bash
# Next cron run should show: "✅ Updated database with existing transfer ID"
```

---

## 📊 Common Scenarios

### Scenario 1: Card Payment

```
Timeline:
1. Customer pays with card → instant confirmation
2. Webhook fires → creates DB record
3. transfer_data.destination → Stripe auto-creates transfer
4. Cron runs → detects existing transfer → syncs DB
```

**Status:** ✅ Works perfectly after fix

### Scenario 2: Multibanco Payment

```
Timeline:
1. Customer receives reference → status PENDING
2. Customer pays (1-12 hours later)
3. Stripe confirms payment
4. Webhook fires → creates DB record with transferId: NULL
5. transfer_data.destination → Stripe auto-creates transfer
6. Cron runs (next day) → detects existing transfer → syncs DB
```

**Status:** ✅ Fixed - was the problematic case

### Scenario 3: Manual Approval Required

```
Timeline:
1. Payment succeeds
2. Webhook creates DB record with status: PENDING
3. Admin approves → status: APPROVED
4. Cron runs → creates transfer (no existing transfer)
5. Updates DB with transfer ID
```

**Status:** ✅ Works as expected

---

## 🔧 Debugging Commands

### Check Pending Transfers

```sql
SELECT
  COUNT(*) as total,
  status,
  DATE(scheduled_transfer_time) as scheduled_date
FROM payment_transfers
WHERE transfer_id IS NULL
GROUP BY status, DATE(scheduled_transfer_time)
ORDER BY scheduled_date DESC;
```

### Check Failed Transfers

```sql
SELECT
  id,
  payment_intent_id,
  expert_clerk_user_id,
  amount,
  scheduled_transfer_time,
  retry_count,
  stripe_error_message
FROM payment_transfers
WHERE status = 'FAILED'
ORDER BY updated DESC
LIMIT 20;
```

### Check Stuck Transfers

```sql
SELECT
  id,
  payment_intent_id,
  status,
  scheduled_transfer_time,
  EXTRACT(EPOCH FROM (NOW() - scheduled_transfer_time))/3600 as hours_overdue
FROM payment_transfers
WHERE
  status IN ('PENDING', 'READY', 'APPROVED')
  AND transfer_id IS NULL
  AND scheduled_transfer_time < NOW() - INTERVAL '24 hours'
ORDER BY hours_overdue DESC;
```

---

## 📈 Monitoring Queries

### Today's Transfer Status

```sql
SELECT
  status,
  COUNT(*) as count,
  SUM(amount)/100.0 as total_euros
FROM payment_transfers
WHERE DATE(scheduled_transfer_time) = CURRENT_DATE
GROUP BY status;
```

### Expert Payout Summary

```sql
SELECT
  expert_clerk_user_id,
  COUNT(*) as total_transfers,
  SUM(CASE WHEN transfer_id IS NOT NULL THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN transfer_id IS NULL THEN 1 ELSE 0 END) as pending,
  SUM(amount)/100.0 as total_amount_euros
FROM payment_transfers
WHERE scheduled_transfer_time >= NOW() - INTERVAL '30 days'
GROUP BY expert_clerk_user_id
ORDER BY total_amount_euros DESC;
```

---

## 🚨 When to Escalate

### Immediate Escalation

1. **Multiple consecutive failures** (3+ in a row)
2. **Transfer stuck > 48 hours** after scheduled time
3. **Expert reports missing payment** and transfer shows COMPLETED
4. **Database shows COMPLETED** but Stripe shows no transfer

### Investigation Needed

1. **Retry count > 2** for any transfer
2. **Unusual error messages** not documented here
3. **Transfer amount mismatch** between DB and Stripe
4. **Missing payment intent** or charge in Stripe

---

## 📝 Related Documentation

- **Full Analysis:** [ANALYSIS-DUPLICATE-TRANSFER-ISSUE.md](./ANALYSIS-DUPLICATE-TRANSFER-ISSUE.md)
- **Fix Documentation:** [DUPLICATE-TRANSFER-FIX.md](./DUPLICATE-TRANSFER-FIX.md)
- **Previous Fix:** [STRIPE-TRANSFER-FIX-AND-HEARTBEAT-MONITORING.md](./STRIPE-TRANSFER-FIX-AND-HEARTBEAT-MONITORING.md)

---

## 🎓 Key Concepts

### PaymentIntent vs Charge vs Transfer

```
PaymentIntent (pi_xxx)
  ↓ creates
Charge (ch_xxx or py_xxx)
  ↓ funds
Transfer (tr_xxx)
  ↓ goes to
Connect Account (acct_xxx)
  ↓ creates
Payout (po_xxx)
  ↓ arrives at
Bank Account
```

### Transfer States in Our System

```
PENDING     → Waiting for scheduled time
READY       → Ready to process (payment confirmed)
APPROVED    → Manually approved by admin
COMPLETED   → Stripe transfer created successfully
FAILED      → Failed after max retries
PAID_OUT    → Payout created to bank account
```

### Automatic vs Manual Transfers

**Automatic (via transfer_data.destination):**

- Stripe creates transfer when charge succeeds
- No API call from our system needed
- Transfer ID not immediately available
- Requires syncing to get transfer ID

**Manual (via stripe.transfers.create):**

- We explicitly create the transfer
- Full control over timing
- Immediate transfer ID in response
- Requires active API call

---

**Questions?** Check the full analysis or reach out to the dev team.
