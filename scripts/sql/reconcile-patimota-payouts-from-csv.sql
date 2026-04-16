-- Reconcile payment_transfers (+ meetings) from Stripe payout export:
--   Patimota Transactions Payouts.csv
--
-- FINDINGS
--   Payout metadata `paymentTransferId` in the CSV maps to payment_transfers.id.
--   This file lists payouts for ids: 38, 41, 44, 45, 47, 48, 54, 55
--
--   Rows you reported as stuck (COMPLETED, payout_id null) were:
--     46, 49, 50, 51, 52, 53
--   None of those six ids appear in the CSV — this script does NOT fix them.
--   Export a wider payout report from Stripe or locate each row’s `tr_` / `pi_`
--   in the Connect account and add matching (id, po_...) lines to `payout_fix`.
--
--   CSV instant payout po_1TH3Y6… (€65.45) has empty metadata — not applied here.
--
-- Dry-run: comment out COMMIT and use ROLLBACK; then re-run with COMMIT after checks.

BEGIN;

WITH payout_fix (payment_transfer_id, payout_id) AS (
  VALUES
    (54, 'po_1TLdYVGbopiCXJgJQtBacs3J'),
    (55, 'po_1TLdYVGbopiCXJgJA1dET5P9'),
    (48, 'po_1TKBeAGbopiCXJgJwZEne4DY'),
    (38, 'po_1TJpAOGbopiCXJgJTsqfaUNt'),
    (44, 'po_1TJSglGbopiCXJgJOntyNfLq'),
    (41, 'po_1THHoxGbopiCXJgJWHu99T34'),
    (47, 'po_1TGYs6GbopiCXJgJB2pwZsZB'),
    (45, 'po_1TF6xtGbopiCXJgJmFWavRjD')
)
UPDATE payment_transfers pt
SET
  status = 'PAID_OUT',
  payout_id = f.payout_id,
  updated = now()
FROM payout_fix f
WHERE pt.id = f.payment_transfer_id
  AND pt.status = 'COMPLETED'
  AND pt.payout_id IS NULL;

WITH payout_fix (payment_transfer_id, payout_id) AS (
  VALUES
    (54, 'po_1TLdYVGbopiCXJgJQtBacs3J'),
    (55, 'po_1TLdYVGbopiCXJgJA1dET5P9'),
    (48, 'po_1TKBeAGbopiCXJgJwZEne4DY'),
    (38, 'po_1TJpAOGbopiCXJgJTsqfaUNt'),
    (44, 'po_1TJSglGbopiCXJgJOntyNfLq'),
    (41, 'po_1THHoxGbopiCXJgJWHu99T34'),
    (47, 'po_1TGYs6GbopiCXJgJB2pwZsZB'),
    (45, 'po_1TF6xtGbopiCXJgJmFWavRjD')
)
UPDATE meetings m
SET
  "stripe_payout_id" = f.payout_id,
  "updatedAt" = now()
FROM payout_fix f
JOIN payment_transfers pt ON pt.id = f.payment_transfer_id
WHERE m."stripePaymentIntentId" = pt.payment_intent_id
  AND m."stripe_payout_id" IS DISTINCT FROM f.payout_id;

COMMIT;
