# Agent Skills & Cursor Rules Reference

**For:** All developers working with AI-assisted development  
**Status:** Active  
**Last Updated:** February 2026

---

## Overview

The Eleva Care project uses **24 agent skills** (in `.agents/skills/`) and **8 cursor rules** (in `.cursor/rules/`) to guide AI-assisted development. This document maps every skill and rule to the codebase, explains when each is triggered, and identifies areas where guidance can improve the implementation.

Skills are installed via the Skills CLI (`bunx skills add <owner/repo@skill>`) and tracked in `skills-lock.json`.

---

## Installed Skills Inventory

### Tier 1: Core Integration Skills

These skills directly match the app's primary technology integrations.

| Skill | Source | Trigger Phrases | App Files |
| ----- | ------ | --------------- | --------- |
| `workos-authkit-nextjs` | workos/skills | "install AuthKit", "auth setup", "login flow" | `src/proxy.ts`, `app/layout.tsx`, `app/api/auth/` |
| `workos` | workos/skills | "WorkOS", "SSO", "RBAC", "Vault", "MFA", "migrate from Clerk" | `src/lib/integrations/workos/`, `src/lib/auth/` |
| `stripe-integration` | wshobson/agents | "Stripe payments", "checkout", "subscriptions", "webhooks" | `src/lib/integrations/stripe/`, `app/api/webhooks/stripe*/` |
| `stripe-best-practices` | anthropics/claude-plugins-official | "payment best practices", "Checkout Sessions vs Payment Intents" | `src/server/actions/stripe*.ts`, `config/stripe.ts` |
| `neon-drizzle` | neondatabase/ai-rules | "Drizzle setup", "schema changes", "migrations" | `drizzle/schema.ts`, `drizzle/db.ts`, `drizzle.config.ts` |
| `neon-postgres` | neondatabase/agent-skills | "Neon", "branching", "connection pooling", "read replicas" | `src/lib/integrations/neon/` |
| `email-best-practices` | novuhq/novu | "email deliverability", "SPF/DKIM", "GDPR email", "bounce handling" | `src/emails/`, `src/lib/integrations/novu/` |
| `react-email` | resend/react-email | "email template", "React Email component", "email styling" | `src/emails/**/*.tsx` |
| `redis-js` | upstash/redis-js | "Redis", "caching", "rate limiting", "KV store" | `src/lib/redis/`, `src/lib/cache/` |

### Tier 2: Quality, Performance & Audit Skills

These skills provide guidelines for code quality, performance, accessibility, and SEO.

| Skill | Source | Trigger Phrases | App Files |
| ----- | ------ | --------------- | --------- |
| `vercel-react-best-practices` | vercel-labs/agent-skills | "React performance", "bundle size", "waterfalls", "re-renders" | All `src/` React code |
| `performance` | addyosmani/web-quality-skills | "Core Web Vitals", "LCP", "CLS", "page speed" | Entire `src/` codebase |
| `accessibility` | addyosmani/web-quality-skills | "a11y audit", "WCAG", "screen reader", "keyboard navigation" | `src/components/**/*.tsx` |
| `seo` | addyosmani/web-quality-skills | "SEO audit", "meta tags", "structured data", "crawlability" | `src/app/(marketing)/`, `src/lib/seo/` |
| `frontend-design` | anthropics/skills | "build UI", "landing page", "design component", "styling" | `src/components/`, `src/app/(marketing)/` |
| `web-design-guidelines` | vercel-labs/agent-skills | "review my UI", "audit design", "check UX" | `src/components/**/*.tsx` |
| `shadcn-ui` | jezweb/claude-skills | "Shadcn component", "UI primitive", "component library" | `src/components/ui/`, `components.json` |
| `tailwind-theme-builder` | jezweb/claude-skills | "Tailwind theme", "CSS variables", "design tokens" | `src/app/globals.css` |

### Tier 3: Monitoring & Security Skills

