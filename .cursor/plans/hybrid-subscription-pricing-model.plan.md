# Eleva Hybrid Subscription Pricing Model - Implementation Plan

**Version:** 1.0  
**Created:** November 6, 2025  
**Status:** 🎯 Detailed Implementation Plan  
**Priority:** HIGH

---

## 📋 Executive Summary

This plan details the implementation of a **hybrid pricing model** for Eleva experts, combining:

1. **Commission-Based Plans** (Pay-as-you-go) - Ideal for new experts
2. **Fixed-Fee Annual Subscriptions** (Yearly only) - For established experts seeking predictability

**Key Innovation:** Experts can start with commission-based pricing and upgrade to annual subscriptions as they grow, optimizing their costs while providing Eleva with predictable revenue.

---

## 🎯 Strategic Objectives

### Business Goals

1. **Lower Barrier to Entry** - Commission-based plans attract new experts
2. **Revenue Predictability** - Annual subscriptions create stable MRR
3. **Growth Alignment** - Pricing scales with expert success
4. **Competitive Advantage** - Flexible pricing unique in healthcare marketplace
5. **Retention** - Annual commitments reduce churn

### User Experience Goals

1. **Flexibility** - Experts choose their preferred pricing model
2. **Transparency** - Clear pricing with no hidden fees
3. **Easy Upgrades** - Seamless transition from commission to annual
4. **Value Clarity** - Understand cost savings of annual plans

---

## 💰 Pricing Structure

### 1. Commission-Based Plans (Monthly, No Fixed Fee)

_Perfect for starting experts or those with variable booking volume_

#### Community Expert (Commission-Based)

```
Model: Pay per transaction
Commission Rate: 15% per booking
Monthly Fee: $0
Minimum Commitment: None
```

**Features:**

- List up to 5 services
- Basic calendar integration
- Standard analytics
- Weekly payouts
- Email support
- Community forum access

**Ideal For:**

- New experts testing the platform
- Part-time experts
- Seasonal consultants
- Those with unpredictable booking volume

**Cost Example:**

```
Monthly bookings: 10 appointments @ $100 each
Revenue: $1,000
Commission (15%): $150
Expert receives: $850
```

---

#### Top Expert (Commission-Based)

```
Model: Pay per transaction
Commission Rate: 10% per booking
Monthly Fee: $0
Minimum Commitment: None
Requirements: Earned through performance metrics
```

**Features:**

- Everything in Community Expert
- Unlimited services
- Advanced analytics
- Priority support
- Featured placement
- Daily payout option
- Custom branding
- Group sessions
- Direct messaging

**Ideal For:**

- Established experts with variable income
- Experts maintaining flexibility
- High-volume experts optimizing margins

**Cost Example:**

```
Monthly bookings: 50 appointments @ $150 each
Revenue: $7,500
Commission (10%): $750
Expert receives: $6,750
```

---

### 2. Fixed-Fee Annual Subscriptions (Yearly Only)

_Perfect for established experts seeking predictable costs and maximum savings_

#### Community Expert (Annual Subscription)

```
Model: Fixed annual fee
Annual Fee: $290/year ($24.17/month equivalent)
Commission: 0%
Savings vs Commission: Up to 38% for active experts
Minimum Commitment: 12 months
```

**Break-Even Analysis:**

```
Annual fee: $290
Break-even point (15% commission):
  $290 / 0.15 = $1,933 in annual bookings

If monthly bookings = $200:
  Commission model: $200 × 12 × 15% = $360/year
  Annual model: $290/year
  Savings: $70/year (19% savings)

If monthly bookings = $500:
  Commission model: $500 × 12 × 15% = $900/year
  Annual model: $290/year
  Savings: $610/year (68% savings)
```

**Who Should Choose This:**

- Experts with consistent monthly bookings >$160
- Those committed to full-time practice
- Experts wanting cost predictability

---

#### Top Expert (Annual Subscription)

```
Model: Fixed annual fee
Annual Fee: $990/year ($82.50/month equivalent)
Commission: 0%
Savings vs Commission: Up to 89% for high-volume experts
Minimum Commitment: 12 months
Requirements: Must meet Top Expert criteria
```

**Break-Even Analysis:**

```
Annual fee: $990
Break-even point (10% commission):
  $990 / 0.10 = $9,900 in annual bookings
  $9,900 / 12 = $825/month average

If monthly bookings = $1,000:
  Commission model: $1,000 × 12 × 10% = $1,200/year
  Annual model: $990/year
  Savings: $210/year (18% savings)

If monthly bookings = $5,000:
  Commission model: $5,000 × 12 × 10% = $6,000/year
  Annual model: $990/year
  Savings: $5,010/year (84% savings)

If monthly bookings = $10,000:
  Commission model: $10,000 × 12 × 10% = $12,000/year
  Annual model: $990/year
  Savings: $11,010/year (92% savings)
```

**Who Should Choose This:**

- Top experts with $825+/month in bookings
- Full-time practitioners
- Experts prioritizing profit margins

---

### 3. Add-On: Lecturer Module

```
Available As:
  - Commission-based: +5% on course sales (no fixed fee)
  - Annual add-on: +$490/year (0% commission)

Annual Break-Even: $9,800 in course sales
```

---

## 📊 Complete Pricing Matrix

