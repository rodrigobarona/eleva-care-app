/**
 * Eleva Subscription Pricing Configuration
 *
 * Defines pricing tiers, commission rates, and eligibility criteria
 * for both commission-based and annual subscription models.
 *
 * @see docs/.cursor/plans/optimized-pricing-model.plan.md
 * @see docs/02-core-systems/ROLE-PROGRESSION-SYSTEM.md
 */

export type PlanType = 'commission' | 'annual';
export type TierLevel = 'community' | 'top';

export interface PricingPlan {
  tier: TierLevel;
  planType: PlanType;
  monthlyFee: number; // in cents
  annualFee?: number; // in cents (for annual plans)
  monthlyEquivalent?: number; // in cents (for annual plans)
  commissionRate: number; // decimal (e.g., 0.20 for 20%)
  commissionDiscount?: number; // decimal (e.g., 0.08 for 8% reduction)
  stripePriceId?: string;
  breakEvenMonthlyRevenue?: number; // in dollars
  features: string[];
  limits: {
    maxServices: number; // -1 for unlimited
    payoutFrequency: 'daily' | 'weekly';
  };
  trialDays?: number;
  commitmentMonths?: number;
}

export interface AddonPricing {
  name: string;
  monthlyFee?: number; // in cents
  annualFee?: number; // in cents
  commissionRate: number; // decimal
  stripePriceId?: string;
  breakEvenAnnualSales?: number; // in dollars
}

export interface EligibilityCriteria {
  minMonthsActive: number;
  minAvgMonthlyRevenue: number; // in cents
  minCompletedAppointments: number;
  minRating: number;
}

/**
 * Optimized Subscription Pricing Configuration
 * Commission rates: 20% Community, 15% Top Expert
 * Annual subscriptions: $490/$1,490 with reduced commission (12%/8%)
 */
export const SUBSCRIPTION_PRICING = {
  commission_based: {
    community_expert: {
      tier: 'community' as const,
      planType: 'commission' as const,
      monthlyFee: 0,
      commissionRate: 0.2, // 20% - Updated from 15%
      features: [
        'List up to 5 services',
        'Basic calendar integration',
        'Standard analytics',
        'Weekly payouts',
        'Email support',
        'Community forum',
        'Pay only 20% commission',
        'No monthly fees',
      ],
      limits: {
        maxServices: 5,
        payoutFrequency: 'weekly' as const,
      },
      trialDays: 30,
    },
    top_expert: {
      tier: 'top' as const,
      planType: 'commission' as const,
      monthlyFee: 0,
      commissionRate: 0.15, // 15% - Kept at current rate
      features: [
        'All Community Expert features',
        'Unlimited services',
        'Advanced analytics',
        'Priority support',
        'Featured placement',
        'Daily payout option',
        'Custom branding',
        'Group sessions',
        'Direct messaging',
        'Pay only 15% commission',
        'No monthly fees',
      ],
      limits: {
        maxServices: -1, // unlimited
        payoutFrequency: 'daily' as const,
      },
    },
  },

  annual_subscription: {
    community_expert: {
      tier: 'community' as const,
      planType: 'annual' as const,
      monthlyFee: 0,
      annualFee: 49000, // $490/year - Updated from $290
      monthlyEquivalent: 4083, // $40.83/month
      commissionRate: 0.12, // 12% - Updated from 8%
      commissionDiscount: 0.08, // 8% reduction (from 20% to 12%)
      stripePriceId: process.env.STRIPE_PRICE_COMMUNITY_ANNUAL!,
      breakEvenMonthlyRevenue: 510, // $510/month - Updated break-even
      features: [
        'List up to 5 services',
        'Basic calendar integration',
        'Standard analytics',
        'Weekly payouts',
        'Email support',
        'Community forum',
        '✨ Commission reduced to 12% (was 20%)',
        '✨ Save up to 40% on total costs',
        '✨ Predictable annual fee',
        '✨ Priority annual subscriber support',
      ],
      limits: {
        maxServices: 5,
        payoutFrequency: 'weekly' as const,
      },
      commitmentMonths: 12,
    },
    top_expert: {
      tier: 'top' as const,
      planType: 'annual' as const,
      monthlyFee: 0,
      annualFee: 149000, // $1,490/year - Updated from $990
      monthlyEquivalent: 12417, // $124.17/month
      commissionRate: 0.08, // 8% - Updated from 5%
      commissionDiscount: 0.07, // 7% reduction (from 15% to 8%)
      stripePriceId: process.env.STRIPE_PRICE_TOP_ANNUAL!,
      breakEvenMonthlyRevenue: 1774, // $1,774/month - Updated break-even
      features: [
        'All Top Expert features',
        'Unlimited services',
        'Advanced analytics',
        'Priority support',
        'Featured placement',
        'Daily payout option',
        'Custom branding',
        'Group sessions',
        'Direct messaging',
        '✨ Commission reduced to 8% (was 15%)',
        '✨ Save up to 40% on total costs',
        '✨ Industry-leading low commission',
        '✨ VIP annual subscriber benefits',
      ],
      limits: {
        maxServices: -1,
        payoutFrequency: 'daily' as const,
      },
      commitmentMonths: 12,
    },
  },

  addons: {
    lecturer_commission: {
      name: 'Lecturer Module (Commission)',
      monthlyFee: 0,
      commissionRate: 0.05, // 5% on course sales
    },
    lecturer_annual: {
      name: 'Lecturer Module (Annual)',
      annualFee: 49000, // $490/year
      commissionRate: 0.03, // 3% on course sales
      stripePriceId: process.env.STRIPE_PRICE_LECTURER_ADDON_ANNUAL!,
      breakEvenAnnualSales: 14000, // $14,000 in course sales
    },
  },

  eligibility: {
    community_expert: {
      minMonthsActive: 3,
      minAvgMonthlyRevenue: 51000, // $510 in cents - Updated break-even
      minCompletedAppointments: 15,
      minRating: 4.0,
    },
    top_expert: {
      minMonthsActive: 3,
      minAvgMonthlyRevenue: 177400, // $1,774 in cents - Updated break-even
      minCompletedAppointments: 50,
      minRating: 4.5,
    },
  },
} as const;

