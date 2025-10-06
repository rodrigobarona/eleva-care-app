# Timezone Handling Fix - Expert Schedule and Appointments Display

**Date**: October 6, 2025  
**Issue**: Expert appointments and schedule were displaying in UTC instead of the expert's configured timezone  
**Status**: ✅ Fixed

## Problem Analysis

### Root Cause

The application was storing times correctly in UTC in the database, but when displaying appointments to experts, it was using the browser's local timezone or UTC instead of the expert's configured timezone from their schedule settings.

### Affected Components

1. **Appointments Page** (`app/(private)/appointments/page.tsx`)
2. **Appointment Card** (`components/organisms/AppointmentCard.tsx`)
3. **Appointments API** (`app/api/appointments/route.ts`)

## Solution Overview

### Architecture

The application follows timezone best practices:

```
┌─────────────────────────────────────────────────────────────┐
│                     Timezone Flow                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Guest books appointment                                  │
│     └─> Guest's timezone stored in MeetingTable.timezone    │
│     └─> Times stored in UTC (startTime, endTime)            │
│                                                              │
│  2. Expert configures schedule                               │
│     └─> Expert's timezone stored in ScheduleTable.timezone  │
│     └─> Availability times stored as local times (09:00)    │
│                                                              │
│  3. Display to Expert                                        │
│     └─> Fetch expert's timezone from ScheduleTable          │
│     └─> Convert UTC times to expert's timezone using        │
│         formatInTimeZone() from date-fns-tz                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Storage**: Always store dates/times in UTC in the database
2. **Expert Timezone**: Stored in `ScheduleTable.timezone` (one per expert)
3. **Guest Timezone**: Stored in `MeetingTable.timezone` (one per meeting)
4. **Display**: Use `formatInTimeZone()` to display times in the appropriate timezone

## Changes Made

### 1. Appointments API (`app/api/appointments/route.ts`)

**Before**: API returned only appointment data with guest's timezone
**After**: API now fetches and returns expert's timezone from ScheduleTable

```typescript
// Fetch the expert's timezone from their schedule
const schedule = await db.query.ScheduleTable.findFirst({
  where: (fields, { eq: eqOp }) => eqOp(fields.clerkUserId, userId),
});

// Default to UTC if no schedule is found (fallback)
const expertTimezone = schedule?.timezone || 'UTC';

return NextResponse.json({
  expertTimezone, // Include expert's timezone in response
  appointments: [...],
  reservations: [...],
});
```

### 2. Appointments Page (`app/(private)/appointments/page.tsx`)

**Before**: Did not track or use expert's timezone
**After**: Stores expert's timezone from API and passes it to AppointmentCard

```typescript
const [expertTimezone, setExpertTimezone] = React.useState<string>('UTC');

// In loadAppointments callback
if (data.expertTimezone) {
  setExpertTimezone(data.expertTimezone);
}

// When rendering
<AppointmentCard
  appointment={item}
  customerId={item.customerId}
  expertTimezone={expertTimezone}
/>
```

### 3. Appointment Card (`components/organisms/AppointmentCard.tsx`)

**Before**: Used `format()` from date-fns which uses browser's local timezone
**After**: Uses `formatInTimeZone()` from date-fns-tz with expert's timezone

```typescript
import { formatInTimeZone } from 'date-fns-tz';

export function AppointmentCard({
  appointment,
  customerId,
  expertTimezone = 'UTC',
}: AppointmentCardProps) {
  // Display date in expert's timezone
  {formatInTimeZone(new Date(appointment.startTime), expertTimezone, 'EEEE, MMMM d, yyyy')}

  // Display times in expert's timezone
  {formatInTimeZone(new Date(appointment.startTime), expertTimezone, 'h:mm a')} -{' '}
  {formatInTimeZone(new Date(appointment.endTime), expertTimezone, 'h:mm a')} ({expertTimezone})
}
```

## Verification

### ✅ Schedule Form

- Already correctly implemented
- Stores timezone in `ScheduleTable.timezone`
- Stores availability times as local time strings (e.g., "09:00", "17:00")
- Uses `fromZonedTime()` in `getValidTimesFromSchedule()` to convert to UTC for comparisons

### ✅ Meeting Form

- Correctly stores guest's timezone in `MeetingTable.timezone`
- Stores times in UTC in the database
- Uses guest's timezone for email notifications

### ✅ Google Calendar Integration

- `googleCalendar.ts` correctly handles timezones
- Validates timezone before use
- Falls back to UTC if invalid timezone provided
- Uses `formatInTimeZone()` for email formatting

## Best Practices Applied

Based on [date-fns-tz documentation](https://github.com/marnusw/date-fns-tz):

1. **Storage**: Store all dates in UTC in the database ✅
2. **Display**: Use `formatInTimeZone()` to format dates in specific timezones ✅
3. **Conversion**: Use `toZonedTime()` when needed for date picker display ✅
4. **Validation**: Always validate timezone strings before use ✅

## Database Schema

### ScheduleTable

```typescript
{
  id: uuid,
  timezone: text, // Expert's configured timezone (e.g., "Europe/Lisbon")
  clerkUserId: text,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### MeetingTable

```typescript
{
  id: uuid,
  startTime: timestamp, // UTC
  endTime: timestamp,   // UTC
  timezone: text,       // Guest's timezone (for reference)
  // ... other fields
}
```

## Testing Checklist

- [x] Expert in Europe/Lisbon sees appointments in their timezone
- [x] Expert in America/New_York sees appointments in their timezone
- [x] Guest books in their timezone, expert sees in expert's timezone
- [x] Schedule availability times display correctly
- [x] Appointment cards show correct times and timezone label
- [x] Reservation expiration times display in expert's timezone
- [x] No UTC times shown to experts (except as fallback)

## Related Files

- `app/api/appointments/route.ts` - API endpoint
- `app/(private)/appointments/page.tsx` - Appointments list page
- `components/organisms/AppointmentCard.tsx` - Individual appointment display
- `lib/getValidTimesFromSchedule.ts` - Schedule availability logic
- `server/googleCalendar.ts` - Calendar integration
- `drizzle/schema.ts` - Database schema

## Notes

- **Vercel Hosting**: Vercel servers run in UTC, but this doesn't affect the application because we properly convert timezones for display
- **Guest Timezone**: Stored in `MeetingTable.timezone` for reference but not used for expert display
- **Fallback**: If expert has no schedule configured, defaults to UTC
- **Consistency**: All timezone conversions use `date-fns-tz` library for consistency

## Future Considerations

1. Consider adding timezone display to the schedule page header
2. Add timezone validation when experts change their schedule timezone
3. Consider showing both expert and guest timezones in appointment details
4. Add timezone conversion utility functions for common operations

## References

- [date-fns-tz Documentation](https://github.com/marnusw/date-fns-tz)
- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [MDN: Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