| Tier                  | Commission | Annual Fee | Annual Savings | Break-Even             |
| --------------------- | ---------- | ---------- | -------------- | ---------------------- |
| **Community Expert**  |            |            |                |                        |
| - Commission Model    | 15%        | $0         | N/A            | N/A                    |
| - Annual Subscription | 0%         | $290/year  | Up to 68%      | $1,933 annual bookings |
| **Top Expert**        |            |            |                |                        |
| - Commission Model    | 10%        | $0         | N/A            | N/A                    |
| - Annual Subscription | 0%         | $990/year  | Up to 92%      | $9,900 annual bookings |
| **Lecturer Add-On**   |            |            |                |                        |
| - Commission Model    | +5%        | $0         | N/A            | N/A                    |
| - Annual Add-On       | 0%         | +$490/year | Up to 94%      | $9,800 course sales    |

---

## 🔄 Transition & Upgrade Paths

### 1. Starting Journey: Commission-Based

```
New Expert Joins
     ↓
Commission-Based (15%)
     ↓
[Tracks bookings & revenue]
     ↓
After 3-6 months → Review analytics
     ↓
If monthly bookings > $160/month
     ↓
[System suggests annual plan]
     ↓
Expert chooses: Stay Commission OR Upgrade to Annual
```

---

### 2. Upgrade to Annual Subscription

#### Eligibility Criteria:

**Automatic Eligibility Notification Triggers:**

```typescript
const ELIGIBILITY_CRITERIA = {
  community_expert: {
    minMonthsActive: 3,
    avgMonthlyBookings: 160, // $160/month × 15% = $24/month commission
    minCompletedAppointments: 15,
    minRating: 4.0,
  },
  top_expert: {
    minMonthsActive: 3,
    avgMonthlyBookings: 825, // $825/month × 10% = $82.50/month commission
    minCompletedAppointments: 50,
    minRating: 4.5,
  },
};
```

#### Upgrade Process:

```
1. Expert receives in-app notification:
   "💡 Save up to 68% - Upgrade to Annual Subscription!"

2. Shows personalized savings calculator:
   Your last 3 months avg: $500/month
   Commission paid: $75/month ($225/quarter)
   Annual plan cost: $290/year
   Your savings: $610/year (68%)

3. One-click upgrade button

4. Payment options:
   - Pay annually ($290 upfront)
   - Split into 4 quarterly payments ($72.50/quarter)

5. Confirmation & benefits activation
```

---

### 3. Mid-Cycle Upgrade Pro-Ration

**Scenario:** Expert upgrades to annual plan in Month 6

```typescript
// Calculate commission paid so far
const commissionsToDate = monthlyBookings
  .slice(0, 6)
  .reduce((sum, month) => sum + month.revenue * 0.15, 0);

// Pro-rated annual fee for remaining 6 months
const remainingMonths = 12 - currentMonth;
const proRatedAnnualFee = (ANNUAL_FEE / 12) * remainingMonths;

// Calculate credit
const creditAmount = Math.min(commissionsToDate, proRatedAnnualFee * 0.5);

// Final charge
const finalCharge = proRatedAnnualFee - creditAmount;

/*
Example:
- Paid commissions (6 months): $450
- Pro-rated annual (6 months): $145
- Credit: $145 (50% of pro-rated)
- Final charge: $0 (fully credited)
- Effective start: Immediate, covers next 6 months
- Renewal: In 12 months at full $290
*/
```

**Benefits:**

- No penalty for switching mid-year
- Credits up to 50% of commissions paid
- Encourages early adoption
- Fair transition mechanism

---

### 4. Downgrade Policy

**From Annual → Commission-Based:**

```
Allowed: After 12-month commitment ends
Penalty: None (must complete annual term)
Process: Automatic reversion if not renewed
Notice: 30 days before expiration
```

**Early Cancellation (Before 12 Months):**

```
Allowed: Yes, with pro-rated refund
Refund calculation:
  - Months used at commission rate
  - Remaining months refunded
  - Commission difference is charged

Example (cancel at month 6):
  - Annual fee paid: $290
  - Commission would have been: $450 (6 months)
  - Difference: $160 owed
  - Refund: $145 (6 months unused) - $160 owed = $0
  - Result: No refund, but no additional charge
```

**From Top Expert → Community Expert:**

```
Trigger: Performance metrics drop below threshold
Grace Period: 1 month to improve
If not improved:
  - Annual subscribers: Finish term, renew at Community rate
  - Commission subscribers: Immediate rate change (10% → 15%)
```

---

## 🏗️ Implementation Architecture

### 1. Database Schema Updates

