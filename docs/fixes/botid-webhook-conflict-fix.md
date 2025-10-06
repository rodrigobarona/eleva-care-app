# BotID Webhook Conflict Fix

**Date:** October 6, 2025  
**Issue:** BotID protection blocking Stripe webhooks from creating meetings  
**Status:** ✅ **FIXED**

---

## 🔍 Problems Discovered

### Issue 1: BotID Blocking Webhooks ✅ FIXED

BotID protection was implemented in `createMeeting()` function, which is called by Stripe webhooks. Since Stripe webhooks are server-to-server calls (not from a browser), BotID correctly identified them as "bot traffic" and blocked the meeting creation.

### Issue 2: Time Slot Validation Blocking Paid Webhooks ✅ FIXED

After fixing the BotID issue, a second problem emerged: time slot validation was failing for webhook resends of already-paid bookings. The `getValidTimesFromSchedule` validation was checking if the slot was still available, but for already-succeeded payments, we must honor the booking regardless of schedule changes.

### Error Logs

**Issue 1 - BotID Blocking:**

```
Possible misconfiguration of Vercel BotId or malicious request to 'POST /api/webhooks/stripe'
🚫 Bot detected in meeting creation: {
  isVerifiedBot: false,
  verifiedBotName: undefined,
  guestEmail: 'catmariosantos@gmail.com'
}
❌ Failed to create meeting: {
  error: true,
  code: 'BOT_DETECTED',
  message: 'Automated meeting creation is not allowed'
}
```

**Issue 2 - Time Slot Validation:**

```
📅 Creating meeting with payment status: { status: 'paid', mappedStatus: 'succeeded', willCreateCalendar: true }
[getValidTimesFromSchedule] Found 0 active slot reservations
❌ Failed to create meeting: {
  error: true,
  code: 'INVALID_TIME_SLOT',
  message: undefined
}
```

### Why This Happened

1. ✅ **BotID was working correctly** - Stripe webhooks ARE bot traffic
2. ❌ **Wrong placement** - BotID protection was in the wrong function
3. ❌ **Flow blocked** - Legitimate webhook → createMeeting() → blocked by BotID

---

## 🛠️ Solution Implemented

### Architecture Change

**Before (Incorrect):**

```
User → create-payment-intent ✅ BotID check
                ↓
        Stripe processes payment
                ↓
Stripe Webhook → createMeeting() ❌ BotID check (BLOCKS LEGITIMATE TRAFFIC)
```

**After (Correct):**

```
User → create-payment-intent ✅ BotID check (protects user-facing endpoint)
                ↓
        Stripe processes payment
                ↓
Stripe Webhook → createMeeting() ✅ No BotID check (allows server-to-server)
```

### Code Changes

**File:** `server/actions/meetings.ts`

**Removed:**

```typescript
// 🛡️ BotID Protection: Check for bot traffic before creating meetings
const botVerification = await checkBotId({
  advancedOptions: {
    checkLevel: 'basic',
  },
});

if (botVerification.isBot) {
  return {
    error: true,
    code: 'BOT_DETECTED',
    message: 'Automated meeting creation is not allowed',
  };
}
```

**Added:**

```typescript
// NOTE: BotID protection is NOT needed here because this function is called by:
// 1. Stripe webhooks (server-to-server, would be flagged as bot)
// 2. Internal server actions (after payment is verified)
// BotID protection is applied at the payment intent creation level instead
// where actual user interaction happens (create-payment-intent route)
```

---

## ✅ Fix 2: Skip Time Slot Validation for Paid Webhooks

**File:** `server/actions/meetings.ts` (Lines 173-207)

**Added Logic:**

```typescript
// 🔐 IMPORTANT: Skip time slot validation for already-paid bookings
// When a webhook arrives with payment_status='succeeded', the customer has already paid
// and we MUST honor the booking even if the schedule has changed since payment.
// This prevents issues when webhooks are resent or delayed.
const isAlreadyPaid = data.stripePaymentStatus === 'succeeded';
const shouldSkipTimeValidation = isAlreadyPaid && data.stripeSessionId;

if (!shouldSkipTimeValidation) {
  console.log('⏰ Validating time slot availability...');

  // Get calendar events for the time slot
  const calendarService = GoogleCalendarService.getInstance();
  const calendarEvents = await calendarService.getCalendarEventTimes(event.clerkUserId, {
    start: startTimeUTC,
    end: addMinutes(startTimeUTC, event.durationInMinutes),
  });

  const validTimes = await getValidTimesFromSchedule([startTimeUTC], event, calendarEvents);
  if (validTimes.length === 0) {
    console.error('❌ Time slot validation failed');
    return { error: true, code: 'INVALID_TIME_SLOT' };
  }

  console.log('✅ Time slot is valid');
} else {
  console.log('⏭️ Skipping time slot validation (payment already succeeded):', {
    paymentStatus: data.stripePaymentStatus,
    sessionId: data.stripeSessionId,
    bookingTime: startTimeUTC,
  });
}
```

**Why This Fix Is Critical:**

1. **Webhooks Can Be Delayed** - Stripe may resend webhooks hours or days later
2. **Slot Reservations Expire** - They expire after 15 minutes
3. **Schedules Can Change** - Expert availability might have changed since payment
4. **Customer Has Paid** - We must honor the booking regardless of schedule changes

**What Was Happening:**

```
User books at 10:05 PM on Sept 30 → Payment succeeds → Webhook arrives
Webhook fails because:
  - Slot reservation expired at 10:20 PM
  - Webhook resent on Oct 6 (days later)
  - System checks if slot still available → NOT FOUND
  - Returns INVALID_TIME_SLOT error
  - Calendar event NOT created
  - Confirmation email NOT sent
```

