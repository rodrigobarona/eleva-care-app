/**
 * Archive Old Stripe Products
 *
 * Deactivates prices first, then deactivates products.
 * Run with: bun scripts/utilities/archive-stripe-products.ts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: (process.env.STRIPE_API_VERSION || '2025-09-30.clover') as Stripe.LatestApiVersion,
  typescript: true,
});

const PRODUCTS_TO_ARCHIVE = [
  'prod_TNHmsNWSOqt7M3', // Community Expert Annual Subscription (USD)
  'prod_TNHnHt7MHvboaP', // Top Expert Annual Subscription (USD)
  'prod_TNHnIkS4cWC4MW', // Lecturer Module Annual Add-on (USD)
  'prod_TlHtgiGy3IF4Qz', // WBHB - Renda BB (test)
  'prod_SNx1Y2aPKBmkde', // teste meeting (test)
];

interface ArchiveResult {
  productId: string;
  productName: string;
  pricesDeactivated: number;
  productDeactivated: boolean;
  errors: string[];
}

async function archiveProducts(): Promise<ArchiveResult[]> {
  const results: ArchiveResult[] = [];

  for (const productId of PRODUCTS_TO_ARCHIVE) {
    const result: ArchiveResult = {
      productId,
      productName: '',
      pricesDeactivated: 0,
      productDeactivated: false,
      errors: [],
    };

    try {
      const product = await stripe.products.retrieve(productId);
      result.productName = product.name;

      const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
      const activePrices = prices.data;

      for (const price of activePrices) {
        try {
          await stripe.prices.update(price.id, { active: false });
          result.pricesDeactivated++;
          console.log(`   Deactivated price: ${price.id}`);
        } catch (err) {
          result.errors.push(`Price ${price.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (activePrices.length === 0) {
        const allPrices = await stripe.prices.list({ product: productId, limit: 100 });
        for (const price of allPrices.data) {
          if (price.active) {
            try {
              await stripe.prices.update(price.id, { active: false });
              result.pricesDeactivated++;
              console.log(`   Deactivated price: ${price.id}`);
            } catch (err) {
              result.errors.push(`Price ${price.id}: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }
      }

      if (product.active) {
        await stripe.products.update(productId, { active: false });
        result.productDeactivated = true;
        console.log(`   Deactivated product: ${productId}`);
      } else {
        result.productDeactivated = true;
        console.log(`   Product already inactive: ${productId}`);
      }
    } catch (err) {
      result.errors.push(`Product: ${err instanceof Error ? err.message : String(err)}`);
    }

    results.push(result);
    console.log(`✅ ${productId}: ${result.pricesDeactivated} prices, product ${result.productDeactivated ? 'archived' : 'skipped'}\n`);
  }

  return results;
}

archiveProducts()
  .then((results) => {
    console.log('\n' + '='.repeat(60));
    console.log('Archive Summary');
    console.log('='.repeat(60));
    results.forEach((r) => {
      console.log(`${r.productId} (${r.productName}): ${r.pricesDeactivated} prices deactivated, product ${r.productDeactivated ? 'archived' : 'N/A'}`);
      if (r.errors.length) console.log('  Errors:', r.errors);
    });
  })
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  });