/**
 * Helper functions for pricing calculations
 */

/**
 * Calculate commission amount for a transaction
 */
export function calculateCommission(grossAmount: number, commissionRate: number): number {
  return Math.round(grossAmount * commissionRate);
}

/**
 * Calculate net amount after commission
 */
export function calculateNetAmount(grossAmount: number, commissionRate: number): number {
  const commission = calculateCommission(grossAmount, commissionRate);
  return grossAmount - commission;
}

/**
 * Calculate annual cost for commission-based plan
 */
export function calculateAnnualCommissionCost(
  monthlyRevenue: number,
  commissionRate: number,
): number {
  return monthlyRevenue * 12 * commissionRate;
}

/**
 * Calculate annual cost for subscription plan
 */
export function calculateAnnualSubscriptionCost(
  monthlyRevenue: number,
  annualFee: number,
  commissionRate: number,
): number {
  const annualCommissions = monthlyRevenue * 12 * commissionRate;
  return annualFee / 100 + annualCommissions; // Convert cents to dollars
}

/**
 * Calculate savings between commission and annual plans
 */
export function calculateAnnualSavings(
  monthlyRevenue: number,
  commissionRate: number,
  annualFee: number,
  annualCommissionRate: number,
): {
  commissionCost: number;
  annualCost: number;
  savings: number;
  savingsPercentage: number;
} {
  const commissionCost = calculateAnnualCommissionCost(monthlyRevenue, commissionRate);
  const annualCost = calculateAnnualSubscriptionCost(
    monthlyRevenue,
    annualFee,
    annualCommissionRate,
  );
  const savings = commissionCost - annualCost;
  const savingsPercentage = (savings / commissionCost) * 100;

  return {
    commissionCost,
    annualCost,
    savings,
    savingsPercentage,
  };
}

/**
 * Check if expert is eligible for annual plan upgrade
 */
export function checkAnnualEligibility(
  tier: TierLevel,
  avgMonthlyRevenue: number, // in cents
  monthsActive: number,
  completedAppointments: number,
  rating: number,
): {
  eligible: boolean;
  criteria: EligibilityCriteria;
  failedCriteria?: string[];
} {
  const criteria = SUBSCRIPTION_PRICING.eligibility[tier];
  const failedCriteria: string[] = [];

  if (monthsActive < criteria.minMonthsActive) {
    failedCriteria.push(`Need ${criteria.minMonthsActive} months active (have ${monthsActive})`);
  }

  if (avgMonthlyRevenue < criteria.minAvgMonthlyRevenue) {
    failedCriteria.push(
      `Need $${criteria.minAvgMonthlyRevenue / 100}/month avg revenue (have $${avgMonthlyRevenue / 100})`,
    );
  }

  if (completedAppointments < criteria.minCompletedAppointments) {
    failedCriteria.push(
      `Need ${criteria.minCompletedAppointments} completed appointments (have ${completedAppointments})`,
    );
  }

  if (rating < criteria.minRating) {
    failedCriteria.push(`Need ${criteria.minRating}+ rating (have ${rating})`);
  }

  return {
    eligible: failedCriteria.length === 0,
    criteria,
    failedCriteria: failedCriteria.length > 0 ? failedCriteria : undefined,
  };
}

/**
 * Get pricing plan by tier and plan type
 */
export function getPricingPlan(tier: TierLevel, planType: PlanType): PricingPlan {
  if (planType === 'commission') {
    return SUBSCRIPTION_PRICING.commission_based[`${tier}_expert`];
  } else {
    return SUBSCRIPTION_PRICING.annual_subscription[`${tier}_expert`];
  }
}

/**
 * Type exports for use in the application
 */
export type SubscriptionPricing = typeof SUBSCRIPTION_PRICING;
export type CommissionBasedPlan = typeof SUBSCRIPTION_PRICING.commission_based;
export type AnnualSubscriptionPlan = typeof SUBSCRIPTION_PRICING.annual_subscription;
export type Addons = typeof SUBSCRIPTION_PRICING.addons;
export type EligibilityConfig = typeof SUBSCRIPTION_PRICING.eligibility;
