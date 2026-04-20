# AGENTS.md

## Learned User Preferences

- When the user says "commit and push", run `git commit --no-verify` and `git push --no-verify`; they repeatedly bypass pre-commit hooks.
- Treat user-provided plan files in `.cursor/plans/*.plan.md` as the source of truth: do not edit the plan, do not recreate the pre-existing todos, mark them `in_progress` as you work, and do not stop until every todo is complete.
- Before non-trivial library/framework work (Stripe, Next.js, Drizzle, Novu, React Email, etc.), consult the Context7 MCP for current best practices instead of relying on memory.
- Use the Stripe MCP to audit live Stripe configuration (products, prices, tax, Connect accounts, fees) when validating payment flows; cross-check with code rather than assuming.
- Reject silent fallbacks that mask root causes (e.g., schema rollout mismatches): diagnose and fix the underlying problem rather than papering over it.
- The user writes in mixed English and Portuguese with frequent typos; interpret intent, do not request rewordings or correct spelling.
- When asked to "verify each finding", read the cited code first and only apply a fix when the finding is genuinely present in the current code.
- Default to running production builds and scripts with `pnpm` / `pnpm tsx` (never npm or yarn).

## Learned Workspace Facts

- Stack: Next.js 16 App Router, TypeScript, Clerk auth (NOT WorkOS yet), Stripe + Stripe Connect, Novu for transactional emails, React Email templates, Drizzle ORM on Neon Postgres, Upstash Redis, QStash for cron schedules, Tailwind + shadcn/ui.
- Routing layout: private app under `app/(private)/...`, public localized pages under `app/[locale]/(public)/...` (locales include at least `pt` and `en`), HTTP handlers under `app/api/...`.
- Canonical form component is `components/features/forms/MeetingForm.tsx`; the file at `src/components/features/forms/MeetingForm.tsx` is a stale duplicate—do not edit it.
- Stripe model: Connect Express accounts with a 15% platform fee; supports Credit Card and Portuguese Multibanco (8-day expiry); use automatic payment methods (option A); promo codes can break fee math and need explicit handling.
- Portuguese tax: collect NIF only; do NOT require billing address for Portuguese tax IDs; Stripe Tax must be configured to reflect this.
- Stripe webhooks live in `app/api/webhooks/stripe/route.ts` with handlers in `app/api/webhooks/stripe/handlers/`; PaymentIntent enrichment must run before any early-return that skips Novu notifications so dispute/refund events can derive customer data.
- Novu integration sits in `config/novu.ts` and `lib/integrations/novu/` (notably `email-service.ts`, `email.ts`); workflow ids include `payment-universal` and `appointment-confirmation`; subscriber payload is built by `buildNovuSubscriberFromStripe`.
- Email templates live in `emails/` (React Email); preserve locale labels via `emails/utils/i18n.ts` (e.g., `locale === 'pt' ? 'Data' : 'Date'`); conditionally render rows when fields are empty strings.
- Database: schema in `drizzle/schema.ts`; the `neon-http` driver does NOT support transactions—use the pooled/serverless driver when transactions are required, or refactor to single-statement operations.
- FormCache (Redis-backed) has a known TOCTOU race between `isProcessing` and `set`; guard with atomic SET NX or a lock when adding new write paths.
- Cron schedules are driven by QStash and call `app/api/cron/appointment-reminders` and `app/api/cron/appointment-reminders-1hr`; if 0 crons are firing, re-run the QStash setup script.
- Production domain is `eleva.care`; the primary live expert account used in debugging is Patrícia Fernandes da Mota.