| Skill | Source | Trigger Phrases | App Files |
| ----- | ------ | --------------- | --------- |
| `sentry-fix-issues` | getsentry/sentry-agent-skills | "fix Sentry issue", "production error", "stacktrace" | `sentry.*.config.ts`, `instrumentation-client.ts` |
| `sentry-setup-logging` | getsentry/sentry-agent-skills | "Sentry logging", "structured logs", "logger.fmt" | `src/instrumentation.ts` |
| `security-review` | getsentry/skills | "security audit", "vulnerability check", "code security" | All `src/` code |
| `posthog-instrumentation` | posthog/posthog-for-claude | "PostHog event", "analytics tracking", "feature flag" | `src/app/providers.tsx` |

### Tier 4: Testing & Tooling Skills

| Skill | Source | Trigger Phrases | App Files |
| ----- | ------ | --------------- | --------- |
| `playwright-e2e-testing` | bobmatnyc/claude-mpm-skills | "E2E test", "Playwright test", "integration test" | `tests/`, `playwright.config.ts` |
| `agent-browser` | vercel-labs/agent-browser | "open website", "fill form", "take screenshot", "test web app" | N/A (tooling) |
| `find-skills` | vercel-labs/skills | "find a skill", "is there a skill for" | N/A (meta) |

---

## Detailed Skill-to-Codebase Mapping

### Authentication: WorkOS

**Skills:** `workos-authkit-nextjs`, `workos`

**What the skills provide:**
- AuthKit Next.js integration (proxy.ts, callback route, AuthKitProvider)
- Composable `authkit()` function for existing proxy logic
- 12+ reference files: SSO, RBAC, Vault, Events, MFA, Directory Sync, Audit Logs, Admin Portal
- Migration guides (Clerk, Auth0, Supabase, Firebase, etc.)
- API reference for every WorkOS endpoint

**How the app uses it:**
- `src/proxy.ts` -- Uses `authkit()` composable with custom JWT-based RBAC checks
- `src/app/layout.tsx` -- Wraps app in `AuthKitProvider`
- `src/app/api/auth/callback/route.ts` -- OAuth callback via `handleAuth()`
- `src/lib/integrations/workos/client.ts` -- WorkOS SDK instance
- `src/lib/integrations/workos/rbac.ts` -- RBAC helpers using WorkOS roles
- `src/lib/integrations/workos/sync.ts` -- User sync between WorkOS and DB
- `src/lib/integrations/workos/guest-users.ts` -- Guest user creation
- `src/lib/auth/roles.ts`, `roles.server.ts` -- Role constants and server-side checks
- `src/app/api/webhooks/workos/route.ts` -- WorkOS webhook processing
- `drizzle/schema.ts` -- `organizations`, `users`, `roles`, `user_org_memberships` tables

**Key guidance from the skills:**
- Always return via `handleAuthkitHeaders()` in proxy to ensure `withAuth()` works in pages
- For Next.js 16, file must be `proxy.ts` at root (not `middleware.ts`)
- Use `workos-vault.md` reference for encrypted meeting records
- Use `workos-rbac.md` for role management patterns
- Use `workos-events.md` for webhook processing best practices

---

### Payments: Stripe

**Skills:** `stripe-integration`, `stripe-best-practices`

**What the skills provide:**
- Payment flows: Checkout Sessions, Payment Intents, Setup Intents
- Subscription management with Billing APIs
- Webhook handling with signature verification and idempotency
- Connect platform patterns (direct charges, destination charges)
- Refund and dispute handling
- SCA/3D Secure for European payments

**How the app uses it:**
- `src/lib/integrations/stripe/client.ts` -- Stripe SDK client
- `src/lib/integrations/stripe/identity.ts` -- Stripe Identity for KYC
- `src/lib/integrations/stripe/transfer-utils.ts` -- Connect transfer logic
- `src/server/actions/stripe.ts` -- Server actions for Stripe operations
- `src/server/actions/stripe-pricing.ts` -- Dynamic pricing resolution
- `src/server/actions/billing.ts` -- Subscription billing actions
- `app/api/create-payment-intent/route.ts` -- Payment Intent creation
- `app/api/webhooks/stripe/route.ts` -- Main webhook (with handlers in `handlers/`)
- `app/api/webhooks/stripe-connect/route.ts` -- Connect account events
- `app/api/webhooks/stripe-identity/route.ts` -- Identity verification events
- `app/api/webhooks/stripe-subscriptions/route.ts` -- Subscription lifecycle
- `config/stripe.ts` -- Stripe configuration
- `config/subscription-pricing.ts` -- Pricing tiers

