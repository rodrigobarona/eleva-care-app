#!/usr/bin/env tsx
/**
 * One-time script to compensate experts for incorrect tax withholding reversals.
 *
 * The `withholdTaxFromTransfer()` function was incorrectly reversing tax amounts
 * from expert transfers. This script finds all affected transfers and creates
 * compensating transfers to make experts whole.
 *
 * Usage:
 *   pnpm tsx scripts/fix-tax-reversal-compensation.ts              # Dry run (list affected)
 *   pnpm tsx scripts/fix-tax-reversal-compensation.ts --execute     # Actually create compensating transfers
 */
import 'dotenv/config';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);
const EXECUTE = process.argv.includes('--execute');

interface AffectedTransfer {
  transferId: string;
  destination: string;
  originalAmount: number;
  reversalAmount: number;
  reversalId: string;
  reversalDescription: string;
  currency: string;
  created: Date;
}

async function findAffectedTransfers(): Promise<AffectedTransfer[]> {
  const affected: AffectedTransfer[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;
  let transferCount = 0;

  console.log('Scanning transfers for partial reversals (tax withholding bug)...\n');

  while (hasMore) {
    const transfers = await stripe.transfers.list({
      limit: 100,
      ...(startingAfter && { starting_after: startingAfter }),
    });

    transferCount += transfers.data.length;

    for (const transfer of transfers.data) {
      // amount_reversed > 0 catches partial reversals (reversed=true only for FULL reversals)
      const amountReversed = (transfer as any).amount_reversed ?? 0;
      if (amountReversed <= 0) continue;

      const isPartialReversal = amountReversed < transfer.amount;

      const reversals = await stripe.transfers.listReversals(transfer.id, {
        limit: 100,
      });

      const destination =
        typeof transfer.destination === 'string'
          ? transfer.destination
          : (transfer.destination?.id ?? 'unknown');

      for (const reversal of reversals.data) {
        // Partial reversals = tax withholding bug (only code that used createReversal)
        // Full reversals = legitimate refunds, skip them
        if (isPartialReversal && reversal.amount < transfer.amount) {
          console.log(
            `  AFFECTED: ${transfer.id} | EUR ${(reversal.amount / 100).toFixed(2)} reversed from EUR ${(transfer.amount / 100).toFixed(2)} | dest: ${destination} | ${new Date(transfer.created * 1000).toISOString().split('T')[0]}`,
          );

          affected.push({
            transferId: transfer.id,
            destination,
            originalAmount: transfer.amount,
            reversalAmount: reversal.amount,
            reversalId: reversal.id,
            reversalDescription: 'Tax withholding (partial reversal)',
            currency: transfer.currency,
            created: new Date(transfer.created * 1000),
          });
        } else {
          console.log(
            `  Skipping full reversal on ${transfer.id}: EUR ${(reversal.amount / 100).toFixed(2)} of EUR ${(transfer.amount / 100).toFixed(2)} | dest: ${destination}`,
          );
        }
      }
    }

    hasMore = transfers.has_more;
    if (transfers.data.length > 0) {
      startingAfter = transfers.data[transfers.data.length - 1].id;
    }
  }

  console.log(`\nScanned ${transferCount} transfers total.`);

  return affected;
}

async function compensateTransfer(transfer: AffectedTransfer): Promise<string> {
  const compensation = await stripe.transfers.create({
    amount: transfer.reversalAmount,
    currency: transfer.currency,
    destination: transfer.destination,
    description: `Compensation: incorrect tax withholding reversal on ${transfer.transferId}`,
    metadata: {
      type: 'tax_reversal_compensation',
      originalTransferId: transfer.transferId,
      originalReversalId: transfer.reversalId,
      originalReversalAmount: transfer.reversalAmount.toString(),
    },
  });

  return compensation.id;
}

async function main() {
  console.log('=== Tax Withholding Reversal Compensation Script ===');
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (will create transfers)' : 'DRY RUN (read-only)'}`);

  // Diagnostic: check Stripe connectivity and known transfer
  try {
    const knownTransferId = 'tr_3TGzPRK5Ap4Um3Sp1Hxump0j';
    console.log(`\nDiagnostic: retrieving known transfer ${knownTransferId}...`);
    const transfer = await stripe.transfers.retrieve(knownTransferId);
    console.log(
      `  Found: EUR ${(transfer.amount / 100).toFixed(2)} | reversed: ${transfer.reversed} | dest: ${typeof transfer.destination === 'string' ? transfer.destination : transfer.destination?.id}`,
    );
    const reversals = await stripe.transfers.listReversals(knownTransferId);
    console.log(`  Reversals: ${reversals.data.length}`);
    for (const r of reversals.data) {
      console.log(`    - ${r.id}: EUR ${(r.amount / 100).toFixed(2)} | "${r.description}"`);
    }
  } catch (error) {
    console.log(
      `  Could not retrieve known transfer: ${error instanceof Error ? error.message : error}`,
    );
    console.log('  This might mean you are using a test key but transfers are in live mode.\n');
  }
  console.log();

  const affected = await findAffectedTransfers();

  if (affected.length === 0) {
    console.log('No affected transfers found.');
    return;
  }

  const byAccount = new Map<string, AffectedTransfer[]>();
  for (const t of affected) {
    const existing = byAccount.get(t.destination) ?? [];
    existing.push(t);
    byAccount.set(t.destination, existing);
  }

  let totalCompensation = 0;

  for (const [accountId, transfers] of byAccount) {
    const accountTotal = transfers.reduce((sum, t) => sum + t.reversalAmount, 0);
    totalCompensation += accountTotal;

    console.log(`\nConnected Account: ${accountId}`);
    console.log(`  Affected transfers: ${transfers.length}`);
    console.log(`  Total owed: EUR ${(accountTotal / 100).toFixed(2)}`);

    for (const t of transfers) {
      console.log(
        `    - ${t.transferId} | ${t.created.toISOString().split('T')[0]} | ` +
          `original: EUR ${(t.originalAmount / 100).toFixed(2)} | ` +
          `reversal: EUR ${(t.reversalAmount / 100).toFixed(2)} | ` +
          `${t.reversalDescription}`,
      );

      if (EXECUTE) {
        try {
          const compensationId = await compensateTransfer(t);
          console.log(`      -> Compensated: ${compensationId}`);
        } catch (error) {
          console.error(`      -> FAILED: ${error instanceof Error ? error.message : error}`);
        }
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Total affected transfers: ${affected.length}`);
  console.log(`Total compensation: EUR ${(totalCompensation / 100).toFixed(2)}`);
  console.log(`Accounts affected: ${byAccount.size}`);

  if (!EXECUTE) {
    console.log('\nThis was a DRY RUN. To actually create compensating transfers, run:');
    console.log('  pnpm tsx scripts/fix-tax-reversal-compensation.ts --execute');
  } else {
    console.log('\nAll compensating transfers have been created.');
  }
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
