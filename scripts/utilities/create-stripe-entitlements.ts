/**
 * Create Stripe Entitlement Features and Attach to Products
 *
 * One-time script to create entitlement features and attach them to products.
 * Uses Stripe Entitlements API for feature management.
 * Covers expert, lecturer, and team products.
 *
 * Usage:
 *   bun scripts/utilities/create-stripe-entitlements.ts
 *   bun scripts/utilities/create-stripe-entitlements.ts --dry-run
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables: .env.local first, then .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const envLocalPath = path.resolve(projectRoot, '.env.local');
const envPath = path.resolve(projectRoot, '.env');

// Load .env first (base), then .env.local (overrides for local dev)
dotenv.config({ path: envPath });
dotenv.config({ path: envLocalPath });
console.log(`Loaded env from: .env, .env.local`);

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Error: STRIPE_SECRET_KEY not found in .env.local or .env');
  console.error('Please ensure your env file contains STRIPE_SECRET_KEY');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
}

// Use API version from environment, with current default
const STRIPE_API_VERSION = (process.env.STRIPE_API_VERSION ||
  '2025-09-30.clover') as Stripe.LatestApiVersion;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
  typescript: true,
});

/** Feature definitions: lookup_key -> display name */
const FEATURE_DEFINITIONS: Record<string, string> = {
  unlimited_services: 'Unlimited Services',
  daily_payouts: 'Daily Payouts',
  advanced_analytics: 'Advanced Analytics',
  priority_support: 'Priority Support',
  featured_placement: 'Featured Placement',
  custom_branding: 'Custom Branding',
  group_sessions: 'Group Sessions',
  reduced_commission: 'Reduced Commission',
  lecturer_module: 'Lecturer Module',
  team_starter: 'Team Starter',
  team_professional: 'Team Professional',
  team_enterprise: 'Team Enterprise',
};

/** Product ID -> array of feature lookup_keys to attach */
const PRODUCT_FEATURES: Record<string, string[]> = {
  // Community Expert Subscription (paid) - gets reduced_commission
  'prod_U2zjeafnchNNNv': ['reduced_commission'],
  // Top Expert Subscription (paid) - gets all expert entitlements
  'prod_U2zjuGKxWGZH0U': [
    'unlimited_services',
    'daily_payouts',
    'advanced_analytics',
    'priority_support',
    'featured_placement',
    'custom_branding',
    'group_sessions',
    'reduced_commission',
  ],
  // Lecturer Module Add-on
  'prod_U2zjMjMtAXNLqo': ['lecturer_module'],
  // Community Expert Free - no entitlements (basic access via RBAC only)
  // Top Expert Free - gets all Top Expert entitlements EXCEPT reduced_commission
  'prod_U2zjHo23fEyxik': [
    'unlimited_services',
    'daily_payouts',
    'advanced_analytics',
    'priority_support',
    'featured_placement',
    'custom_branding',
    'group_sessions',
  ],
  // Team Starter
  'prod_U2zEf2kM2vrumY': ['team_starter'],
  // Team Professional
  'prod_U2zEWE9S9arlXH': ['team_professional', 'advanced_analytics', 'priority_support'],
  // Team Enterprise
  'prod_U2zFGcLqAfYuzp': ['team_enterprise', 'advanced_analytics', 'priority_support', 'custom_branding'],
};

/** Product ID -> display name for logging */
const PRODUCT_NAMES: Record<string, string> = {
  'prod_U2zjeafnchNNNv': 'Community Expert Subscription',
  'prod_U2zjuGKxWGZH0U': 'Top Expert Subscription',
  'prod_U2zjMjMtAXNLqo': 'Lecturer Module Add-on',
  'prod_U2zjHo23fEyxik': 'Top Expert Free',
  'prod_U2zEf2kM2vrumY': 'Team Starter',
  'prod_U2zEWE9S9arlXH': 'Team Professional',
  'prod_U2zFGcLqAfYuzp': 'Team Enterprise',
};