```typescript
// drizzle/schema-workos.ts

export const SubscriptionPlansTable = pgTable('subscription_plans', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  workosUserId: varchar('workos_user_id', { length: 255 }).notNull().unique(),

  // Plan Type
  planType: varchar('plan_type', { length: 50 }).notNull(), // 'commission' | 'annual'
  tierLevel: varchar('tier_level', { length: 50 }).notNull(), // 'community' | 'top'

  // Commission-based details
  commissionRate: numeric('commission_rate', { precision: 4, scale: 3 }), // e.g., 0.150 for 15%

  // Annual subscription details
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  annualFee: integer('annual_fee'), // in cents
  subscriptionStartDate: timestamp('subscription_start_date'),
  subscriptionEndDate: timestamp('subscription_end_date'),
  autoRenew: boolean('auto_renew').default(true),

  // Add-ons
  lecturerAddonEnabled: boolean('lecturer_addon_enabled').default(false),
  lecturerAddonType: varchar('lecturer_addon_type', { length: 50 }), // 'commission' | 'annual'

  // Eligibility tracking
  isEligibleForAnnual: boolean('is_eligible_for_annual').default(false),
  eligibilityNotificationSent: boolean('eligibility_notification_sent').default(false),
  lastEligibilityCheck: timestamp('last_eligibility_check'),

  // Transition tracking
  previousPlanType: varchar('previous_plan_type', { length: 50 }),
  upgradedAt: timestamp('upgraded_at'),
  commissionsPaidBeforeUpgrade: integer('commissions_paid_before_upgrade'), // in cents

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const TransactionCommissionsTable = pgTable('transaction_commissions', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  workosUserId: varchar('workos_user_id', { length: 255 }).notNull(),
  appointmentId: varchar('appointment_id', { length: 255 }).notNull(),

  // Transaction details
  grossAmount: integer('gross_amount').notNull(), // in cents
  commissionRate: numeric('commission_rate', { precision: 4, scale: 3 }).notNull(),
  commissionAmount: integer('commission_amount').notNull(), // in cents
  netAmount: integer('net_amount').notNull(), // in cents

  // Stripe references
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }).notNull(),
  stripeTransferId: varchar('stripe_transfer_id', { length: 255 }),

  // Status
  status: varchar('status', { length: 50 }).notNull(), // 'pending' | 'processed' | 'refunded'
  processedAt: timestamp('processed_at'),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const AnnualPlanEligibilityTable = pgTable('annual_plan_eligibility', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  workosUserId: varchar('workos_user_id', { length: 255 }).notNull().unique(),

  // Metrics
  monthsActive: integer('months_active').default(0),
  totalCompletedAppointments: integer('total_completed_appointments').default(0),
  last90DaysRevenue: integer('last_90_days_revenue').default(0), // in cents
  avgMonthlyRevenue: integer('avg_monthly_revenue').default(0), // in cents
  currentRating: numeric('current_rating', { precision: 3, scale: 2 }),

  // Eligibility status
  isEligible: boolean('is_eligible').default(false),
  eligibleSince: timestamp('eligible_since'),

  // Projected savings
  projectedAnnualCommissions: integer('projected_annual_commissions'), // in cents
  projectedAnnualSavings: integer('projected_annual_savings'), // in cents
  savingsPercentage: numeric('savings_percentage', { precision: 5, scale: 2 }),

  // Timestamps
  lastCalculated: timestamp('last_calculated').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

---

### 2. Stripe Product Setup

#### Create Products via Stripe Dashboard or CLI

```bash
# Community Expert Annual Subscription
stripe products create \
  --name="Community Expert - Annual Subscription" \
  --description="$0 commission on all bookings for 12 months" \
  --metadata[tier]="community" \
  --metadata[plan_type]="annual" \
  --metadata[commitment]="12_months"

# Create price for Community Expert Annual
stripe prices create \
  --product="prod_COMMUNITY_ANNUAL_ID" \
  --unit-amount=29000 \
  --currency=usd \
  --recurring[interval]=year \
  --recurring[interval_count]=1 \
  --billing-scheme=per_unit

# Top Expert Annual Subscription
stripe products create \
  --name="Top Expert - Annual Subscription" \
  --description="$0 commission on all bookings for 12 months" \
  --metadata[tier]="top" \
  --metadata[plan_type]="annual" \
  --metadata[commitment]="12_months"

# Create price for Top Expert Annual
stripe prices create \
  --product="prod_TOP_ANNUAL_ID" \
  --unit-amount=99000 \
  --currency=usd \
  --recurring[interval]=year \
  --recurring[interval_count]=1 \
  --billing-scheme=per_unit

# Lecturer Add-On Annual
stripe products create \
  --name="Lecturer Module - Annual Add-On" \
  --description="$0 commission on course sales for 12 months" \
  --metadata[addon]="lecturer" \
  --metadata[plan_type]="annual"

# Create price for Lecturer Add-On
stripe prices create \
  --product="prod_LECTURER_ADDON_ID" \
  --unit-amount=49000 \
  --currency=usd \
  --recurring[interval]=year \
  --recurring[interval_count]=1 \
  --billing-scheme=per_unit

# Optional: Quarterly payment option for Community Expert
stripe prices create \
  --product="prod_COMMUNITY_ANNUAL_ID" \
  --unit-amount=7250 \
  --currency=usd \
  --recurring[interval]=month \
  --recurring[interval_count]=3 \
  --billing-scheme=per_unit \
  --metadata[payment_plan]="quarterly"
```

---

### 3. Configuration File

```typescript
// config/subscription-pricing.ts

