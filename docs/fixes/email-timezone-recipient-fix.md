# Email Timezone Recipient-Specific Fix

**Date**: October 6, 2025  
**Issue**: Emails were not respecting recipient-specific timezones - experts received times in guest timezone  
**Status**: ✅ Fixed

## Problem Analysis

### Root Cause

The application was sending appointment confirmation emails to **EXPERTS** with times formatted in the **GUEST's timezone**, instead of the expert's configured timezone.

### Affected Components

1. **Server Action** (`server/actions/meetings.ts`) - Meeting creation notification
2. **Novu Workflows** (`config/novu.ts`) - Email payload structure
3. **Stripe Webhook** (`app/api/webhooks/stripe/handlers/payment.ts`) - Guest confirmation email

## The Critical Issue

### ❌ Before Fix

```typescript
// server/actions/meetings.ts - Line 313-342
const appointmentDate = formatInTimeZone(
  startTimeUTC,
  data.timezone || 'UTC', // ❌ GUEST's timezone!
  'EEEE, MMMM d, yyyy',
);

// Sending to EXPERT but with GUEST's timezone!
await triggerWorkflow({
  to: { subscriberId: data.clerkUserId }, // EXPERT
  payload: {
    timezone: data.timezone || 'UTC', // ❌ GUEST's timezone!
  },
});
```

**Problem**: Expert in `Europe/Lisbon` receives email saying "Appointment at 2:00 PM PST" when guest is in `America/Los_Angeles`

### ✅ After Fix

```typescript
// Fetch EXPERT's timezone from their schedule
const expertSchedule = await db.query.ScheduleTable.findFirst({
  where: (fields, { eq: eqOp }) => eqOp(fields.clerkUserId, data.clerkUserId),
});

const expertTimezone = expertSchedule?.timezone || 'UTC';
const guestTimezone = data.timezone || 'UTC';

// Format times in EXPERT's timezone
const appointmentDateForExpert = formatInTimeZone(
  startTimeUTC,
  expertTimezone, // ✅ EXPERT's timezone!
  'EEEE, MMMM d, yyyy',
);

// Send to EXPERT with EXPERT's timezone
await triggerWorkflow({
  to: { subscriberId: data.clerkUserId }, // EXPERT
  payload: {
    timezone: expertTimezone, // ✅ EXPERT's timezone!
    guestTimezone: guestTimezone, // Reference for context
  },
});
```

## Solution Architecture

### Timezone Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BOOKING PROCESS                              │
└─────────────────────────────────────────────────────────────────────┘

1️⃣ Guest Books Appointment
   ├── Guest selects time: 2:00 PM (America/Los_Angeles)
   ├── Stores in DB: 22:00 UTC
   └── Saves guest timezone: "America/Los_Angeles"

2️⃣ Expert Gets Notified
   ├── Fetches expert timezone from ScheduleTable: "Europe/Lisbon"
   ├── Converts UTC → Expert TZ: 22:00 UTC → 10:00 PM WET
   ├── Sends email: "Appointment at 10:00 PM (Europe/Lisbon)"
   └── Dashboard shows: "10:00 PM" in expert's timezone

3️⃣ Guest Gets Confirmation
   ├── Uses guest's timezone: "America/Los_Angeles"
   ├── Converts UTC → Guest TZ: 22:00 UTC → 2:00 PM PST
   ├── Sends email: "Appointment at 2:00 PM (America/Los_Angeles)"
   └── Shows guest: "2:00 PM" in their local time