**Gap analysis -- things to audit:**
- Best practices skill recommends **Checkout Sessions over Payment Intents** for most flows; the app uses `create-payment-intent` -- worth evaluating if Checkout Sessions would be simpler
- Skill recommends **dynamic payment methods** (dashboard-configured) instead of hardcoded `payment_method_types` -- check if the app passes explicit types
- Skill warns against the Charges API -- verify no legacy usage
- Connect skill recommends using **controller properties** instead of the legacy Standard/Express/Custom terminology

---

### Database: Neon + Drizzle

**Skills:** `neon-drizzle`, `neon-postgres`

**What the skills provide:**
- Drizzle ORM setup, schema creation, and migrations
- Connection methods: HTTP vs WebSocket decision guide
- Neon features: branching, autoscaling, scale-to-zero, read replicas
- Connection pooling with PgBouncer
- Neon CLI and Platform API automation

**How the app uses it:**
- `drizzle/schema.ts` -- 20+ tables including users, organizations, events, meetings, profiles, records, payments, subscriptions, audit logs
- `drizzle/db.ts` -- Neon serverless connection setup
- `drizzle.config.ts` -- Migration configuration
- `src/lib/integrations/neon/` -- Neon RLS client

**Key guidance:**
- Use `-pooler` hostnames in serverless environments (Vercel)
- Neon branching can be used for preview deployment databases
- Read replicas for analytics/reporting queries vs primary for writes
- Scale-to-zero with ~300ms cold-start penalty -- acceptable for this app's use case

---

### Email & Notifications: Novu + Resend + React Email

**Skills:** `email-best-practices`, `react-email`

**What the skills provide:**
- `email-best-practices` -- Deliverability (SPF/DKIM/DMARC), compliance (CAN-SPAM, GDPR, CASL), webhook handling, list management, retry logic, transactional email catalog
- `react-email` -- React Email component patterns, template structure, styling best practices

**How the app uses it:**
- `src/emails/` -- 15+ React Email templates organized by category:
  - `users/` -- welcome, welcome-i18n
  - `appointments/` -- confirmation, reminder
  - `experts/` -- new-appointment, notification
  - `payments/` -- confirmation, multibanco-pending, multibanco-reminder, reservation-expired, refund, expert-payout
  - `notifications/` -- security-alert
- `src/emails/utils/i18n.ts` -- Email internationalization
- `src/lib/integrations/novu/email-service.ts` -- Novu email service wrapper
- `src/lib/integrations/novu/email.ts` -- Email sending functions
- `app/api/webhooks/novu/route.ts` -- Novu webhook processing

**Key guidance:**
- GDPR compliance is critical for EU/Portugal operations -- verify double opt-in for any marketing emails
- Transactional emails (appointment confirmations, payment receipts) do not require opt-in but must not contain marketing content
- SPF/DKIM/DMARC must be configured on the sending domain
- Implement idempotent sending to prevent duplicate emails on webhook retries

---

### Caching: Upstash Redis

**Skill:** `redis-js`

**What the skill provides:**
- Official Upstash Redis patterns: get/set, pipeline, pub/sub
- Best practices for serverless Redis usage
- Connection configuration and error handling

**How the app uses it:**
- `src/lib/redis/` -- Redis manager with cleanup utilities
- `src/lib/cache/` -- Redis error boundary and cache patterns
- `src/lib/utils/cache-keys.ts` -- Centralized cache key management
- Two-layer caching: React `cache()` for per-request + Redis for cross-request

---

### Analytics: PostHog

**Skill:** `posthog-instrumentation`

**What the skill provides:**
- PostHog event tracking patterns
- Feature flag integration
- User identification and properties

**How the app uses it:**
- `src/app/providers.tsx` -- PostHog provider initialization
- Client-side analytics tracking across the app

---

### Monitoring: Sentry

**Skills:** `sentry-fix-issues`, `sentry-setup-logging`

**What the skills provide:**
- `sentry-fix-issues` -- Production issue diagnosis, stacktrace analysis, fix recommendations
- `sentry-setup-logging` -- Structured logging with `logger.fmt`, `consoleLoggingIntegration`, log levels