export const SUBSCRIPTION_PRICING = {
  commission_based: {
    community_expert: {
      tier: 'community',
      planType: 'commission',
      monthlyFee: 0,
      commissionRate: 0.15, // 15%
      features: [
        'List up to 5 services',
        'Basic calendar integration',
        'Standard analytics',
        'Weekly payouts',
        'Email support',
        'Community forum',
      ],
      limits: {
        maxServices: 5,
        payoutFrequency: 'weekly',
      },
    },
    top_expert: {
      tier: 'top',
      planType: 'commission',
      monthlyFee: 0,
      commissionRate: 0.1, // 10%
      features: [
        'Unlimited services',
        'Advanced analytics',
        'Priority support',
        'Featured placement',
        'Daily payout option',
        'Custom branding',
        'Group sessions',
        'Direct messaging',
      ],
      limits: {
        maxServices: -1, // unlimited
        payoutFrequency: 'daily',
      },
    },
  },

  annual_subscription: {
    community_expert: {
      tier: 'community',
      planType: 'annual',
      annualFee: 29000, // $290 in cents
      monthlyEquivalent: 2417, // $24.17
      commissionRate: 0, // No commission
      stripePriceId: process.env.STRIPE_PRICE_COMMUNITY_ANNUAL!,
      breakEvenMonthlyRevenue: 193, // $193/month
      features: [
        'List up to 5 services',
        'Basic calendar integration',
        'Standard analytics',
        'Weekly payouts',
        'Email support',
        'Community forum',
        '✨ $0 commission on all bookings',
        '✨ Save up to 68% vs commission model',
      ],
      limits: {
        maxServices: 5,
        payoutFrequency: 'weekly',
      },
      commitmentMonths: 12,
    },
    top_expert: {
      tier: 'top',
      planType: 'annual',
      annualFee: 99000, // $990 in cents
      monthlyEquivalent: 8250, // $82.50
      commissionRate: 0, // No commission
      stripePriceId: process.env.STRIPE_PRICE_TOP_ANNUAL!,
      breakEvenMonthlyRevenue: 825, // $825/month
      features: [
        'Unlimited services',
        'Advanced analytics',
        'Priority support',
        'Featured placement',
        'Daily payout option',
        'Custom branding',
        'Group sessions',
        'Direct messaging',
        '✨ $0 commission on all bookings',
        '✨ Save up to 92% vs commission model',
      ],
      limits: {
        maxServices: -1, // unlimited
        payoutFrequency: 'daily',
      },
      commitmentMonths: 12,
    },
  },

  addons: {
    lecturer_commission: {
      name: 'Lecturer Module (Commission)',
      commissionRate: 0.05, // 5% on course sales
      monthlyFee: 0,
    },
    lecturer_annual: {
      name: 'Lecturer Module (Annual)',
      annualFee: 49000, // $490
      commissionRate: 0,
      stripePriceId: process.env.STRIPE_PRICE_LECTURER_ADDON_ANNUAL!,
      breakEvenAnnualSales: 9800, // $9,800 in course sales
    },
  },

  eligibility: {
    community_expert: {
      minMonthsActive: 3,
      minAvgMonthlyRevenue: 16000, // $160 in cents
      minCompletedAppointments: 15,
      minRating: 4.0,
    },
    top_expert: {
      minMonthsActive: 3,
      minAvgMonthlyRevenue: 82500, // $825 in cents
      minCompletedAppointments: 50,
      minRating: 4.5,
    },
  },
} as const;

export type SubscriptionTier = 'community' | 'top';
export type PlanType = 'commission' | 'annual';
```

---

### 4. Server Actions

```typescript
// server/actions/subscription-management.ts

'use server';

import { SUBSCRIPTION_PRICING } from '@/config/subscription-pricing';
import { db } from '@/drizzle/db';
import {
  AnnualPlanEligibilityTable,
  SubscriptionPlansTable,
  TransactionCommissionsTable,
} from '@/drizzle/schema-workos';
import { sendAnnualPlanEligibilityNotification } from '@/lib/integrations/novu/notifications';
import { stripe } from '@/lib/integrations/stripe';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { and, eq, gte } from 'drizzle-orm';

// server/actions/subscription-management.ts

/**
 * Check if expert is eligible for annual subscription
 */
