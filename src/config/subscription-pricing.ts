/**
 * Eleva Subscription Pricing Configuration
 *
 * Defines pricing tiers, commission rates, and eligibility criteria
 * for the Eleva expert platform pricing model.
 *
 * All amounts are in EUR (euros).
 *
 * 🏗️ BUSINESS MODEL ARCHITECTURE:
 *
 * 1️⃣ SOLO EXPERTS (Current - Phase 1):
 *    Each expert has their own organization (type: 'expert_individual')
 *    with a subscription that matches their expert level.
 *
 *    Community Expert:
 *      • Commission-only: 20% per booking
 *      • Monthly (€49/mo): 12% commission (40% savings)
 *      • Annual (€490/yr): 12% commission (40% savings)
 *
 *    Top Expert:
 *      • Commission-only: 15% per booking
 *      • Monthly (€155/mo): 8% commission (47% savings)
 *      • Annual (€1,490/yr): 8% commission (47% savings)
 *
 * 2️⃣ TEAMS (Future - Phase 2):
 *    Multi-expert organizations (type: 'team') where each expert
 *    maintains their individual commission rate based on their role.
 *
 *    Example:
 *      Team Organization (€99/month team fee)
 *        ├─ Dr. Maria (expert_top) → 8% commission on her bookings
 *        ├─ Dr. João (expert_community) → 12% on his bookings
 *        └─ Dr. Ana (expert_community) → 12% on her bookings
 *
 *    💡 Per-expert rates ensure:
 *       - Fair compensation (top experts earned their benefits)
 *       - Talent retention (experts keep benefits in teams)
 *       - Growth incentive (community → top progression)
 *
 * 🎯 COMMISSION CALCULATION:
 *    Commission Rate = f(Expert Role, Plan Type)
 *    Always based on the INDIVIDUAL expert's role, never the org subscription.
 *
 * @see docs/.cursor/plans/SUBSCRIPTION-PRICING-MASTER.md
 * @see docs/02-core-systems/ROLE-PROGRESSION-SYSTEM.md
 * @see drizzle/schema.ts - OrganizationType documentation
 */

export type PlanType = 'commission' | 'monthly' | 'annual' | 'team';
export type TierLevel = 'community' | 'top' | 'starter' | 'professional' | 'enterprise';
export type BillingInterval = 'month' | 'year';

export interface PricingPlan {
  tier: TierLevel;
  planType: PlanType;
  monthlyFee: number; // in cents
  annualFee?: number; // in cents (for annual plans)
  monthlyEquivalent?: number; // in cents (for annual plans)
  commissionRate: number; // decimal (e.g., 0.20 for 20%)
  commissionDiscount?: number; // decimal (e.g., 0.08 for 8% reduction)
  stripePriceId?: string;
  stripeLookupKey?: string;
  breakEvenMonthlyRevenue?: number; // in EUR
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
  stripeLookupKey?: string;
  breakEvenAnnualSales?: number; // in EUR
}

export interface EligibilityCriteria {
  minMonthsActive: number;
  minAvgMonthlyRevenue: number; // in cents
  minCompletedAppointments: number;
  minRating: number;
}

/**
 * Optimized Subscription Pricing Configuration (EUR)
 * Commission rates: 20% Community, 15% Top Expert
 * Annual subscriptions: €490/€1,490 with reduced commission (12%/8%)
 */