```

## Code Changes

### 1. Server Action Update (`server/actions/meetings.ts`)

**Lines 310-352** - Added expert timezone fetching:

```typescript
// Step 10: Fetch expert's timezone and trigger Novu workflow for expert notification
try {
  // CRITICAL: Fetch expert's timezone from their schedule settings
  const expertSchedule = await db.query.ScheduleTable.findFirst({
    where: (fields, { eq: eqOp }) => eqOp(fields.clerkUserId, data.clerkUserId),
  });

  const expertTimezone = expertSchedule?.timezone || 'UTC';
  const guestTimezone = data.timezone || 'UTC';

  // Format date and time for the EXPERT in THEIR timezone
  const appointmentDateForExpert = formatInTimeZone(
    startTimeUTC,
    expertTimezone,
    'EEEE, MMMM d, yyyy',
  );
  const appointmentTimeForExpert = formatInTimeZone(startTimeUTC, expertTimezone, 'h:mm a');
  const appointmentDuration = `${event.durationInMinutes} minutes`;

  // Trigger Novu workflow to notify the expert (with EXPERT's timezone)
  const novuResult = await triggerWorkflow({
    workflowId: 'appointment-confirmation',
    to: {
      subscriberId: data.clerkUserId, // Expert's Clerk ID
      email: event.user?.email || undefined,
      firstName: event.user?.firstName || undefined,
      lastName: event.user?.lastName || undefined,
    },
    payload: {
      expertName:
        `${event.user?.firstName || ''} ${event.user?.lastName || ''}`.trim() || 'Expert',
      clientName: data.guestName,
      appointmentDate: appointmentDateForExpert, // ✅ Expert's timezone
      appointmentTime: appointmentTimeForExpert, // ✅ Expert's timezone
      timezone: expertTimezone, // ✅ Expert's timezone for display
      guestTimezone: guestTimezone, // Store guest's timezone for reference
      appointmentDuration,
      eventTitle: event.name,
      meetLink: meetingUrl || undefined,
      notes: data.guestNotes || undefined,
      locale: data.locale || 'en',
    },
  });
}
```

### 2. Novu Workflow Update (`config/novu.ts`)

**Lines 615-688** - Updated payload schema and documentation:

```typescript
export const appointmentConfirmationWorkflow = workflow(
  'appointment-confirmation',
  async ({ payload, step }) => {
    await step.email('appointment-confirmation-email', async () => {
      // CRITICAL: Use recipient-specific timezone
      // For EXPERT: payload.timezone (expert's timezone)
      // For GUEST: payload.guestTimezone (guest's timezone)
      // This email is sent to the EXPERT, so use payload.timezone
      const emailBody = await elevaEmailService.renderAppointmentConfirmation({
        expertName: payload.expertName,
        clientName: payload.clientName,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        timezone: payload.timezone, // ✅ Expert's timezone
        appointmentDuration: payload.appointmentDuration,
        eventTitle: payload.eventTitle,
        meetLink: payload.meetLink,
        notes: payload.notes,
        locale: payload.locale || 'en',
      });

      return {
        subject: `✅ Appointment Confirmed - ${payload.eventTitle}`,
        body: emailBody,
      };
    });
  },
  {
    name: 'Appointment Confirmations',
    description: 'Notifications for confirmed appointments (sent to expert with expert timezone)',
    payloadSchema: z.object({
      expertName: z.string(),
      clientName: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      timezone: z.string(), // Expert's timezone for display
      guestTimezone: z.string().optional(), // Guest's timezone for reference
      appointmentDuration: z.string(),
      eventTitle: z.string(),
      meetLink: z.string().optional(),
      notes: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
      appointmentId: z.string().optional(),
    }),
    tags: ['appointments', 'email'],
  },
);
```

### 3. Guest Email Confirmation (Already Correct)

**`app/api/webhooks/stripe/handlers/payment.ts` Lines 766-823** - Guest emails already use guest's timezone:

```typescript
const meetingTimezone = meetingDetails.timezone || 'UTC'; // Guest's timezone
const zonedStartTime = toZonedTime(meetingStartTime, meetingTimezone);
const appointmentDate = format(zonedStartTime, 'EEEE, MMMM d, yyyy', {
  timeZone: meetingTimezone, // ✅ Guest's timezone
});
const startTimeFormatted = format(zonedStartTime, 'h:mm a', {
  timeZone: meetingTimezone, // ✅ Guest's timezone
});
```

## Email Templates

### Email Template Structure (`emails/appointments/appointment-confirmation.tsx`)

The template correctly displays the timezone passed to it:

```typescript
<tr>
  <td style={createTableCellStyle(true)}>Time:</td>
  <td style={createTableCellStyle(false, 'right')}>
    {appointmentTime} ({timezone}) {/* ✅ Shows timezone dynamically */}
  </td>
</tr>
```

**Key Point**: The template itself doesn't care about timezones - it simply displays what it receives. The **responsibility of formatting times in the correct timezone is in the server action and webhook handlers**.

## Best Practices Applied

### 1. **Storage Best Practice** ✅

- **Store in UTC**: All times in `MeetingTable` are stored as UTC timestamps
- **Store timezone separately**: Both guest timezone and expert timezone are preserved

### 2. **Display Best Practice** ✅

- **Format for recipient**: Use `formatInTimeZone` to convert UTC → recipient's timezone
- **Expert emails**: Show times in expert's timezone from `ScheduleTable`
- **Guest emails**: Show times in guest's timezone from `MeetingTable.timezone`

### 3. **date-fns-tz Best Practices** ✅

From Context7 documentation:

```typescript
// ✅ CORRECT: Format UTC date in specific timezone
import { formatInTimeZone } from 'date-fns-tz';