export async function checkAnnualPlanEligibility(workosUserId: string) {
  const { user } = await withAuth({ ensureSignedIn: true });

  if (!user || user.id !== workosUserId) {
    return { error: 'Unauthorized' };
  }

  // Get expert's subscription plan
  const plan = await db.query.SubscriptionPlansTable.findFirst({
    where: eq(SubscriptionPlansTable.workosUserId, workosUserId),
  });

  if (!plan) {
    return { error: 'No subscription plan found' };
  }

  // Already on annual plan
  if (plan.planType === 'annual') {
    return { eligible: false, reason: 'already_on_annual' };
  }

  // Get expert metrics
  const metrics = await db.query.ExpertMetricsTable.findFirst({
    where: eq(ExpertMetricsTable.workosUserId, workosUserId),
  });

  if (!metrics) {
    return { eligible: false, reason: 'no_metrics' };
  }

  // Get last 90 days transactions
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentTransactions = await db.query.TransactionCommissionsTable.findMany({
    where: and(
      eq(TransactionCommissionsTable.workosUserId, workosUserId),
      gte(TransactionCommissionsTable.createdAt, ninetyDaysAgo),
      eq(TransactionCommissionsTable.status, 'processed'),
    ),
  });

  // Calculate metrics
  const totalRevenue = recentTransactions.reduce((sum, tx) => sum + tx.grossAmount, 0);
  const avgMonthlyRevenue = Math.round(totalRevenue / 3); // 90 days = 3 months

  // Get eligibility criteria for current tier
  const criteria =
    SUBSCRIPTION_PRICING.eligibility[
      plan.tierLevel as keyof typeof SUBSCRIPTION_PRICING.eligibility
    ];

  // Check eligibility
  const eligible =
    metrics.daysAsExpert >= criteria.minMonthsActive * 30 &&
    avgMonthlyRevenue >= criteria.minAvgMonthlyRevenue &&
    metrics.totalBookings >= criteria.minCompletedAppointments &&
    parseFloat(metrics.averageRating) >= criteria.minRating;

  if (!eligible) {
    return {
      eligible: false,
      metrics: {
        monthsActive: Math.floor(metrics.daysAsExpert / 30),
        avgMonthlyRevenue: avgMonthlyRevenue / 100, // Convert to dollars
        completedAppointments: metrics.totalBookings,
        rating: parseFloat(metrics.averageRating),
      },
      requirements: {
        minMonthsActive: criteria.minMonthsActive,
        minAvgMonthlyRevenue: criteria.minAvgMonthlyRevenue / 100,
        minCompletedAppointments: criteria.minCompletedAppointments,
        minRating: criteria.minRating,
      },
    };
  }

  // Calculate projected savings
  const annualPlanConfig =
    SUBSCRIPTION_PRICING.annual_subscription[
      plan.tierLevel as keyof typeof SUBSCRIPTION_PRICING.annual_subscription
    ];

  const projectedAnnualRevenue = avgMonthlyRevenue * 12;
  const projectedAnnualCommissions = Math.round(
    projectedAnnualRevenue * parseFloat(plan.commissionRate || '0'),
  );
  const projectedAnnualSavings = projectedAnnualCommissions - annualPlanConfig.annualFee;
  const savingsPercentage = (projectedAnnualSavings / projectedAnnualCommissions) * 100;

  // Store eligibility
  await db
    .insert(AnnualPlanEligibilityTable)
    .values({
      workosUserId,
      monthsActive: Math.floor(metrics.daysAsExpert / 30),
      totalCompletedAppointments: metrics.totalBookings,
      last90DaysRevenue: totalRevenue,
      avgMonthlyRevenue,
      currentRating: metrics.averageRating,
      isEligible: true,
      eligibleSince: new Date(),
      projectedAnnualCommissions,
      projectedAnnualSavings,
      savingsPercentage: savingsPercentage.toFixed(2),
      lastCalculated: new Date(),
    })
    .onConflictDoUpdate({
      target: AnnualPlanEligibilityTable.workosUserId,
      set: {
        monthsActive: Math.floor(metrics.daysAsExpert / 30),
        totalCompletedAppointments: metrics.totalBookings,
        last90DaysRevenue: totalRevenue,
        avgMonthlyRevenue,
        currentRating: metrics.averageRating,
        isEligible: true,
        eligibleSince: new Date(),
        projectedAnnualCommissions,
        projectedAnnualSavings,
        savingsPercentage: savingsPercentage.toFixed(2),
        lastCalculated: new Date(),
        updatedAt: new Date(),
      },
    });

  // Send notification if not sent before
  if (!plan.eligibilityNotificationSent) {
    await sendAnnualPlanEligibilityNotification({
      userId: workosUserId,
      tier: plan.tierLevel,
      projectedSavings: projectedAnnualSavings / 100, // Convert to dollars
      savingsPercentage: Math.round(savingsPercentage),
    });

    await db
      .update(SubscriptionPlansTable)
      .set({
        isEligibleForAnnual: true,
        eligibilityNotificationSent: true,
        lastEligibilityCheck: new Date(),
      })
      .where(eq(SubscriptionPlansTable.workosUserId, workosUserId));
  }

  return {
    eligible: true,
    savings: {
      annualFee: annualPlanConfig.annualFee / 100,
      projectedAnnualCommissions: projectedAnnualCommissions / 100,
      projectedAnnualSavings: projectedAnnualSavings / 100,
      savingsPercentage: Math.round(savingsPercentage),
    },
    metrics: {
      avgMonthlyRevenue: avgMonthlyRevenue / 100,
      last90DaysRevenue: totalRevenue / 100,
    },
  };
}

/**
 * Upgrade expert to annual subscription
 */
