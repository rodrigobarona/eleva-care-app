# Email Render Contract & Expert-Notification Timing

> Audience: anyone touching `lib/integrations/novu/email-service.ts`,
> `emails/**/*.tsx`, `config/novu.ts`, the Stripe webhook handlers, or the
> appointment cron jobs.
>
> This document is the post-incident write-up for two production bugs and the
> guard rails that prevent them from coming back. Both are tracked under the
> plan `fix_fake_email_content_bug`.

## 1. The two production bugs this fixes

### Bug 1 — Placeholder-leak in customer emails

A customer named **Matilde Henriques** received a confirmation email addressed
to **"João Silva"** for a service called **"Consulta de Cardiologia"** — none
of which were her real booking data. Root cause:

1. Every React Email template under `emails/` had **realistic-looking sample
   defaults** (`patientName = 'João Silva'`, `expertName = 'Dr. Maria Santos'`,
   `eventTitle = 'Consulta de Cardiologia'`, `appointmentDate = '2024-02-15'`).
2. `ElevaEmailService` routed every render call through
   `renderEmailWithSelection`, which spread the workflow payload directly onto
   the React Email component **without translating prop names**. Workflow keys
   (`userName`, `customerName`, `serviceName`, `meetingUrl`) did not match
   template props (`patientName`, `clientName`, `eventTitle`, `meetLink`), so
   every prop fell through to the realistic default and that sample data
   surfaced in the production email.
3. `templateMappings['appointment-universal'].reminder.*` pointed at
   `AppointmentConfirmationTemplate` — so reminder emails additionally rendered
   as "✅ Appointment Confirmed!" instead of "Appointment Reminder".

### Bug 2 — Expert spam from the `patimota@gmail.com` incident

The expert **Patricia Mota** received in a single day:

- 7× **"⏰ Pending booking cancelled"** emails for Multibanco vouchers from
  three different customers that ultimately expired without payment.
- "📅 New Booking" emails for the same bookings — sent **before payment was
  ever confirmed**.

Root cause:

1. `server/actions/meetings.ts:createMeeting` triggered the
   `appointment-confirmation` workflow (which emails the expert) **whenever** a
   `MeetingTable` row was created, including Multibanco rows with
   `stripePaymentStatus === 'pending'`.
2. `app/api/cron/cleanup-expired-reservations/route.ts` triggered
   `reservation-expired` for **both** the patient and the expert when a voucher
   expired — so the expert got a "Cancelled" email for a booking they
   shouldn't have known existed in the first place.

## 2. The contract — read this before adding a new email

### 2.1 Templates: neutral defaults only

Every React Email template under `emails/` MUST use **neutral fallback values**
for any string the caller might forget to pass:

| Field kind                          | Neutral fallback             |
| ----------------------------------- | ---------------------------- |
| Identity (`clientName`, `userName`) | `'Customer'`                 |
| Expert name                         | `'Your Expert'` / `'Expert'` |
| Service / event title               | `'Your appointment'`         |
| Date, time, timezone, duration      | `''` (empty)                 |
| Optional notes / messages           | `undefined`                  |
| IDs, URLs, transaction codes        | `''` (empty)                 |
| Amounts                             | `'0.00'`                     |

Realistic sample data (`'João Silva'`, `'Dr. Maria Santos'`,
`'Consulta de Cardiologia'`, etc.) belongs in the template's
`*.PreviewProps` block — used **only** by the React Email dev preview, never
by production rendering.

If a missing prop would make the email confusing (e.g. an empty button label),
guard the surrounding JSX with a conditional render rather than supplying a
fake default.

### 2.2 Workflow payload ↔ template props

Workflow trigger payloads at the call site (`server/googleCalendar.ts`,
`server/actions/meetings.ts`, `app/api/webhooks/stripe/handlers/payment.ts`,
`app/api/cron/appointment-reminders/route.ts`, etc.) use one set of names;
templates often use different ones. The bug came from spreading a payload onto
a template and assuming the names matched.

**Two valid ways to bridge the gap:**

1. **Manually map the props** in the corresponding render method
   (`ElevaEmailService.render*`). This is what every render method now does
   after the initial remediation that disabled the dynamic selection path —
   and what new render methods MUST do.
