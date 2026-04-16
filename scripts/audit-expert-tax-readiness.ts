#!/usr/bin/env tsx
/**
 * Stripe Connect / tax readiness audit for active experts.
 *
 * STATUS:
 *   Informational only. The "Expert-as-merchant + Stripe Tax" model (B2 in
 *   the Stripe best-practices audit) was reverted because Eleva's experts
 *   are licensed PT health professionals whose services are objectively
 *   exempt under Art. 9º CIVA — Stripe Tax cannot represent that exemption,
 *   so we do NOT set `automatic_tax.liability` or `invoice_creation.issuer`
 *   on the expert's Connect account in `app/api/create-payment-intent` or
 *   `app/api/create-pack-checkout`. Experts issue Art. 9 fiscal invoices
 *   externally (Vendus / Moloni / AT portal).
 *
 *   Therefore this script is no longer a deploy gate. It is kept as a
 *   diagnostic for: (a) verifying Connect onboarding completeness, and
 *   (b) future re-enablement of Stripe Tax if our merchant mix ever shifts
 *   to non-Art. 9 sellers (coaches, consultants, normal IVA regime, etc.).
 *
 * What it checks per expert:
 *   1. Connect account is reachable
 *   2. Account is `details_submitted` and `charges_enabled`
 *   3. `tax.registrations.list` returns ≥ 1 active registration
 *   4. (Optional, with --customer-country=XX) at least one registration covers
 *      the given country
 *
 * Usage:
 *   pnpm tsx scripts/audit-expert-tax-readiness.ts
 *   pnpm tsx scripts/audit-expert-tax-readiness.ts --customer-country=PT
 *   pnpm tsx scripts/audit-expert-tax-readiness.ts --json > tax-audit.json
 */