export async function upgradeToAnnualPlan(workosUserId: string, paymentMethodId?: string) {
  const { user } = await withAuth({ ensureSignedIn: true });

  if (!user || user.id !== workosUserId) {
    return { error: 'Unauthorized' };
  }

  // Check eligibility
  const eligibility = await checkAnnualPlanEligibility(workosUserId);

  if (!eligibility.eligible) {
    return { error: 'Not eligible for annual plan', details: eligibility };
  }

  // Get current plan
  const currentPlan = await db.query.SubscriptionPlansTable.findFirst({
    where: eq(SubscriptionPlansTable.workosUserId, workosUserId),
  });

  if (!currentPlan) {
    return { error: 'Current plan not found' };
  }

  // Get user's Stripe customer ID
  const dbUser = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.workosUserId, workosUserId),
  });

  if (!dbUser?.stripeCustomerId) {
    return { error: 'Stripe customer not found' };
  }

  // Get annual plan configuration
  const annualPlanConfig =
    SUBSCRIPTION_PRICING.annual_subscription[
      currentPlan.tierLevel as keyof typeof SUBSCRIPTION_PRICING.annual_subscription
    ];

  // Calculate commissions paid in current period
  const commissionsPaid = await db.query.TransactionCommissionsTable.findMany({
    where: and(
      eq(TransactionCommissionsTable.workosUserId, workosUserId),
      eq(TransactionCommissionsTable.status, 'processed'),
    ),
  });

  const totalCommissionsPaid = commissionsPaid.reduce((sum, tx) => sum + tx.commissionAmount, 0);

  try {
    // Create Stripe subscription
    const subscription = await stripe.subscriptions.create({
      customer: dbUser.stripeCustomerId,
      items: [{ price: annualPlanConfig.stripePriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      ...(paymentMethodId && { default_payment_method: paymentMethodId }),
      metadata: {
        workosUserId,
        planType: 'annual',
        tier: currentPlan.tierLevel,
        previousCommissionsPaid: totalCommissionsPaid,
        upgradedFrom: 'commission',
      },
      billing_cycle_anchor_config: {
        day_of_month: 1, // Bill on 1st of each year
      },
    });

    // Update plan in database
    await db
      .update(SubscriptionPlansTable)
      .set({
        planType: 'annual',
        stripeSubscriptionId: subscription.id,
        stripePriceId: annualPlanConfig.stripePriceId,
        annualFee: annualPlanConfig.annualFee,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        commissionRate: null,
        previousPlanType: 'commission',
        upgradedAt: new Date(),
        commissionsPaidBeforeUpgrade: totalCommissionsPaid,
        updatedAt: new Date(),
      })
      .where(eq(SubscriptionPlansTable.workosUserId, workosUserId));

    return {
      success: true,
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice
        ? (subscription.latest_invoice as any).payment_intent?.client_secret
        : null,
    };
  } catch (error) {
    console.error('Failed to create annual subscription:', error);
    return { error: 'Failed to create subscription' };
  }
}

/**
 * Calculate commission for a transaction
 */
export async function calculateCommission(workosUserId: string, grossAmount: number) {
  const plan = await db.query.SubscriptionPlansTable.findFirst({
    where: eq(SubscriptionPlansTable.workosUserId, workosUserId),
  });

  if (!plan) {
    throw new Error('No subscription plan found');
  }

  // Annual subscribers pay no commission
  if (plan.planType === 'annual') {
    return {
      grossAmount,
      commissionRate: 0,
      commissionAmount: 0,
      netAmount: grossAmount,
      planType: 'annual',
    };
  }

  // Calculate commission for commission-based plans
  const commissionRate = parseFloat(plan.commissionRate || '0');
  const commissionAmount = Math.round(grossAmount * commissionRate);
  const netAmount = grossAmount - commissionAmount;

  return {
    grossAmount,
    commissionRate,
    commissionAmount,
    netAmount,
    planType: 'commission',
  };
}

/**
 * Record transaction commission
 */
export async function recordTransactionCommission(
  workosUserId: string,
  appointmentId: string,
  stripePaymentIntentId: string,
  grossAmount: number,
) {
  const commission = await calculateCommission(workosUserId, grossAmount);

  await db.insert(TransactionCommissionsTable).values({
    workosUserId,
    appointmentId,
    grossAmount: commission.grossAmount,
    commissionRate: commission.commissionRate.toString(),
    commissionAmount: commission.commissionAmount,
    netAmount: commission.netAmount,
    stripePaymentIntentId,
    status: 'pending',
    createdAt: new Date(),
  });

  return commission;
}
```

---

### 5. Cron Job: Eligibility Checker

```typescript
// app/api/cron/check-annual-eligibility/route.ts
import { db } from '@/drizzle/db';
import { SubscriptionPlansTable } from '@/drizzle/schema-workos';
import { checkAnnualPlanEligibility } from '@/server/actions/subscription-management';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verify cron authentication
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all commission-based experts
    const commissionExperts = await db.query.SubscriptionPlansTable.findMany({
      where: eq(SubscriptionPlansTable.planType, 'commission'),
    });

    const results = [];

    for (const expert of commissionExperts) {
      // Skip if notification already sent
      if (expert.eligibilityNotificationSent) {
        continue;
      }

      // Check eligibility
      const eligibility = await checkAnnualPlanEligibility(expert.workosUserId);

      results.push({
        workosUserId: expert.workosUserId,
        eligible: eligibility.eligible,
        notificationSent: eligibility.eligible,
      });
    }

    return NextResponse.json({
      success: true,
      checkedCount: commissionExperts.length,
      results,
    });
  } catch (error) {
    console.error('Eligibility check failed:', error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
```

---

## 🎨 UI/UX Implementation

### 1. Pricing Comparison Component

```typescript
// components/features/subscription/PricingComparison.tsx

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Check } from 'lucide-react';

interface PricingComparisonProps {
  tier: 'community' | 'top';
  currentPlan: 'commission' | 'annual';
}

export function PricingComparison({ tier, currentPlan }: PricingComparisonProps) {
  const [monthlyRevenue, setMonthlyRevenue] = useState(500);

  // Pricing config
  const config = {
    community: {
      commissionRate: 0.15,
      annualFee: 290,
      breakEven: 193,
    },
    top: {
      commissionRate: 0.10,
      annualFee: 990,
      breakEven: 825,
    },
  }[tier];

  // Calculate costs
  const annualRevenue = monthlyRevenue * 12;
  const commissionCost = annualRevenue * config.commissionRate;
  const annualCost = config.annualFee;
  const savings = commissionCost - annualCost;
  const savingsPercentage = (savings / commissionCost) * 100;

  return (
    <div className="space-y-6">
      {/* Revenue Slider */}
      <div>
        <label className="text-sm font-medium">
          Your Monthly Revenue: ${monthlyRevenue}
        </label>
        <Slider
          value={[monthlyRevenue]}
          onValueChange={(value) => setMonthlyRevenue(value[0])}
          min={0}
          max={10000}
          step={50}
          className="mt-2"
        />
      </div>

      {/* Comparison Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Commission Plan */}
        <Card className={currentPlan === 'commission' ? 'border-primary' : ''}>
          <CardHeader>
            <CardTitle>Commission-Based</CardTitle>
            <CardDescription>Pay {config.commissionRate * 100}% per booking</CardDescription>
            {currentPlan === 'commission' && (
              <Badge variant="default">Current Plan</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">
              ${commissionCost.toFixed(0)}<span className="text-sm font-normal">/year</span>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span className="text-sm">No upfront costs</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span className="text-sm">Cancel anytime</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span className="text-sm">Pay as you grow</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Annual Plan */}
        <Card className={currentPlan === 'annual' ? 'border-primary' : 'border-green-500'}>
          <CardHeader>
            <CardTitle>Annual Subscription</CardTitle>
            <CardDescription>Zero commission for 12 months</CardDescription>
            {currentPlan === 'annual' ? (
              <Badge variant="default">Current Plan</Badge>
            ) : (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Recommended
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">
              ${annualCost}<span className="text-sm font-normal">/year</span>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span className="text-sm">$0 commission</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span className="text-sm">Predictable costs</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <span className="text-sm font-semibold text-green-600">
                  Save ${savings.toFixed(0)} ({savingsPercentage.toFixed(0)}%)
                </span>
              </li>
            </ul>
            {currentPlan === 'commission' && savings > 0 && (
              <Button className="w-full" size="lg">
                Upgrade & Save ${savings.toFixed(0)}/year
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Break-even note */}
      <p className="text-sm text-muted-foreground text-center">
        Annual plan breaks even at ${config.breakEven}/month in bookings
      </p>
    </div>
  );
}
```

---

### 2. Eligibility Notification Banner

```typescript
// components/features/subscription/EligibilityBanner.tsx

'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import Link from 'next/link';

interface EligibilityBannerProps {
  projectedSavings: number;
  savingsPercentage: number;
}

export function EligibilityBanner({
  projectedSavings,
  savingsPercentage,
}: EligibilityBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
      <Sparkles className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-900">
        You're eligible for our Annual Subscription!
      </AlertTitle>
      <AlertDescription className="text-green-800">
        <p className="mb-2">
          Save up to <strong>${projectedSavings}</strong> per year ({savingsPercentage}% savings)
          by switching to an annual plan.
        </p>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="bg-green-600 hover:bg-green-700">
            <Link href="/account/billing/upgrade">View Annual Plans</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-green-700 hover:text-green-900"
          >
            Maybe Later
          </Button>
        </div>
      </AlertDescription>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 p-1 rounded-sm opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}
```

---

## 📊 Analytics & Reporting

### Metrics to Track

```typescript
// Subscription Metrics
interface SubscriptionMetrics {
  // Plan distribution
  totalExperts: number;
  commissionBasedExperts: number;
  annualSubscribers: number;

  // Revenue breakdown
  commissionRevenue: number; // Total commissions collected
  subscriptionRevenue: number; // Total annual fees
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue

  // Conversion metrics
  eligibleForAnnual: number;
  notificationsSent: number;
  conversionRate: number; // % who upgraded after notification

  // Savings delivered
  totalSavingsDelivered: number; // Total saved by annual subscribers
  avgSavingsPerExpert: number;

  // Churn metrics
  annualRenewalRate: number;
  downgradesToCommission: number;
}
```

---

## 🧪 Testing Scenarios

### 1. Commission Calculation Tests

```typescript
describe('Commission Calculation', () => {
  it('calculates 15% commission for Community Expert', async () => {
    const result = await calculateCommission('user_123', 10000); // $100
    expect(result.commissionAmount).toBe(1500); // $15
    expect(result.netAmount).toBe(8500); // $85
  });

  it('calculates 10% commission for Top Expert', async () => {
    const result = await calculateCommission('user_456', 10000); // $100
    expect(result.commissionAmount).toBe(1000); // $10
    expect(result.netAmount).toBe(9000); // $90
  });

  it('returns 0% commission for annual subscribers', async () => {
    const result = await calculateCommission('user_annual', 10000);
    expect(result.commissionAmount).toBe(0);
    expect(result.netAmount).toBe(10000); // Full amount
  });
});
```

### 2. Eligibility Check Tests

```typescript
describe('Annual Plan Eligibility', () => {
  it('marks Community Expert as eligible after 3 months and $160/month avg', async () => {
    const result = await checkAnnualPlanEligibility('user_123');
    expect(result.eligible).toBe(true);
    expect(result.savings.savingsPercentage).toBeGreaterThan(0);
  });

  it('marks Top Expert as ineligible with insufficient revenue', async () => {
    const result = await checkAnnualPlanEligibility('user_low_revenue');
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('insufficient_revenue');
  });
});
```

---

## 📅 Implementation Timeline

### Phase 1: Foundation (Week 1-2)

**Database & Backend:**

- [ ] Create database schema (SubscriptionPlansTable, TransactionCommissionsTable)
- [ ] Set up Stripe products and prices
- [ ] Implement commission calculation logic
- [ ] Create server actions for plan management

### Phase 2: Eligibility System (Week 3)

**Metrics & Notifications:**

- [ ] Build eligibility checker cron job
- [ ] Create eligibility notification system (Novu)
- [ ] Implement savings calculator
- [ ] Create AnnualPlanEligibilityTable

### Phase 3: UI/UX (Week 4)

**User Interface:**

- [ ] Build pricing comparison component
- [ ] Create upgrade flow
- [ ] Implement eligibility banner
- [ ] Add billing management page
- [ ] Create annual plan onboarding

### Phase 4: Testing & Launch (Week 5-6)

**Quality Assurance:**

- [ ] Unit tests for commission calculations
- [ ] Integration tests for Stripe webhooks
- [ ] E2E tests for upgrade flow
- [ ] Load testing for cron jobs
- [ ] Beta launch with 10 test experts
- [ ] Full launch

---

## 🎓 Best Practices Applied

### From Market Research:

1. **Low Barrier to Entry** ✅
   - Commission-based plans have $0 upfront cost
   - Attracts new experts to platform

2. **Revenue Alignment** ✅
   - Commission model aligns platform success with expert success
   - Shared risk/reward

3. **Predictability for Growth** ✅
   - Annual subscriptions provide stable, predictable revenue
   - Easier financial forecasting

4. **Value-Based Pricing** ✅
   - Break-even points clearly communicated
   - Savings calculator shows personalized value

5. **Commitment Incentives** ✅
   - Annual-only subscriptions (no monthly) encourage commitment
   - Quarterly payment option reduces upfront barrier

6. **Fair Transition** ✅
   - Pro-rated upgrades with commission credits
   - No penalties for early adopters

7. **Transparent Communication** ✅
   - Clear eligibility criteria
   - Upfront savings calculations
   - No hidden fees

8. **Flexible Downgrade** ✅
   - Can return to commission after 12 months
   - No lock-in after commitment period

---

## 💡 Key Success Factors

1. **Clear Value Proposition**
   - Show exact dollar savings
   - Use real expert data for projections

2. **Timely Notifications**
   - Notify experts when eligible (not before)
   - Personalized savings calculations

3. **Seamless Upgrade**
   - One-click upgrade process
   - Instant activation

4. **Ongoing Education**
   - Case studies of experts who upgraded
   - Success stories in community

5. **Continuous Optimization**
   - Monitor conversion rates
   - A/B test messaging
   - Adjust break-even points if needed

---

## 🚨 Risk Mitigation

### Financial Risks:

**Risk:** Experts game the system by upgrading then reducing bookings
**Mitigation:**

- Require 3-month track record before eligibility
- Monitor booking patterns after upgrade
- Annual commitment locks in fee

**Risk:** High churn of annual subscribers
**Mitigation:**

- Ensure break-even points are conservative
- Provide excellent value and support
- Auto-renewal with advance notice

### Operational Risks:

**Risk:** Stripe webhook failures lose commission data
**Mitigation:**

- Implement idempotent webhooks
- Reconciliation scripts for missing data
- Alert system for webhook failures

**Risk:** Eligibility cron job crashes
**Mitigation:**

- Implement error handling and retries
- Monitor cron job execution
- Manual fallback process

---

## 📚 Documentation References

- [Stripe Subscriptions Best Practices](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Annual Billing Cycles](https://docs.stripe.com/billing/subscriptions/billing-cycle)
- [SaaS Pricing Strategies](https://www.redfast.com/news/5-common-types-of-subscription-pricing-models)
- [Main RBAC System Design](../docs/02-core-systems/ROLE-PROGRESSION-SYSTEM.md)

---

## ✅ Definition of Done

This plan is complete when:

- [x] All pricing configurations defined
- [x] Database schema designed
- [x] Server actions planned
- [x] UI/UX components specified
- [x] Testing scenarios defined
- [x] Implementation timeline created
- [x] Risk mitigation strategies documented
- [x] Best practices applied and documented

---

## 🎯 Next Steps

1. **Review & Approval**
   - Product team reviews pricing strategy
   - Finance approves revenue projections
   - Legal reviews terms & commitments

2. **Technical Setup**
   - Create Stripe products in test mode
   - Set up database migrations
   - Configure environment variables

3. **Begin Implementation**
   - Follow Phase 1 timeline
   - Create implementation tickets
   - Assign developers

4. **Monitor & Iterate**
   - Track conversion metrics
   - Gather expert feedback
   - Optimize messaging and pricing

---

**Questions or feedback? Contact the product or tech lead.**

---

_This plan complements the main [Role Progression System](../docs/02-core-systems/ROLE-PROGRESSION-SYSTEM.md) design._
