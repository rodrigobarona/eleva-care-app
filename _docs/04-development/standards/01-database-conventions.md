# Database Naming Conventions

## Standard: `snake_case` Everywhere

All tables and columns use `snake_case`. No exceptions.

### Table Names

```sql
-- Examples
payment_transfers
schedule_availabilities
user_org_memberships
transaction_commissions
```

### Column Names

```sql
-- Identity
workos_user_id       -- WorkOS user ID reference
org_id               -- Organization foreign key

-- Timestamps
created_at           -- Record creation time
updated_at           -- Last modification time

-- Stripe references
stripe_customer_id
stripe_subscription_id
expert_workos_user_id
```

### Primary Keys

- Use `id` as the standard primary key name
- `uuid` for most tables (default random)
- `serial` for `payment_transfers` and `scheduling_settings`

### Foreign Keys

Use `resource_id` format:

```sql
org_id          -- references organizations.id
event_id        -- references events.id
schedule_id     -- references schedules.id
meeting_id      -- references meetings.id
```

### Timestamps

Every table uses:

```sql
created_at TIMESTAMP NOT NULL DEFAULT NOW()
updated_at TIMESTAMP NOT NULL DEFAULT NOW()
```

### Enums

Defined via `pgEnum` in the Drizzle schema:

```sql
-- payment_transfer_status_enum: PENDING, READY, COMPLETED, FAILED, ...
-- day: monday, tuesday, ...
```

## Drizzle ORM Mapping

Drizzle property names are `camelCase` in TypeScript, mapping to `snake_case` DB columns:

```typescript
// TypeScript property → DB column
expertWorkosUserId: text('expert_workos_user_id')
createdAt: timestamp('created_at')
orgId: uuid('org_id')
```

## Organization Types

```typescript
type OrganizationType =
  | 'member_personal'          // Member's personal organization
  | 'expert_individual'        // Solo expert's organization
  | 'team'                     // Multi-expert team
  | 'educational_institution'; // Future
```

## RLS (Row-Level Security)

All 22 tables have RLS enabled with policies using `auth.user_id()` (Neon Auth).
Policies are defined in `drizzle/migrations-manual/001_enable_rls.sql` through `005_*.sql`.

## References

- `drizzle/schema.ts` -- Source of truth for all table definitions
- `drizzle/migrations-manual/*.sql` -- RLS policies
- `_docs/02-core-systems/NAMING-CONVENTIONS-GLOSSARY.md` -- Full terminology matrix
