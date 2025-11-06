# Solo Expert vs. Clinic Architecture

**Date:** 2025-11-06  
**Status:** ✅ Documented & Implemented (Phase 1 - Solo Experts)  
**Future:** 🔮 Phase 2 - Clinics

---

## Executive Summary

Eleva supports two organization types with different subscription behaviors:

1. **Solo Experts** (Current - Phase 1): 1 expert = 1 org, role determines subscription tier
2. **Clinics** (Future - Phase 2): Multi-expert orgs, each expert keeps individual commission rate

**Key Decision:** Commission rates are ALWAYS based on individual expert's role, never the organization's subscription tier.

---

## 1️⃣ Solo Expert Model (Current - Phase 1)

### Architecture

```
Expert Signs Up
  ↓
Creates Account (role: expert_community or expert_top)
  ↓
Personal Organization Created (type: 'expert_individual')
  ↓
Subscription matches Expert Level
  ↓
1 Member in Org: The Expert (owner)
```

### Example: Community Expert

```typescript
{
  user: {
    role: 'expert_community',
    workosUserId: 'user_123'
  },
  organization: {
    type: 'expert_individual',
    members: 1, // Only the expert
    name: "Dr. João's Practice"
  },
  subscription: {
    orgId: 'org_456',
    tierLevel: 'community', // Matches user role
    planType: 'monthly', // Can be commission/monthly/annual
    monthlyFee: 4900, // $49/month
    commissionRate: 1200 // 12% (basis points)
  },
  commission: {
    // When patient books $100 appointment:
    grossAmount: 10000, // $100.00
    commissionRate: 1200, // 12%
    commissionAmount: 1200, // $12.00
    netAmount: 8800, // $88.00 to expert
    tierLevelAtTransaction: 'community',
    planTypeAtTransaction: 'monthly'
  }
}
```

### Commission Rates

| Expert Level  | Commission-Only | Monthly      | Annual         |
| ------------- | --------------- | ------------ | -------------- |
| **Community** | 20%             | 12% ($49/mo) | 12% ($490/yr)  |
| **Top**       | 15%             | 8% ($177/mo) | 8% ($1,774/yr) |

### Key Characteristics

- ✅ User role = Subscription tier (1:1 mapping)
- ✅ Simple and clear pricing model
- ✅ Expert fully controls their own subscription
- ✅ No complexity around multi-member billing

---

## 2️⃣ Clinic Model (Future - Phase 2)

### Architecture

```
Clinic Admin Creates Organization
  ↓
Clinic Org (type: 'clinic')
  ↓
Invites Multiple Experts
  ├─ Dr. Maria (expert_top)
  ├─ Dr. João (expert_community)
  └─ Dr. Ana (expert_community)
  ↓
Clinic subscribes to Workspace Plan ($99-199/month)
  ↓
Each expert keeps INDIVIDUAL commission rate
```

### Example: Multi-Expert Clinic

```typescript
{
  organization: {
    type: 'clinic',
    name: "Family Health Clinic",
    members: 3
  },
  subscription: {
    orgId: 'org_clinic_789',
    tierLevel: 'top', // Clinic's primary tier (for features)
    planType: 'monthly',
    monthlyFee: 9900, // $99/month workspace fee
  },
  members: [
    {
      // Dr. Maria - Top Expert
      user: {
        role: 'expert_top',
        workosUserId: 'user_maria'
      },
      commission: {
        // Her patients pay 8% commission
        commissionRate: 800 // 8% (basis points)
      }
    },
    {
      // Dr. João - Community Expert
      user: {
        role: 'expert_community',
        workosUserId: 'user_joao'
      },
      commission: {
        // His patients pay 12% commission
        commissionRate: 1200 // 12%
      }
    },
    {
      // Dr. Ana - Community Expert
      user: {
        role: 'expert_community',
        workosUserId: 'user_ana'
      },
      commission: {
        // Her patients pay 12% commission
        commissionRate: 1200 // 12%
      }
    }
  ]
}
```

### Commission Calculation Flow

```typescript
// When patient books with Dr. Maria (expert_top):
1. Patient pays $100 for appointment
2. System looks up Dr. Maria's role: 'expert_top'
3. System looks up clinic subscription: planType: 'annual'
4. Commission = 8% (based on Dr. Maria's role, NOT clinic tier)
5. Dr. Maria receives: $92 ($100 - $8)

// When patient books with Dr. João (expert_community):
1. Patient pays $100 for appointment
2. System looks up Dr. João's role: 'expert_community'
3. System looks up clinic subscription: planType: 'annual'
4. Commission = 12% (based on Dr. João's role)
5. Dr. João receives: $88 ($100 - $12)
```