type FeatureResult = { success: boolean; lookupKey: string; featureId?: string; error?: string };
type AttachmentResult = { success: boolean; productId: string; featureId: string; error?: string };

async function getExistingFeatures(): Promise<Map<string, string>> {
  const features = new Map<string, string>();
  const list = await stripe.entitlements.features.list({ limit: 100 });
  for (const feature of list.data) {
    features.set(feature.lookup_key, feature.id);
  }
  // Paginate if needed
  let hasMore = list.has_more;
  let lastId = list.data[list.data.length - 1]?.id;
  while (hasMore && lastId) {
    const next = await stripe.entitlements.features.list({
      limit: 100,
      starting_after: lastId,
    });
    for (const feature of next.data) {
      features.set(feature.lookup_key, feature.id);
    }
    hasMore = next.has_more;
    lastId = next.data[next.data.length - 1]?.id;
  }
  return features;
}

async function getExistingProductFeatures(productId: string): Promise<Set<string>> {
  const attached = new Set<string>();
  let list = await stripe.products.listFeatures(productId, { limit: 100 });
  for (const pf of list.data) {
    const featId = typeof pf.entitlement_feature === 'string' ? pf.entitlement_feature : pf.entitlement_feature?.id;
    if (featId) attached.add(featId);
  }
  let hasMore = list.has_more;
  let lastId = list.data[list.data.length - 1]?.id;
  while (hasMore && lastId) {
    list = await stripe.products.listFeatures(productId, { limit: 100, starting_after: lastId });
    for (const pf of list.data) {
      const featId = typeof pf.entitlement_feature === 'string' ? pf.entitlement_feature : pf.entitlement_feature?.id;
      if (featId) attached.add(featId);
    }
    hasMore = list.has_more;
    lastId = list.data[list.data.length - 1]?.id;
  }
  return attached;
}

