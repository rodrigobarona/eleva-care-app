-- Mark six payment_transfers as paid out when Stripe already paid the bank but
-- payout_id was never written (manual ops / cron gap).
--
-- Rows: 46, 49, 50, 51, 52, 53
-- payout_id uses a UNIQUE per-row sentinel (not a real po_…); replace with the
-- real Stripe payout id from the Dashboard when you have it.
--
-- meetings."stripe_payout_id" is UNIQUE — one distinct value per meeting row.

BEGIN;

UPDATE payment_transfers
SET
  status = 'PAID_OUT',
  payout_id = 'legacy_manual_sync:' || id::text,
  updated = now()
WHERE id IN (46, 49, 50, 51, 52, 53)
  AND status = 'COMPLETED';

UPDATE meetings m
SET
  "stripe_payout_id" = 'legacy_manual_sync:' || pt.id::text,
  "updatedAt" = now()
FROM payment_transfers pt
WHERE pt.id IN (46, 49, 50, 51, 52, 53)
  AND m."stripePaymentIntentId" = pt.payment_intent_id
  AND m."stripe_payout_id" IS DISTINCT FROM ('legacy_manual_sync:' || pt.id::text);

COMMIT;