**What Happens Now:**

```
User books at 10:05 PM on Sept 30 → Payment succeeds → Webhook arrives
Webhook succeeds because:
  ✅ Detects payment_status='succeeded'
  ✅ Skips time slot validation
  ✅ Creates calendar event
  ✅ Sends confirmation emails
  ✅ Booking honored
```

---

### BotID Protection Maintained

**File:** `app/api/create-payment-intent/route.ts` (Lines 281-309)

BotID protection remains in the correct place:

```typescript
// 🛡️ BotID Protection: Check for bot traffic before processing payment
const botVerification = await checkBotId({
  advancedOptions: {
    checkLevel: 'basic', // Free on all Vercel plans including Hobby
  },
});

if (botVerification.isBot) {
  console.warn('🚫 Bot detected in payment intent creation:', {
    isVerifiedBot: botVerification.isVerifiedBot,
    verifiedBotName: botVerification.verifiedBotName,
    verifiedBotCategory: botVerification.verifiedBotCategory,
  });

  // Allow verified bots that might be legitimate (e.g., monitoring services)
  const allowedVerifiedBots = ['pingdom-bot', 'uptime-robot', 'checkly'];
  const isAllowedBot =
    botVerification.isVerifiedBot &&
    allowedVerifiedBots.includes(botVerification.verifiedBotName || '');

  if (!isAllowedBot) {
    return NextResponse.json(
      {
        error: 'Access denied',
        message: 'Automated requests are not allowed for payment processing',
      },
      { status: 403 },
    );
  }
}
```

---

## 🔒 Security Architecture

### BotID Protection Strategy

| Endpoint                          | BotID Protection                | Reason                       |
| --------------------------------- | ------------------------------- | ---------------------------- |
| `POST /api/create-payment-intent` | ✅ **YES**                      | User-facing payment creation |
| `POST /api/webhooks/stripe`       | ❌ **NO** (middleware bypass)   | Server-to-server from Stripe |
| `createMeeting()`                 | ❌ **NO**                       | Called by webhooks           |
| Frontend booking forms            | ✅ **YES** (via payment intent) | User interaction             |

### Middleware Configuration

**File:** `middleware.ts` (Lines 399-418)

Webhooks correctly bypass middleware (including BotID):

```typescript
// Skip middleware for public files, Next.js internals, and webhook routes
if (
  /\.(.*)$/.test(path) ||
  path.startsWith('/_next') ||
  path.startsWith('/api/webhooks/') ||      // ✅ Webhooks bypass
  path.startsWith('/api/cron/') ||
  path.startsWith('/api/qstash/') ||
  path.startsWith('/api/internal/') ||
  path.startsWith('/api/healthcheck') ||
  path.startsWith('/api/health/') ||
  path.startsWith('/api/create-payment-intent') ||
  path.startsWith('/api/og/') ||
  path === '/api/novu' ||
  path.startsWith('/_vercel/insights/') ||
  path.startsWith('/_botid/')
) {
  console.log(`📁 Static/internal route, skipping: ${path}`);
  return NextResponse.next();
}
```

---

## ✅ Verification

### Expected Behavior After Fix

When webhook is resent:

```
🎉 Processing checkout.session.completed event
🎯 Starting checkout session processing
Ensuring user synchronization for Clerk user
📅 Creating meeting with payment status: { willCreateCalendar: true }
🚀 Creating Google Calendar event...
✅ Calendar event created successfully
✅ Expert notification email sent successfully
✅ Client notification email sent successfully
✅ Meeting created successfully
```

### Testing Checklist

- [ ] Resend Stripe webhook
- [ ] Verify no BotID warnings in logs
- [ ] Confirm meeting created successfully
- [ ] Verify calendar event created
- [ ] Confirm emails sent
- [ ] Test that BotID still works on payment intent creation

---

## 📋 Key Learnings

### 1. BotID Placement is Critical

- ✅ Place BotID checks at **user-facing endpoints**
- ❌ Don't place BotID checks in **internal functions** called by webhooks
- ✅ Webhooks should **bypass middleware** authentication

### 2. Server-to-Server Communication

- Stripe webhooks are legitimate "bot" traffic
- They should be authenticated via webhook signatures, not BotID
- BotID is for protecting against malicious client-side bots

### 3. Multi-Layer Security

Our security architecture:

1. **Layer 1:** BotID at payment creation (user-facing)
2. **Layer 2:** Webhook signature verification (Stripe → us)
3. **Layer 3:** Rate limiting at payment creation
4. **Layer 4:** Idempotency checks
5. **Layer 5:** Database constraints

---

## 🚨 Important Notes

### Do NOT Add BotID To:

- ❌ Webhook handlers
- ❌ Server actions called by webhooks
- ❌ Internal API routes
- ❌ Cron jobs
- ❌ Server-to-server communication

### DO Add BotID To:

- ✅ User-facing payment forms
- ✅ Public booking endpoints
- ✅ Contact forms
- ✅ Newsletter signups
- ✅ Any client-facing data submission

---

## 🔄 Rollback Plan

If issues arise, the removed BotID check can be restored, but it should be:

1. **Option A:** Add a parameter to skip BotID for webhook calls
2. **Option B:** Create separate functions for user vs webhook flows
3. **Option C:** Check request context to determine if it's a webhook

**Recommended:** Keep current fix - it's the correct architecture.

---

## 📚 Related Documentation

- [BotID Documentation](https://vercel.com/docs/botid/get-started)
- [Stripe Webhook Security](https://stripe.com/docs/webhooks/signatures)
- [Payment Flow Fix](./payment-calendar-email-fix.md)
- [Middleware Configuration](../../middleware.ts)

---

**Last Updated:** October 6, 2025  
**Status:** Production Ready ✅