**How the app uses it:**
- `instrumentation-client.ts` -- Client SDK with Session Replay, User Feedback
- `sentry.server.config.ts` -- Server SDK
- `sentry.edge.config.ts` -- Edge runtime SDK
- `src/instrumentation.ts` -- Next.js instrumentation hook
- Tunnel route at `/monitoring` to bypass ad-blockers

**Note:** The `sentry.mdc` cursor rule already covers span instrumentation, logging, and error capture patterns. These skills complement the rule with diagnosis and setup automation.

---

### Security

**Skill:** `security-review`

**What the skill provides:**
- Code security review patterns from the Sentry team
- Vulnerability detection in dependencies and code
- Security best practices for web applications

**Relevance:** As a digital health platform handling sensitive patient data, security reviews are critical. This skill should be used before major releases.

---

### UI & Design

**Skills:** `frontend-design`, `web-design-guidelines`, `shadcn-ui`, `tailwind-theme-builder`

**How the app uses them:**
- `src/components/ui/` -- 40+ Shadcn UI primitives (Button, Card, Dialog, etc.)
- `src/app/globals.css` -- Tailwind v4 CSS-based theme with `@theme` block
- `components.json` -- Shadcn configuration (base color: zinc)
- `src/components/sections/` -- Marketing page sections (home, about, solutions)
- `src/components/features/` -- Feature-specific components (booking, calendar, forms)

**When to use which:**
- `shadcn-ui` -- When adding or customizing Shadcn components
- `tailwind-theme-builder` -- When modifying the design system (colors, spacing, typography)
- `frontend-design` -- When building new marketing pages or distinctive UI
- `web-design-guidelines` -- When auditing existing components for UX/a11y compliance

---

### Performance & Quality Audits

**Skills:** `vercel-react-best-practices`, `performance`, `accessibility`, `seo`

**Priority rules from `vercel-react-best-practices` for this app:**

| Category | Rule | Relevance |
| -------- | ---- | --------- |
| Waterfalls (CRITICAL) | `async-parallel` | Use `Promise.all()` for independent DB queries in server components |
| Waterfalls (CRITICAL) | `async-suspense-boundaries` | Wrap slow data with `<Suspense>` in dashboard pages |
| Bundle Size (CRITICAL) | `bundle-barrel-imports` | Audit `src/components/ui/` barrel exports |
| Bundle Size (CRITICAL) | `bundle-dynamic-imports` | Use `next/dynamic` for Tiptap editor, heavy charts |
| Bundle Size (CRITICAL) | `bundle-defer-third-party` | Defer PostHog, Novu inbox after hydration |
| Server (HIGH) | `server-cache-react` | Use `React.cache()` for per-request dedup of DB calls |
| Server (HIGH) | `server-after-nonblocking` | Use `after()` for audit logging, email sending |
| Server (HIGH) | `server-serialization` | Minimize data passed from RSC to client components |
| Re-renders (MEDIUM) | `rerender-derived-state` | Subscribe to derived booleans in booking/calendar state |

**`performance`** (Addy Osmani) -- Run against Core Web Vitals issues, especially LCP on marketing pages and CLS in the booking flow.

**`accessibility`** -- Critical for a health platform. Run against all patient-facing components in `src/components/features/booking/` and `src/app/(marketing)/`.

**`seo`** -- Run against `src/app/(marketing)/[locale]/` pages and `src/lib/seo/metadata-utils.ts`.

---

### Testing

**Skills:** `playwright-e2e-testing`, `agent-browser`

**How the app uses them:**
- `playwright.config.ts` -- Playwright configuration
- `tests/` -- Test directory
- `vitest` -- Unit/integration tests (covered by `testing.mdc` cursor rule)

**When to use which:**
- `playwright-e2e-testing` -- For writing structured E2E tests with Playwright patterns
- `agent-browser` -- For ad-hoc browser automation and visual testing during development

---

## Cursor Rules Summary

These are always-active or glob-matched rules in `.cursor/rules/`.

