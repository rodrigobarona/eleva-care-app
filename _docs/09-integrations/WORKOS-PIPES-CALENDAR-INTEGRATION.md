# WorkOS Pipes Calendar Integration

## Overview

Calendar integration uses **WorkOS Pipes** to securely connect third-party calendars (Google Calendar, Microsoft Outlook) without managing OAuth flows, token refresh, or credential storage.

**Key Principle:** Calendar is optional. The database (`schedule_availabilities`, `blocked_dates`, `slot_reservations`) is the source of truth for availability. Connected calendars provide additive free/busy checks and optional event syncing.

## Architecture

```
src/lib/integrations/calendar/
  types.ts          # CalendarProvider, CalendarInfo, CalendarAdapter interfaces
  pipes.ts          # WorkOS Pipes: getCalendarToken(), isCalendarConnected(), getPipesWidgetToken()
  google.ts         # GoogleCalendarAdapter (implements CalendarAdapter)
  outlook.ts        # OutlookCalendarAdapter (implements CalendarAdapter)
  service.ts        # CalendarService facade (the only thing consumers import)
  index.ts          # Barrel export

src/server/actions/
  calendar.ts       # Server actions: connection status, list calendars, set destination

src/components/features/calendar/
  CalendarIntegrations.tsx       # Pipes Widget + connection status
  DestinationCalendarSelector.tsx # Calendar picker for event destination
```

### Data Flow

1. **Expert connects calendar** via Pipes Widget on `/account/security`
2. **Expert selects destination** calendar for new events
3. **Guest books appointment** on public booking page:
   - Availability comes from `schedule_availabilities` + `blocked_dates` (DB)
   - If calendar connected: `CalendarService.getAllFreeBusy()` adds external conflicts
   - If no calendar: free/busy returns `[]` (no external conflicts)
4. **Meeting created:**
   - Always saved to `meetings` table in DB
   - If destination calendar set: `CalendarService.createEvent()` pushes to external calendar
   - If no destination: only DB record, no external sync

## OAuth Scopes

### Google Calendar

| Scope | Classification | Purpose |
|---|---|---|
| `calendar.calendarlist.readonly` | Non-sensitive | List calendars for destination selection |
| `calendar.events.freebusy` | Non-sensitive | Free/busy availability only, no event details |
| `calendar.events.owned` | Sensitive | CRUD on calendars the user owns only |

**Review requirement:** Only `calendar.events.owned` is sensitive and requires a standard Google OAuth review (3-5 business days). The other two are non-sensitive. None are "restricted" -- no security assessment needed.

### Microsoft Outlook

| Scope | Purpose |
|---|---|
| `Calendars.ReadWrite` | List calendars, free/busy, CRUD events |
| `User.Read` | Basic user profile |

## WorkOS Dashboard Setup

### Google Calendar Provider

1. Go to WorkOS Dashboard > **Pipes**
2. Click **Connect Provider** > **Google Calendar**
3. For sandbox: use shared credentials
4. For production:
   - Create a Google Cloud OAuth app
   - Copy the redirect URI from WorkOS into Google Cloud Console
   - Set scopes: `calendar.calendarlist.readonly`, `calendar.events.freebusy`, `calendar.events.owned`
   - Copy Client ID and Secret into WorkOS
5. Description: "Connect your Google Calendar to sync appointments and check availability"

### Microsoft Outlook Calendar Provider

1. Click **Connect Provider** > **Microsoft Outlook Calendar**
2. For sandbox: use shared credentials
3. For production:
   - Register an Azure AD app
   - Copy the redirect URI from WorkOS into Azure
   - Set scopes: `Calendars.ReadWrite`, `User.Read`
   - Copy Client ID and Secret into WorkOS
4. Description: "Connect your Outlook Calendar to sync appointments and check availability"

### CORS Configuration

Add your app's domain to WorkOS Dashboard > **Configuration** > **Allowed Origins**.

## Database

### `destination_calendars` Table

Stores the user's selected calendar where new booking events are pushed:

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | text | FK to `users.workos_user_id` (unique) |
| `provider` | text | `'google-calendar'` or `'microsoft-outlook-calendar'` |
| `external_id` | text | Calendar ID from provider |
| `calendar_name` | text | Display name |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-set |

### Legacy Columns (to remove in future migration)

These columns in `users` table are no longer read by any code:

- `vault_google_access_token`
- `vault_google_refresh_token`
- `google_token_encryption_method`
- `google_token_expiry`
- `google_scopes`
- `google_calendar_connected`
- `google_calendar_connected_at`

## Environment Variables

**Removed** (credentials now live in WorkOS Dashboard):
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

**Unchanged:**
- `WORKOS_API_KEY`
- `WORKOS_CLIENT_ID`

## Consumer Reference

| File | How it uses calendar |
|---|---|
| `src/server/actions/meetings.ts` | `CalendarService.getAllFreeBusy()` for time validation, `CalendarService.createEvent()` for pushing events |
| `src/app/(marketing)/[locale]/[username]/[eventSlug]/page.tsx` | `CalendarService.getAllFreeBusy()` for public booking page availability |
| `src/components/features/booking/EventBookingList.tsx` | `CalendarService.getAllFreeBusy()` for event listing availability |
| `src/app/api/webhooks/stripe/handlers/payment.ts` | `CalendarService.createEvent()` for deferred calendar creation after payment |
| `src/app/api/cron/keep-alive/route.ts` | Token refresh removed (handled by WorkOS Pipes) |

## Extending to New Providers

To add a new calendar provider (e.g., Apple Calendar):

1. Add the slug to `CalendarProvider` type in `types.ts`
2. Create `apple.ts` implementing `CalendarAdapter`
3. Register it in `service.ts` adapters map
4. Configure the provider in WorkOS Dashboard > Pipes

No changes needed in consumers -- `CalendarService.getAllFreeBusy()` automatically queries all connected providers.

## Deleted Legacy Files

```
src/lib/integrations/google/oauth-tokens.ts    # Manual token encrypt/decrypt/refresh
src/lib/integrations/google/calendar.ts         # Wrapper around old singleton
src/lib/integrations/google/calendar-list.ts    # Used old OAuth client
src/lib/integrations/google/calendar-scopes.ts  # Scope validation for old token format
src/lib/integrations/google/index.ts            # Re-export barrel
src/server/googleCalendar.ts                    # 583-line monolith singleton
src/server/actions/google-calendar.ts           # Placeholder OAuth URL + dead TODO code
src/components/features/calendar/ConnectGoogleCalendar.tsx  # Custom UI, never imported
src/app/api/auth/google/callback/route.ts       # OAuth callback (tokens in URL params)
```

## Risks and Notes

- **WorkOS Pipes plan tier:** Verify Pipes is available on your WorkOS plan
- **Re-connection:** Existing users with stored tokens need to reconnect via Pipes (one-time)
- **Google sensitive review:** 3-5 business days, requires demo video + justification
- **Azure AD registration:** Required for Outlook production (approx. 24 hours)
- **No calendar = no external conflict detection:** External appointments won't block slots unless the expert blocks them manually via `/booking/schedule`
