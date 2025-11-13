/**
 * Server Actions for Stripe Pricing Management
 *
 * Admin-only actions for managing Stripe products and prices
 */
'use server';

import { STRIPE_CONFIG } from '@/config/stripe';
import { isAdmin } from '@/lib/auth/roles.server';
import type {
  CreatePriceInput,
  PriceFilterInput,
  UpdatePriceInput,
} from '@/lib/validations/stripe-pricing';
import {
  createPriceSchema,
  priceFilterSchema,
  updatePriceSchema,
} from '@/lib/validations/stripe-pricing';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';

/**
 * Server Actions for Stripe Pricing Management
 *
 * Admin-only actions for managing Stripe products and prices
 */

// Initialize Stripe client with centralized API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
  typescript: true,
});

/**
 * List all Stripe products
 */
export async function listStripeProducts() {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    return { success: false, error: 'Unauthorized - Admin access required' };
  }

  try {
    const products = await stripe.products.list({
      limit: 100,
      active: true,
      expand: ['data.default_price'],
    });

    return {
      success: true,
      data: products.data,
    };
  } catch (error) {
    console.error('Error listing Stripe products:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list products',
    };
  }
}

/**
 * List Stripe prices with filtering
 */
export async function listStripePrices(filters?: PriceFilterInput) {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    return { success: false, error: 'Unauthorized - Admin access required' };
  }

  try {
    // Validate filters
    const validatedFilters = filters ? priceFilterSchema.parse(filters) : { limit: 100 };

    const params: Stripe.PriceListParams = {
      limit: validatedFilters.limit,
      expand: ['data.product'],
    };

    if (validatedFilters.productId) {
      params.product = validatedFilters.productId;
    }

    if (validatedFilters.active !== undefined) {
      params.active = validatedFilters.active;
    }

    if (validatedFilters.currency) {
      params.currency = validatedFilters.currency;
    }

    if (validatedFilters.recurring !== undefined) {
      params.type = validatedFilters.recurring ? 'recurring' : 'one_time';
    }

    const prices = await stripe.prices.list(params);

    // Filter by metadata if provided
    let filteredPrices = prices.data;

    if (validatedFilters.tier) {
      filteredPrices = filteredPrices.filter(
        (price) => price.metadata.tier === validatedFilters.tier,
      );
    }

    if (validatedFilters.planType) {
      filteredPrices = filteredPrices.filter(
        (price) => price.metadata.planType === validatedFilters.planType,
      );
    }

    return {
      success: true,
      data: filteredPrices,
      hasMore: prices.has_more,
    };
  } catch (error) {
    console.error('Error listing Stripe prices:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list prices',
    };
  }
}

/**
 * Create a new Stripe price
 */
export async function createStripePrice(input: CreatePriceInput) {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    return { success: false, error: 'Unauthorized - Admin access required' };
  }

  try {
    // Validate input
    const validatedInput = createPriceSchema.parse(input);

    // Build metadata
    const metadata: Record<string, string> = {};

    if (validatedInput.tier) {
      metadata.tier = validatedInput.tier;
    }

    if (validatedInput.planType) {
      metadata.planType = validatedInput.planType;
    }

    if (validatedInput.commissionRate !== undefined) {
      metadata.commissionRate = validatedInput.commissionRate.toString();
    }

    // Create price in Stripe
    const priceParams: Stripe.PriceCreateParams = {
      product: validatedInput.productId,
      unit_amount: validatedInput.unitAmount,
      currency: validatedInput.currency,
      nickname: validatedInput.nickname,
      active: validatedInput.active,
      metadata,
    };

    if (validatedInput.recurring) {
      priceParams.recurring = {
        interval: validatedInput.recurring.interval,
        interval_count: validatedInput.recurring.intervalCount,
      };
    }

    if (validatedInput.lookupKey) {
      priceParams.lookup_key = validatedInput.lookupKey;
    }

    const price = await stripe.prices.create(priceParams);

    // Revalidate admin pages
    revalidatePath('/admin/subscriptions');

    return {
      success: true,
      data: price,
      message: `Price created successfully: ${price.id}`,
    };
  } catch (error) {
    console.error('Error creating Stripe price:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create price',
    };
  }
}

/**
 * Update a Stripe price (limited fields)
 */
export async function updateStripePrice(input: UpdatePriceInput) {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    return { success: false, error: 'Unauthorized - Admin access required' };
  }

  try {
    // Validate input
    const validatedInput = updatePriceSchema.parse(input);

    const updateParams: Stripe.PriceUpdateParams = {};

    if (validatedInput.active !== undefined) {
      updateParams.active = validatedInput.active;
    }

    if (validatedInput.nickname) {
      updateParams.nickname = validatedInput.nickname;
    }

    if (validatedInput.lookupKey) {
      updateParams.lookup_key = validatedInput.lookupKey;
    }

    if (validatedInput.metadata) {
      updateParams.metadata = validatedInput.metadata;
    }

    const price = await stripe.prices.update(validatedInput.priceId, updateParams);

    // Revalidate admin pages
    revalidatePath('/admin/subscriptions');

    return {
      success: true,
      data: price,
      message: `Price updated successfully: ${price.id}`,
    };
  } catch (error) {
    console.error('Error updating Stripe price:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update price',
    };
  }
}

/**
 * Archive a Stripe price (set active = false)
 */
export async function archiveStripePrice(priceId: string) {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    return { success: false, error: 'Unauthorized - Admin access required' };
  }

  try {
    if (!priceId || !priceId.startsWith('price_')) {
      return { success: false, error: 'Invalid price ID' };
    }

    const price = await stripe.prices.update(priceId, {
      active: false,
    });

    // Revalidate admin pages
    revalidatePath('/admin/subscriptions');

    return {
      success: true,
      data: price,
      message: `Price archived successfully: ${priceId}`,
    };
  } catch (error) {
    console.error('Error archiving Stripe price:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive price',
    };
  }
}

/**
 * Activate a Stripe price (set active = true)
 */
export async function activateStripePrice(priceId: string) {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    return { success: false, error: 'Unauthorized - Admin access required' };
  }

  try {
    if (!priceId || !priceId.startsWith('price_')) {
      return { success: false, error: 'Invalid price ID' };
    }

    const price = await stripe.prices.update(priceId, {
      active: true,
    });

    // Revalidate admin pages
    revalidatePath('/admin/subscriptions');

    return {
      success: true,
      data: price,
      message: `Price activated successfully: ${priceId}`,
    };
  } catch (error) {
    console.error('Error activating Stripe price:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to activate price',
    };
  }
}
