# Communication Names Audit & Fix

## Problem

Currently using usernames (e.g., "rbarona") or generic "Expert" in professional communications. This is unprofessional - people should see real names like "Dr. Patricia Smith" or "John Doe".

## Files That Need Fixing

### 1. `/app/api/webhooks/stripe/handlers/payout.ts`

**Current (❌ BAD):**
```ts
expertName: user.username || user.email || 'Expert',  // Shows "rbarona"
```

**Fixed (✅ GOOD):**
```ts
expertName: `${profile.firstName} ${profile.lastName}` || 'Expert',  // Shows "Patricia Smith"
```

**Lines:** 53, 116

---

### 2. `/app/api/webhooks/stripe/handlers/payment.ts`

**Current (❌ BAD):**
```ts
userName: 'Expert',  // Generic fallback
```

**Fixed (✅ GOOD):**
```ts
userName: expertProfile ? `${expertProfile.firstName} ${expertProfile.lastName}` : 'Expert',
```

**Lines:** 91, 122, 138, 206

---

### 3. `/lib/notifications/payment.ts`

**Current (❌ BAD):**
```ts
userName: 'Expert',  // Generic fallback in createPayoutFailedNotification
```

**Fixed (✅ GOOD):**
```ts
userName: expertName || 'Expert',  // Pass actual expert name from caller
```

**Line:** 206

---

## Name Resolution Strategy

### Priority Order:

1. **ProfilesTable** (Preferred - most up-to-date)
   - `firstName` + `lastName` from expert's public profile
   - Example: "Patricia" + "Smith" = "Patricia Smith"

2. **WorkOS User API** (Fallback)
   - `user.firstName` + `user.lastName` from WorkOS
   - Example: "John" + "Doe" = "John Doe"

3. **Username** (Last Resort)
   - Only if both above are empty
   - Example: "rbarona"

### Implementation Pattern:

```ts
// 1. Fetch user from UsersTable
const user = await db.query.UsersTable.findFirst({
  where: eq(UsersTable.stripeConnectAccountId, accountId),
});

// 2. Fetch profile from ProfilesTable
const profile = await db.query.ProfilesTable.findFirst({
  where: eq(ProfilesTable.workosUserId, user.workosUserId),
});

// 3. Get WorkOS user for fallback
const { user: workosUser } = await withAuth();

// 4. Build full name with fallbacks
const expertName = profile 
  ? `${profile.firstName} ${profile.lastName}`.trim()
  : workosUser
    ? `${workosUser.firstName || ''} ${workosUser.lastName || ''}`.trim()
    : user.username || 'Expert';
```

## Communication Contexts

### Expert Sees (about themselves):
- ✅ **"Patricia Smith"** (from ProfilesTable)
- ❌ NOT "rbarona" (username)
- ❌ NOT "Expert" (generic)

### Expert Sees (about patient/client):
- ✅ **"John Doe"** (from meeting guest name or customer name)
- ❌ NOT "john_patient" (if they had username)

### Patient Sees (about expert):
- ✅ **"Dr. Patricia Smith"** (from ProfilesTable with professional title)
- ❌ NOT "rbarona" (username)

## Files Fixed

- [x] `/app/api/webhooks/stripe/handlers/payout.ts` - Payout notifications
- [x] `/app/api/webhooks/stripe/handlers/payment.ts` - Payment notifications  
- [x] `/lib/notifications/payment.ts` - Notification helpers
- [x] `/app/api/cron/send-payment-reminders/route.ts` - Already fixed ✅

## Testing Checklist

- [ ] Payout notification shows expert's real name
- [ ] Payment success notification shows expert's real name
- [ ] Payment failure notification shows expert's real name
- [ ] Payment refund notification shows expert's real name
- [ ] Email notifications use real names
- [ ] In-app notifications use real names

---

**Date:** 2025-01-06  
**Status:** 🚧 In Progress  
**Impact:** High - Professional communication quality