const utcDate = new Date('2024-10-06T22:00:00Z'); // Stored in DB
formatInTimeZone(utcDate, 'Europe/Lisbon', 'h:mm a'); // "10:00 PM"
formatInTimeZone(utcDate, 'America/Los_Angeles', 'h:mm a'); // "2:00 PM"
```

## Testing Scenarios

### Scenario 1: Cross-Timezone Booking

**Setup:**

- Expert: Dr. Silva in Lisbon (`Europe/Lisbon` = UTC+0/+1)
- Guest: John in Los Angeles (`America/Los_Angeles` = UTC-8/-7)
- Appointment: Guest books for 2:00 PM their time

**Expected Results:**

| Recipient          | Timezone            | Display Time | Email Content                                            |
| ------------------ | ------------------- | ------------ | -------------------------------------------------------- |
| Guest (John)       | America/Los_Angeles | 2:00 PM PST  | "Appointment at 2:00 PM - 3:00 PM (America/Los_Angeles)" |
| Expert (Dr. Silva) | Europe/Lisbon       | 10:00 PM WET | "Appointment at 10:00 PM - 11:00 PM (Europe/Lisbon)"     |
| Database           | UTC                 | 22:00:00 UTC | `startTime: 2024-10-06T22:00:00Z`                        |

### Scenario 2: Same Timezone Booking

**Setup:**

- Expert: Dr. Santos in Lisbon (`Europe/Lisbon`)
- Guest: Maria in Porto (`Europe/Lisbon`)
- Appointment: Guest books for 3:00 PM

**Expected Results:**

| Recipient           | Timezone      | Display Time                                   |
| ------------------- | ------------- | ---------------------------------------------- |
| Guest (Maria)       | Europe/Lisbon | 3:00 PM WET                                    |
| Expert (Dr. Santos) | Europe/Lisbon | 3:00 PM WET                                    |
| Database            | UTC           | 14:00:00 UTC (winter) or 13:00:00 UTC (summer) |

### Scenario 3: Daylight Saving Time Transition

**Setup:**

- Expert in `America/New_York` (DST transitions)
- Guest in `Asia/Tokyo` (no DST)
- Appointment booked for after DST change

**Expected Results:**

- Times automatically adjust based on DST rules
- UTC storage prevents confusion
- `formatInTimeZone` handles DST automatically

## Related Files Modified

1. ✅ `server/actions/meetings.ts` - Expert timezone fetching and formatting
2. ✅ `config/novu.ts` - Workflow payload schema updates
3. ✅ `app/api/appointments/route.ts` - Dashboard timezone display (from previous fix)
4. ✅ `components/organisms/AppointmentCard.tsx` - Expert dashboard display (from previous fix)

## Verification Checklist

- [x] Expert receives email with times in their timezone
- [x] Guest receives email with times in their timezone
- [x] Dashboard shows expert times in their timezone
- [x] Database stores times in UTC
- [x] Both timezones are preserved for reference
- [x] Email templates receive correct formatted times
- [x] Novu workflows support both timezones
- [x] No timezone data loss during the flow

## Key Takeaways

### 🎯 Golden Rules for Timezone Handling

1. **Storage**: Always store in UTC (`Date` objects in database)
2. **Transmission**: Store timezone strings separately for each user
3. **Display**: Format times for the **recipient**, not the sender
4. **Emails**: Each recipient gets times in **their** timezone
5. **UI**: Show times in the **logged-in user's** timezone

### 🔄 The Complete Flow

```
Guest Books (PST)
    ↓
Store UTC + Guest TZ
    ↓
    ├─→ Email to Expert: Format UTC → Expert TZ (WET)
    └─→ Email to Guest: Format UTC → Guest TZ (PST)
```

## Future Enhancements

1. **Calendar Integration**: Ensure Google Calendar events respect timezones
2. **Reminder Emails**: Use recipient-specific timezone for "1 hour before" reminders
3. **Multi-timezone Display**: Show "2:00 PM (your time) / 10:00 PM (their time)"
4. **Timezone Validation**: Warn users when booking across drastically different timezones

## References

- [date-fns-tz Documentation](https://github.com/marnusw/date-fns-tz)
- [IANA Timezone Database](https://www.iana.org/time-zones)
- [MDN: Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [Stripe Timezone Best Practices](https://stripe.com/docs/connect/payouts#timezone-considerations)

---

**Status**: ✅ **RESOLVED** - All emails now respect recipient-specific timezones
**Impact**: Critical user experience improvement for international bookings
**Priority**: P0 - This was causing confusion for experts and guests in different timezones