2. **Register a typed adapter** in `propAdapters` inside
   `lib/integrations/novu/email-service.ts`. The adapter receives the workflow
   payload and returns the template's prop bag. This is required if the
   dynamic selection layer (gated by `ENABLE_DYNAMIC_TEMPLATE_SELECTION`) is
   used for that workflow.

`renderEmailWithSelection` calls `getPropAdapter(selector)(data)` before
`React.createElement(template, …)`, so a missing or incorrect adapter is the
ONLY way placeholder leaks can come back.

### 2.3 Tests are mandatory

Every render method has a regression test in
`tests/lib/integrations/novu/email-service.test.ts` that:

- Renders the template with a realistic payload and asserts the real values
  appear in the HTML.
- Asserts none of the strings in `PLACEHOLDER_LEAK_STRINGS` (the original
  sample defaults) appear in the HTML.

Adding a new render method without adding the matching regression test will
let the bug recur silently.

## 3. Expert-notification timing rules

### Rule 1 — Experts are NEVER emailed about an unpaid booking

Concretely:

| Booking situation                           | Expert receives "New Booking"?              |
| ------------------------------------------- | ------------------------------------------- |
| Card payment, `payment_status === 'paid'`   | ✅ Yes (from `createMeeting`)               |
| Free event (`stripePaymentStatus` is null)  | ✅ Yes (from `createMeeting`)               |
| Multibanco at checkout (`unpaid`/`pending`) | ❌ No — wait                                |
| Multibanco after `payment_intent.succeeded` | ✅ Yes (from `createDeferredCalendarEvent`) |
| Multibanco voucher expires unpaid           | ❌ Never                                    |

The single source of truth is `triggerExpertAppointmentConfirmation` in
`server/actions/meetings.ts`. Both call sites pass the **same** Novu
`transactionId` (`expert-appointment-${meetingId}`) so duplicate fires from
race conditions are deduplicated by Novu.

### Rule 2 — Experts are NEVER emailed about an expired voucher

The expert never knew about the unpaid booking (Rule 1), so emailing them when
its voucher expires is noise. Enforced in two places:

1. `app/api/cron/cleanup-expired-reservations/route.ts` no longer has an
   expert branch — only patients are emailed.
2. `reservationExpiredWorkflow` in `config/novu.ts` early-returns with a
   warning if `recipientType: 'expert'` is somehow passed in. This is defense
   in depth; the test at
   `tests/lib/integrations/novu/expert-notification-timing.test.ts` asserts
   the guard is in place.

### Rule 3 — Failure must never block payment processing

`triggerExpertAppointmentConfirmation` catches every error and logs it but
never throws. Notifications are best-effort; payment processing is not.

## 4. Observability

Every render path emits a Sentry breadcrumb via `recordRenderBreadcrumb` in
`email-service.ts`:

```ts
{
  category: 'email.render',
  message: 'Rendering <TemplateName>',
  data: {
    workflowId,
    eventType,
    templateName,
    locale,
    providedKeys: [...alphabetized payload keys],
  },
}
```

When debugging a "wrong-content email" report:

1. Pull the Sentry trail for the user's session — the breadcrumb shows which
   template was rendered, what workflow + event triggered it, and which keys
   were actually present in the payload.
2. Cross-reference `providedKeys` with the template's prop interface. If a
   key is missing, check the trigger site (`server/actions/meetings.ts`,
   webhook handlers, cron jobs) to see why.

## 5. Cross-references

- Plan: `fix_fake_email_content_bug` (in `.cursor/plans/`)
- Code:
  - `lib/integrations/novu/email-service.ts` — render methods, template mappings, prop adapters, `recordRenderBreadcrumb`
  - `emails/**/*.tsx` — neutral defaults + `PreviewProps`
  - `server/actions/meetings.ts` — `createMeeting` step 10, `triggerExpertAppointmentConfirmation`
  - `app/api/webhooks/stripe/handlers/payment.ts` — `createDeferredCalendarEvent`
  - `app/api/cron/cleanup-expired-reservations/route.ts` — patient-only cancellation notice
  - `config/novu.ts` — `reservationExpiredWorkflow` expert-recipient guard
- Tests:
  - `tests/lib/integrations/novu/email-service.test.ts` — placeholder-leak regression + mapping + adapter
  - `tests/lib/integrations/novu/expert-notification-timing.test.ts` — workflow guard