async function createFeatures(
  existingFeatures: Map<string, string>
): Promise<{ features: Map<string, string>; results: FeatureResult[] }> {
  const features = new Map(existingFeatures);
  const results: FeatureResult[] = [];

  for (const [lookupKey, name] of Object.entries(FEATURE_DEFINITIONS)) {
    const existingId = features.get(lookupKey);
    if (existingId) {
      console.log(`   ℹ️  Feature already exists: ${lookupKey} (${existingId})`);
      results.push({ success: true, lookupKey, featureId: existingId });
      continue;
    }

    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would create: ${lookupKey} → "${name}"`);
      results.push({ success: true, lookupKey });
      continue;
    }

    try {
      const feature = await stripe.entitlements.features.create({
        lookup_key: lookupKey,
        name,
      });
      features.set(lookupKey, feature.id);
      console.log(`   ✅ Created: ${lookupKey} (${feature.id})`);
      results.push({ success: true, lookupKey, featureId: feature.id });
    } catch (error) {
      const err = error as Stripe.errors.StripeError;
      const isDuplicate = err.code === 'resource_already_exists' || err.message?.includes('already exists');
      if (isDuplicate) {
        const list = await stripe.entitlements.features.list({ lookup_key: lookupKey, limit: 1 });
        const existing = list.data[0];
        if (existing) {
          features.set(lookupKey, existing.id);
          console.log(`   ℹ️  Feature already exists (caught): ${lookupKey} (${existing.id})`);
          results.push({ success: true, lookupKey, featureId: existing.id });
        } else {
          console.error(`   ❌ Error:`, err.message);
          results.push({ success: false, lookupKey, error: err.message });
        }
      } else {
        console.error(`   ❌ Error:`, err.message);
        results.push({ success: false, lookupKey, error: err.message });
      }
    }
  }

  return { features, results };
}

async function attachFeaturesToProducts(
  featureIdsByLookupKey: Map<string, string>
): Promise<AttachmentResult[]> {
  const results: AttachmentResult[] = [];

  for (const [productId, lookupKeys] of Object.entries(PRODUCT_FEATURES)) {
    const productName = PRODUCT_NAMES[productId] || productId;
    console.log(`\n📦 Product: ${productName} (${productId})`);

    let existingAttached: Set<string>;
    try {
      existingAttached = await getExistingProductFeatures(productId);
    } catch (error) {
      console.error(`   ❌ Failed to list features:`, (error as Error).message);
      for (const lk of lookupKeys) {
        const fid = featureIdsByLookupKey.get(lk);
        if (fid) results.push({ success: false, productId, featureId: fid, error: (error as Error).message });
      }
      continue;
    }

    for (const lookupKey of lookupKeys) {
      const featureId = featureIdsByLookupKey.get(lookupKey);
      if (!featureId) {
        if (DRY_RUN) {
          console.log(`   [DRY RUN] Would attach: ${lookupKey} (after feature creation)`);
          results.push({ success: true, productId, featureId: lookupKey });
        } else {
          console.log(`   ⚠️  Skipping ${lookupKey}: feature not found`);
          results.push({ success: false, productId, featureId: lookupKey, error: 'Feature not found' });
        }
        continue;
      }

      if (existingAttached.has(featureId)) {
        console.log(`   ℹ️  Already attached: ${lookupKey}`);
        results.push({ success: true, productId, featureId });
        continue;
      }

      if (DRY_RUN) {
        console.log(`   [DRY RUN] Would attach: ${lookupKey} (${featureId})`);
        results.push({ success: true, productId, featureId });
        continue;
      }

      try {
        await stripe.products.createFeature(productId, {
          entitlement_feature: featureId,
        });
        console.log(`   ✅ Attached: ${lookupKey}`);
        results.push({ success: true, productId, featureId });
      } catch (error) {
        const err = error as Stripe.errors.StripeError;
        const isDuplicate = err.code === 'resource_already_exists' || err.message?.includes('already exists');
        if (isDuplicate) {
          console.log(`   ℹ️  Already attached (caught): ${lookupKey}`);
          results.push({ success: true, productId, featureId });
        } else {
          console.error(`   ❌ Error attaching ${lookupKey}:`, err.message);
          results.push({ success: false, productId, featureId, error: err.message });
        }
      }
    }
  }

  return results;
}

async function main() {
  console.log('🔑 Creating Stripe Entitlement Features and Attaching to Products...\n');

  // Step 1: List existing features
  console.log('📋 Step 1: Fetching existing features...');
  const existingFeatures = await getExistingFeatures();
  console.log(`   Found ${existingFeatures.size} existing features\n`);

  // Step 2: Create features
  console.log('📋 Step 2: Creating features...');
  const { features: featureIdsByLookupKey, results: featureResults } = await createFeatures(
    existingFeatures
  );

  // Step 3: Attach to products
  console.log('\n📋 Step 3: Attaching features to products...');
  const attachmentResults = await attachFeaturesToProducts(featureIdsByLookupKey);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));

  const featureSuccess = featureResults.filter((r) => r.success).length;
  const featureFailed = featureResults.filter((r) => !r.success).length;
  console.log(`\nFeatures:`);
  console.log(`   ✅ Created/Already exist: ${featureSuccess}/${featureResults.length}`);
  if (featureFailed > 0) {
    console.log(`   ❌ Failed: ${featureFailed}`);
    featureResults.forEach((r) => {
      if (!r.success) console.log(`      - ${r.lookupKey}: ${r.error}`);
    });
  }

  const attachSuccess = attachmentResults.filter((r) => r.success).length;
  const attachFailed = attachmentResults.filter((r) => !r.success).length;
  console.log(`\nAttachments:`);
  console.log(`   ✅ Attached/Already attached: ${attachSuccess}/${attachmentResults.length}`);
  if (attachFailed > 0) {
    console.log(`   ❌ Failed: ${attachFailed}`);
    attachmentResults.forEach((r) => {
      if (!r.success) console.log(`      - ${r.productId} + ${r.featureId}: ${r.error}`);
    });
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN - No changes were made.');
    console.log('   Run without --dry-run to create features and attach them to products.');
  }

  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