import { neonConfig, Pool } from '@neondatabase/serverless';
import 'dotenv/config';
import { and, eq, isNotNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import Stripe from 'stripe';
import ws from 'ws';

import * as schema from '../drizzle/schema';
import { UserTable } from '../drizzle/schema';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// The current `DATABASE_URL` points at the WorkOS-migrated database, where
// columns use `workos_user_id`. The drizzle schema in this repo still maps to
// the legacy Clerk-era schema (`clerkUserId`), so this audit must run against
// the legacy database. Use `DATABASE_URL_LEGACY` if it is set, otherwise fall
// back to `DATABASE_URL` so the script also works for fresh checkouts.
const DATABASE_URL = process.env.DATABASE_URL_LEGACY || process.env.DATABASE_URL;

if (!STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error('DATABASE_URL_LEGACY (preferred) or DATABASE_URL environment variable is required');
  process.exit(1);
}
if (!process.env.DATABASE_URL_LEGACY) {
  console.warn(
    '⚠️  DATABASE_URL_LEGACY not set; falling back to DATABASE_URL. ' +
      'If that DB has been migrated to WorkOS columns, this script will fail with ' +
      '`column "clerkUserId" does not exist`.',
  );
}

neonConfig.webSocketConstructor = ws;

const stripe = new Stripe(STRIPE_SECRET_KEY);
const legacyPool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(legacyPool, { schema });

// Args
const args = process.argv.slice(2);
const customerCountryArg = args.find((a) => a.startsWith('--customer-country='));
const customerCountry = customerCountryArg ? customerCountryArg.split('=')[1].toUpperCase() : null;
const jsonMode = args.includes('--json');

interface ExpertReadinessRow {
  clerkUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  stripeConnectAccountId: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  taxRegistrations: Array<{
    id: string;
    country: string;
    countrySubdivision: string | null;
    type: string;
    status: string;
    activeFrom: string;
    expiresAt: string | null;
  }>;
  registrationCountries: string[];
  ready: boolean;
  blockers: string[];
}

async function audit(): Promise<ExpertReadinessRow[]> {
  // Active expert = Connect account exists, onboarding details submitted.
  // We deliberately do NOT require chargesEnabled here so we can flag
  // "almost-ready" experts who would also break Checkout.
  const experts = await db
    .select({
      clerkUserId: UserTable.clerkUserId,
      email: UserTable.email,
      firstName: UserTable.firstName,
      lastName: UserTable.lastName,
      country: UserTable.country,
      stripeConnectAccountId: UserTable.stripeConnectAccountId,
    })
    .from(UserTable)
    .where(
      and(
        isNotNull(UserTable.stripeConnectAccountId),
        eq(UserTable.stripeConnectDetailsSubmitted, true),
      ),
    );

  if (!jsonMode) {
    console.log(`\n📋 Auditing ${experts.length} active expert Connect accounts...\n`);
    if (customerCountry) {
      console.log(`   Required customer location coverage: ${customerCountry}\n`);
    } else {
      console.log(
        `   (no --customer-country supplied; only checking that ≥1 tax registration exists)\n`,
      );
    }
  }

  const rows: ExpertReadinessRow[] = [];

  for (const expert of experts) {
    const accountId = expert.stripeConnectAccountId!;
    const blockers: string[] = [];

    let detailsSubmitted = false;
    let chargesEnabled = false;
    let payoutsEnabled = false;
    let taxRegistrations: ExpertReadinessRow['taxRegistrations'] = [];

    try {
      const account = await stripe.accounts.retrieve(accountId);
      detailsSubmitted = account.details_submitted ?? false;
      chargesEnabled = account.charges_enabled ?? false;
      payoutsEnabled = account.payouts_enabled ?? false;

      if (!detailsSubmitted) blockers.push('Connect onboarding not finished');
      if (!chargesEnabled) blockers.push('charges_enabled=false');

      // tax.registrations is a Connect-account-scoped resource; pass
      // stripeAccount so we read the registrations *on the expert account*,
      // not on the platform.
      const regs = await stripe.tax.registrations.list(
        { limit: 100 },
        { stripeAccount: accountId },
      );

      taxRegistrations = regs.data.map((r) => ({
        id: r.id,
        country: r.country,
        // subdivision is type-specific; omit to keep this audit simple
        countrySubdivision: null,
        type: detectRegistrationType(r),
        status: r.status,
        activeFrom: new Date(r.active_from * 1000).toISOString(),
        expiresAt: r.expires_at ? new Date(r.expires_at * 1000).toISOString() : null,
      }));

      const activeRegs = taxRegistrations.filter((r) => r.status === 'active');
      if (activeRegs.length === 0) {
        blockers.push('No active tax.registration on Connect account');
      }

      if (customerCountry) {
        const covers = activeRegs.some((r) => r.country === customerCountry);
        if (!covers) {
          blockers.push(`No active tax.registration covers customer country ${customerCountry}`);
        }
      }
    } catch (err) {
      blockers.push(`Stripe API error: ${err instanceof Error ? err.message : String(err)}`);
    }

    rows.push({
      clerkUserId: expert.clerkUserId,
      email: expert.email,
      firstName: expert.firstName,
      lastName: expert.lastName,
      country: expert.country,
      stripeConnectAccountId: accountId,
      detailsSubmitted,
      chargesEnabled,
      payoutsEnabled,
      taxRegistrations,
      registrationCountries: Array.from(
        new Set(taxRegistrations.filter((r) => r.status === 'active').map((r) => r.country)),
      ).sort(),
      ready: blockers.length === 0,
      blockers,
    });
  }

  return rows;
}

function detectRegistrationType(r: Stripe.Tax.Registration): string {
  // country_options carries one nested object whose key is the local tax
  // type ("oss_union", "vat", "standard", "simplified", etc). Surface it.
  if (!r.country_options) return 'unknown';
  const keys = Object.keys(r.country_options);
  if (keys.length === 0) return 'unknown';
  const inner = (r.country_options as Record<string, unknown>)[keys[0]];
  if (inner && typeof inner === 'object' && 'type' in inner) {
    return `${keys[0]}/${(inner as { type: string }).type}`;
  }
  return keys[0];
}

async function main() {
  const rows = await audit();

  if (jsonMode) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  const ready = rows.filter((r) => r.ready);
  const blocked = rows.filter((r) => !r.ready);

  console.log('═'.repeat(80));
  console.log(`✅ READY:    ${ready.length}/${rows.length}`);
  console.log(`❌ BLOCKED:  ${blocked.length}/${rows.length}`);
  console.log('═'.repeat(80));
  console.log('');

  if (blocked.length > 0) {
    console.log('ℹ️  EXPERTS WITHOUT STRIPE TAX (informational only — checkout still works):\n');
    console.log(
      '    These would only become blocking if we ever re-enable `automatic_tax`\n' +
        '    + `invoice_creation` with `liability/issuer.type = account` on the\n' +
        '    Checkout Session. Today we deliberately keep both off (Art. 9 CIVA).\n',
    );
    for (const r of blocked) {
      const fullName = [r.firstName, r.lastName].filter(Boolean).join(' ') || '(no name)';
      console.log(`  • ${fullName} <${r.email ?? 'no-email'}>`);
      console.log(`      clerkUserId:        ${r.clerkUserId}`);
      console.log(`      connectAccountId:   ${r.stripeConnectAccountId}`);
      console.log(`      country (db):       ${r.country ?? 'unknown'}`);
      console.log(
        `      details_submitted=${r.detailsSubmitted}  charges_enabled=${r.chargesEnabled}  payouts_enabled=${r.payoutsEnabled}`,
      );
      console.log(
        `      registrations:      ${r.registrationCountries.length === 0 ? '(none)' : r.registrationCountries.join(', ')}`,
      );
      console.log(`      blockers:`);
      for (const b of r.blockers) console.log(`        - ${b}`);
      console.log('');
    }
  }

  if (ready.length > 0) {
    console.log('✅ READY EXPERTS (have ≥1 active registration):\n');
    for (const r of ready) {
      const fullName = [r.firstName, r.lastName].filter(Boolean).join(' ') || '(no name)';
      console.log(
        `  • ${fullName.padEnd(30)} ${r.stripeConnectAccountId}  →  registrations: ${r.registrationCountries.join(', ')}`,
      );
    }
    console.log('');
  }

  console.log('═'.repeat(80));
  console.log(`Done. Run with --json to get machine-readable output.`);
  // Always exit 0: this script is informational. It does NOT gate deploys
  // because we no longer require expert-side Stripe Tax (see file header).
}

main()
  .catch((err) => {
    console.error('Audit failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await legacyPool.end();
  });