### Key Characteristics

- ✅ Each expert keeps their individual tier for commission
- ✅ Fair compensation (top experts earned their lower rates)
- ✅ Talent retention (experts maintain benefits in clinics)
- ✅ Growth incentive (community experts can upgrade to top)
- ✅ Workspace subscription is separate from commissions
- ✅ Industry standard (Cal.com, Vercel use similar models)

---

## 🔑 Critical Design Decisions

### 1. Per-Expert Commission Rates

**Decision:** Commission rates are based on individual expert's role, not organization subscription.

**Why?**

- **Fair Compensation:** Top experts earned their lower commission through achievement
- **Talent Retention:** Experts keep their benefits when joining clinics
- **Growth Incentive:** Community experts have clear path to top tier
- **Industry Standard:** Cal.com, Vercel, Dub all use per-member pricing

**Alternative Considered (Rejected):**

- Org-level commission (all experts pay same rate)
- **Problem:** Unfair to top experts who earned their tier
- **Problem:** No growth incentive for community experts
- **Problem:** Makes clinics less attractive to top talent

### 2. Organization Owns Subscription

**Decision:** Organizations own subscriptions (one per org), not users.

**Why?**

- Industry standard (Cal.com, Vercel, Dub)
- Enables team billing for clinics
- Subscription persists if billing admin leaves
- Clear ownership model for data and compliance

**See:** `.cursor/plans/subscription-billing-entity-analysis.md`

### 3. Role Determines Commission Tier

**Decision:** User role (`expert_community` or `expert_top`) determines commission rate.

**Why?**

- Simplifies logic (single source of truth)
- Works for both solo experts and clinics
- Clear eligibility criteria
- Easy to understand and communicate

**Future Consideration:**
Separate roles into two concepts:

- **Permission Roles:** What they can DO (expert, lecturer, admin)
- **Qualification Badges:** Achievement status (verified, top_rated, featured)

---

## 📊 Implementation Reference

### Database Schema

See detailed documentation in:

- `drizzle/schema-workos.ts` - OrganizationType enum (lines 54-88)
- `drizzle/schema-workos.ts` - UsersTable role field (lines 167-196)
- `drizzle/schema-workos.ts` - SubscriptionPlansTable (lines 710-774)
- `drizzle/schema-workos.ts` - TransactionCommissionsTable (lines 839-895)

### Server Actions

- `server/actions/commissions.ts` - Commission calculation logic (lines 1-54)
- `server/actions/commissions.ts` - Tier determination (lines 216-238)
- `server/actions/subscriptions.ts` - Subscription management

### Configuration

- `config/subscription-pricing.ts` - Pricing tiers and rates (lines 1-45)

---

## 🚀 Future Phases

### Phase 2: Clinic Support (Q2 2025)

**Features:**

- Multi-member organization creation
- Clinic admin dashboard
- Member invitation system
- Per-expert commission tracking
- Unified clinic billing

**Migration Path:**

- No changes to solo experts
- New clinic subscription plans
- Workspace fee + per-expert commissions
- Existing solo experts can join clinics while keeping their tier

### Phase 3: Advanced Features (Q3 2025)

**Potential Features:**

- Qualification badge system (separate from roles)
- Custom commission agreements
- Revenue sharing models
- Clinic analytics dashboard
- Multi-location support

---

## 📚 Related Documentation

- `.cursor/plans/subscription-billing-entity-analysis.md` - Why orgs own subscriptions
- `.cursor/plans/SUBSCRIPTION-PRICING-MASTER.md` - Complete pricing strategy
- `docs/02-core-systems/ROLE-PROGRESSION-SYSTEM.md` - Role progression details
- `docs/02-core-systems/SUBSCRIPTION-IMPLEMENTATION-STATUS.md` - Implementation status

---

## ✅ Verification

**Solo Expert Implementation:**

- [x] OrganizationType enum documented
- [x] User role field documented
- [x] SubscriptionPlansTable documented
- [x] TransactionCommissionsTable documented
- [x] Commission calculation logic documented
- [x] Subscription pricing config documented

**Clinic Implementation:**

- [ ] Multi-member org creation
- [ ] Clinic subscription plans
- [ ] Per-expert commission logic (already ready in code!)
- [ ] Clinic admin UI
- [ ] Member invitation flow

---

**Last Updated:** 2025-02-06  
**Next Review:** Q2 2025 (before clinic Phase 2)