| Rule | Applied | Scope | Key Patterns |
| ---- | ------- | ----- | ------------ |
| `nextjs-core.mdc` | Always | All `src/` TypeScript | Async params (`params: Promise<...>`), `'use cache'` directive, `proxy.ts` (not middleware), `updateTag`/`revalidateTag`/`refresh` cache invalidation, Server Components by default |
| `sentry.mdc` | Always | All `src/` TypeScript | `Sentry.startSpan()` for custom spans, `logger.fmt` for structured logs, `Sentry.captureException()` with tags/extra, Session Replay config, tunnel route |
| `ui-components.mdc` | Glob: `src/components/**`, `src/app/**` | TSX files | Component directories (ui/, features/, layout/, sections/), Shadcn + Tailwind patterns, react-hook-form + Zod forms, responsive design, accessibility |
| `testing.mdc` | Glob: `tests/**`, `**/*.test.*` | Test files | Vitest + `vi.hoisted()` for mocks, Next.js 16 async API mocking, Playwright E2E patterns, Stripe mocking |
| `fumadocs.mdc` | Glob: `src/content/**` | MDX/MD files | Fumadocs structure, `meta.json` ordering, MDX components (Tabs, Accordions, Steps, Callouts, Cards) |
| `ers-content-compliance.mdc` | Glob: `src/content/**`, `src/messages/**`, `src/components/**`, `src/emails/**` | Content files | ERS Portugal rules: "digital health platform" (not "telemedicine"), platform vs expert responsibilities, credential language, Portuguese law disclaimers |
| `bun-runtime.mdc` | Manual | Config files | Bun for local dev, Node.js for Vercel production, `Bun.CryptoHasher` for hashing, `bun run` for scripts |
| `database-security.mdc` | Glob: `drizzle/**`, `lib/auth/**`, `lib/stripe/**` | DB/Auth/Payments | Drizzle + Neon patterns, Zod validation on all inputs, env var security, rate limiting, two-layer caching (React cache + Redis) |

---

## Cross-Reference Matrix

Which skills and rules apply to each part of the codebase:

| Codebase Area | Skills | Rules |
| ------------- | ------ | ----- |
| **`src/proxy.ts`** | workos-authkit-nextjs | nextjs-core |
| **`src/app/layout.tsx`** | workos-authkit-nextjs | nextjs-core, sentry |
| **`src/app/(app)/`** (dashboard) | vercel-react-best-practices, accessibility | nextjs-core, sentry, ui-components |
| **`src/app/(auth)/`** (login/register) | workos-authkit-nextjs, workos | nextjs-core, sentry |
| **`src/app/(marketing)/`** (public pages) | frontend-design, seo, performance, accessibility | nextjs-core, sentry, ers-content-compliance |
| **`src/app/api/webhooks/stripe*/`** | stripe-integration, stripe-best-practices | nextjs-core, sentry |
| **`src/app/api/webhooks/workos/`** | workos | nextjs-core, sentry |
| **`src/app/api/webhooks/novu/`** | email-best-practices | nextjs-core, sentry |
| **`src/app/api/cron/`** | redis-js | nextjs-core, sentry |
| **`src/components/ui/`** | shadcn-ui, tailwind-theme-builder | ui-components |
| **`src/components/features/forms/`** | shadcn-ui, vercel-react-best-practices | ui-components |
| **`src/components/features/booking/`** | accessibility, vercel-react-best-practices | ui-components, sentry |
| **`src/components/sections/`** | frontend-design, seo | ui-components, ers-content-compliance |
| **`src/emails/`** | react-email, email-best-practices | ers-content-compliance |
| **`src/lib/integrations/stripe/`** | stripe-integration, stripe-best-practices | database-security |
| **`src/lib/integrations/workos/`** | workos | database-security |
| **`src/lib/integrations/novu/`** | email-best-practices | sentry |
| **`src/lib/redis/`** | redis-js | database-security |
| **`src/server/actions/`** | stripe-integration, vercel-react-best-practices | nextjs-core, sentry, database-security |
| **`src/content/`** (MDX) | seo | fumadocs, ers-content-compliance |
| **`src/messages/`** (i18n) | -- | ers-content-compliance |
| **`drizzle/`** | neon-drizzle, neon-postgres | database-security |
| **`tests/`** | playwright-e2e-testing | testing |
| **`sentry.*.config.ts`** | sentry-fix-issues, sentry-setup-logging | sentry |

---

## Actionable Recommendations

Based on the skill guidance, here are concrete improvements to audit:

### High Priority