export const SUBSCRIPTION_PRICING = {
  commission_based: {
    community_expert: {
      tier: 'community' as const,
      planType: 'commission' as const,
      monthlyFee: 0,
      commissionRate: 0.2, // 20% - Updated from 15%
      stripeLookupKey: 'community-expert-invite',
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
      stripeLookupKey: 'top-expert-invite',
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

  monthly_subscription: {
    community_expert: {
      tier: 'community' as const,
      planType: 'monthly' as const,
      monthlyFee: 4900, // €49/month (€588/year total)
      commissionRate: 0.12, // 12% commission
      commissionDiscount: 0.08, // 8% reduction (from 20% to 12%)
      stripePriceId: process.env.STRIPE_PRICE_COMMUNITY_MONTHLY,
      stripeLookupKey: 'community-expert-monthly',
      breakEvenMonthlyRevenue: 510, // €510/month
      features: [
        'List up to 5 services',
        'Basic calendar integration',
        'Standard analytics',
        'Weekly payouts',
        'Email support',
        'Community forum',
        '✨ Commission reduced to 12% (was 20%)',
        '✨ Cancel anytime flexibility',
        '✨ Low monthly commitment (€49/mo)',
        '✨ Save vs annual: €98/year with annual plan',
      ],
      limits: {
        maxServices: 5,
        payoutFrequency: 'weekly' as const,
      },
    },
    top_expert: {
      tier: 'top' as const,
      planType: 'monthly' as const,
      monthlyFee: 15500, // €155/month (€1,860/year total)
      commissionRate: 0.08, // 8% commission
      commissionDiscount: 0.07, // 7% reduction (from 15% to 8%)
      stripePriceId: process.env.STRIPE_PRICE_TOP_MONTHLY,
      stripeLookupKey: 'top-expert-monthly',
      breakEvenMonthlyRevenue: 1774, // €1,774/month
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
        '✨ Cancel anytime flexibility',
        '✨ Save vs annual: €370/year with annual plan',
        '✨ VIP subscriber benefits',
      ],
      limits: {
        maxServices: -1,
        payoutFrequency: 'daily' as const,
      },
    },
  },

  annual_subscription: {
    community_expert: {
      tier: 'community' as const,
      planType: 'annual' as const,
      monthlyFee: 0,
      annualFee: 49000, // €490/year
      monthlyEquivalent: 4083, // €40.83/month
      commissionRate: 0.12, // 12%
      commissionDiscount: 0.08, // 8% reduction (from 20% to 12%)
      stripePriceId: process.env.STRIPE_PRICE_COMMUNITY_ANNUAL,
      stripeLookupKey: 'community-expert-annual',
      breakEvenMonthlyRevenue: 510, // €510/month
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
      annualFee: 149000, // €1,490/year
      monthlyEquivalent: 12417, // €124.17/month
      commissionRate: 0.08, // 8%
      commissionDiscount: 0.07, // 7% reduction (from 15% to 8%)
      stripePriceId: process.env.STRIPE_PRICE_TOP_ANNUAL,
      stripeLookupKey: 'top-expert-annual',
      breakEvenMonthlyRevenue: 1774, // €1,774/month
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
      annualFee: 49000, // €490/year
      commissionRate: 0.03, // 3% on course sales
      stripePriceId: process.env.STRIPE_PRICE_LECTURER_ADDON_ANNUAL,
      stripeLookupKey: 'lecturer-module-annual',
      breakEvenAnnualSales: 14000, // €14,000 in course sales
    },
  },

  eligibility: {
    community_expert: {
      minMonthsActive: 3,
      minAvgMonthlyRevenue: 51000, // €510 in cents
      minCompletedAppointments: 15,
      minRating: 4.0,
    },
    top_expert: {
      minMonthsActive: 3,
      minAvgMonthlyRevenue: 177400, // €1,774 in cents
      minCompletedAppointments: 50,
      minRating: 4.5,
    },
  },

  team_subscription: {
    starter: {
      tier: 'starter' as const,
      planType: 'team' as const,
      monthlyFee: 9900, // EUR 99/mo
      annualFee: 99000, // EUR 990/yr (save 2 months)
      monthlyEquivalent: 8250, // EUR 82.50/mo
      maxExperts: 3,
      features: [
        'Up to 3 experts',
        'Basic analytics',
        'Scheduling & video consultations',
        'Payment processing',
        'Client management',
        'Email support',
        'Team branding',
      ],
      stripeLookupKey: 'team-starter-monthly',
    },
    professional: {
      tier: 'professional' as const,
      planType: 'team' as const,
      monthlyFee: 19900, // EUR 199/mo
      annualFee: 199000, // EUR 1,990/yr (save 2 months)
      monthlyEquivalent: 16583, // EUR 165.83/mo
      maxExperts: 10,
      features: [
        'Up to 10 experts',
        'Advanced analytics',
        'Customizable booking pages',
        'Priority support',
        'Marketing support',
        'Team dashboard',
        'Multi-location support',
        'Custom domain',
      ],
      stripeLookupKey: 'team-professional-monthly',
    },
    enterprise: {
      tier: 'enterprise' as const,
      planType: 'team' as const,
      monthlyFee: 0, // Custom pricing
      maxExperts: -1, // Unlimited
      features: [
        'Unlimited experts',
        'White-label solution',
        'API & webhooks',
        'Dedicated account manager',
        '24/7 priority support',
        'Custom integrations',
        'Advanced reporting',
        'Custom SLA',
      ],
      stripeLookupKey: 'team-enterprise-monthly',
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
  return annualFee / 100 + annualCommissions; // Convert cents to EUR
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
  const criteria =
    SUBSCRIPTION_PRICING.eligibility[tier as keyof typeof SUBSCRIPTION_PRICING.eligibility];
  const failedCriteria: string[] = [];

  if (monthsActive < criteria.minMonthsActive) {
    failedCriteria.push(`Need ${criteria.minMonthsActive} months active (have ${monthsActive})`);
  }

  if (avgMonthlyRevenue < criteria.minAvgMonthlyRevenue) {
    failedCriteria.push(
      `Need €${criteria.minAvgMonthlyRevenue / 100}/month avg revenue (have €${avgMonthlyRevenue / 100})`,
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
    return SUBSCRIPTION_PRICING.commission_based[`${tier}_expert`] as unknown as PricingPlan;
  } else if (planType === 'monthly') {
    return SUBSCRIPTION_PRICING.monthly_subscription[`${tier}_expert`] as unknown as PricingPlan;
  } else {
    return SUBSCRIPTION_PRICING.annual_subscription[`${tier}_expert`] as unknown as PricingPlan;
  }
}

/**
 * Type exports for use in the application
 */
export type SubscriptionPricing = typeof SUBSCRIPTION_PRICING;
export type CommissionBasedPlan = typeof SUBSCRIPTION_PRICING.commission_based;
export type MonthlySubscriptionPlan = typeof SUBSCRIPTION_PRICING.monthly_subscription;
export type AnnualSubscriptionPlan = typeof SUBSCRIPTION_PRICING.annual_subscription;
export type Addons = typeof SUBSCRIPTION_PRICING.addons;
export type EligibilityConfig = typeof SUBSCRIPTION_PRICING.eligibility;
export type TeamSubscriptionPlan = typeof SUBSCRIPTION_PRICING.team_subscription;
export type TeamTier = keyof typeof SUBSCRIPTION_PRICING.team_subscription;