1. **Stripe: Checkout Sessions vs Payment Intents** -- The `stripe-best-practices` skill strongly recommends Checkout Sessions over Payment Intents for most flows. The app's `app/api/create-payment-intent/route.ts` uses Payment Intents directly. Evaluate if Checkout Sessions (with `ui_mode='custom'` for embedded forms) would reduce integration complexity.

2. **Bundle Size: Barrel Imports** -- The `vercel-react-best-practices` skill flags barrel imports as CRITICAL for bundle size. Audit `src/components/ui/index.ts` and other barrel files. Import directly from component files instead.

3. **Bundle Size: Defer Third-Party Scripts** -- PostHog and Novu Inbox should be loaded after hydration using `next/dynamic` with `{ ssr: false }` or the `after()` API.

4. **Accessibility Audit** -- Run the `accessibility` skill against patient-facing booking flow components. As a health platform, WCAG 2.1 AA compliance is expected.

### Medium Priority

5. **Server-Side Caching** -- Implement `React.cache()` for per-request deduplication of database calls in server components. Combine with existing Redis caching for cross-request patterns.

6. **Non-Blocking Operations** -- Use Next.js `after()` API for audit logging, email sending, and webhook forwarding that don't need to block the response.

7. **Email Deliverability** -- Verify SPF/DKIM/DMARC configuration on the sending domain. Run the `email-best-practices` skill's deliverability checklist.

8. **SEO for Marketing Pages** -- Run the `seo` skill against `src/app/(marketing)/[locale]/` pages. Verify structured data, canonical URLs, and OpenGraph tags via `src/lib/seo/metadata-utils.ts`.

### Low Priority

9. **Neon Branching for Preview Deploys** -- Use Neon's instant branching to create isolated databases for Vercel preview deployments.

10. **Security Review Before Releases** -- Run the `security-review` skill against the full codebase before major releases, focusing on auth flows, payment handling, and encrypted records.

---

## How to Use Skills

### Triggering a Skill

Skills are automatically activated when the AI detects relevant trigger phrases. You can also explicitly request them:

```
"Use the stripe-best-practices skill to review my checkout flow"
"Run the accessibility skill against src/components/features/booking/"
"Apply vercel-react-best-practices to optimize this component"
```

### Finding New Skills

```bash
bunx skills find "topic keyword"
bunx skills add owner/repo@skill-name -y
```

Browse available skills at [skills.sh](https://skills.sh/).

### Updating Skills

```bash
bunx skills check    # Check for updates
bunx skills update   # Update all installed skills
```

---

## Full Skill List (Quick Reference)

| # | Skill Name | Vendor/Source | Category |
| - | ---------- | ------------- | -------- |
| 1 | `workos-authkit-nextjs` | WorkOS (official) | Auth |
| 2 | `workos` | WorkOS (official) | Auth |
| 3 | `stripe-integration` | wshobson/agents | Payments |
| 4 | `stripe-best-practices` | Anthropic (official) | Payments |
| 5 | `neon-drizzle` | Neon (official) | Database |
| 6 | `neon-postgres` | Neon (official) | Database |
| 7 | `email-best-practices` | Novu (official) | Email |
| 8 | `react-email` | Resend (official) | Email |
| 9 | `redis-js` | Upstash (official) | Caching |
| 10 | `vercel-react-best-practices` | Vercel (official) | Performance |
| 11 | `performance` | Addy Osmani | Performance |
| 12 | `accessibility` | Addy Osmani | Accessibility |
| 13 | `seo` | Addy Osmani | SEO |
| 14 | `frontend-design` | Anthropic (official) | Design |
| 15 | `web-design-guidelines` | Vercel (official) | Design |
| 16 | `shadcn-ui` | jezweb/claude-skills | UI |
| 17 | `tailwind-theme-builder` | jezweb/claude-skills | UI |
| 18 | `sentry-fix-issues` | Sentry (official) | Monitoring |
| 19 | `sentry-setup-logging` | Sentry (official) | Monitoring |
| 20 | `security-review` | Sentry (official) | Security |
| 21 | `posthog-instrumentation` | PostHog (official) | Analytics |
| 22 | `playwright-e2e-testing` | bobmatnyc/claude-mpm-skills | Testing |
| 23 | `agent-browser` | Vercel (official) | Tooling |
| 24 | `find-skills` | Vercel (official) | Tooling |
