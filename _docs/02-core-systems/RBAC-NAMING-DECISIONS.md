# RBAC Naming Decisions (ADR)

## Status

Accepted

## Context

Eleva Care needed to standardize role and permission naming across WorkOS RBAC, Stripe subscriptions, database, and product UI. The previous system had inconsistencies: `patient`/`user`/`member` for the base role, `partner_*`/`clinic_*`/`workspace` for team roles, and `expert_lecturer` as both a role and a capability.

## Decisions

### 1. Base Role: `member` (was `patient`/`user`)

- WorkOS, Vercel, GitHub, Cal.com all use "member" as base role
- Generic: covers patients, future experts, lecturers
- Aligns with org-per-user model

### 2. Team Roles: `team_member`/`team_admin` (was `partner_*`/`clinic_*`)

Research across 8 SaaS platforms:

- Vercel: "Team" for multi-user billing
- Cal.com: "Team" for scheduling groups (closest to Eleva)
- Linear/Notion/Slack: "Workspace" (tool-oriented)
- GitHub/Figma: "Organization" (enterprise-oriented)
- WorkOS: "Organization" internally (must avoid collision)

Why "team" won:

1. People-focused (not container or business relationship)
2. Cal.com alignment (round-robin, collective scheduling)
3. Friendly and modern ("For Teams" resonates)
4. Short slug (11 chars vs 14-16)
5. No WorkOS collision
6. Future-proof (Organization can sit above Team for enterprise)
7. Fixes 3-way inconsistency (clinic/partner/workspace)

### 3. Expert Naming: Keep `expert_community`/`expert_top`

Despite healthcare standards favoring "Practitioner", "Expert" is brand-embedded, covers non-clinical professionals, and refactoring cost is too high. FHIR interoperability uses separate `practitioner_type` field.

### 4. Lecturer: Stripe Addon (was `expert_lecturer` role)

Removed as a WorkOS role. Now a Stripe addon subscription granting entitlements:

- A user can be member + lecturer addon
- An expert can be expert + lecturer addon
- Permissions come via Stripe Entitlements in JWT

### 5. Owner Role (WorkOS System Default)

- **Role:** `owner`
- **Assignment:** WorkOS automatically assigns `owner` to the user who creates an organization
- **Hierarchy:** 95 (highest org-level role)
- **Permissions:** Inherits all `team_admin` permissions
- **Use case:** Org creators have full control; they can promote others to `team_admin` or `team_member`

### 6. 4-Concept Model

| Concept | Purpose              | System           |
| ------- | -------------------- | ---------------- |
| Role    | What you can DO      | WorkOS RBAC      |
| Tier    | What you PAY         | Stripe Subscription |
| Addon   | Extra capabilities   | Stripe Addon Sub |
| Badge   | What you EARNED      | Future system    |

## Architecture Table

```
Layer          | Old Term                      | New Term
-------------- | ----------------------------- | ------------------------------
Marketing      | "For Organizations"           | "For Teams"
Product UI     | "Workspace"                   | "Team"
RBAC Roles     | partner_member, partner_admin  | team_member, team_admin, owner
RBAC Roles     | patient                       | member
RBAC Roles     | expert_lecturer               | (removed -- Stripe addon)
Permissions    | partner:* prefix               | team:* prefix
Permissions    | billing:manage_clinic_sub      | billing:manage_team_sub
DB (App Role)  | 'user' default                 | 'member' default
WorkOS Internal| Organization                  | Organization (unchanged)
```

## FGA Resource Types (Future Phase 2)

When the Team feature is built, WorkOS FGA will be adopted with these resource types:

```
type team
  relation member [user]
  relation admin [user]
  relation owner [user]

type event_type
  relation parent [team]
  relation owner [user]
  relation editor [user]

type appointment
  relation parent [event_type]
  relation expert [user]
  relation patient [user]
```

### FGA Adoption Triggers

- Team/clinic feature development starts
- Need for resource-scoped authorization (admin of Team X but not Team Y)
- Enterprise customer requirements

## Consequences

- All code references updated in single refactor
- Database migration renames existing rows
- WorkOS Dashboard updated manually
- Documentation rewritten
- Future FGA adoption has clear schema ready

## References

- `src/types/workos-rbac.ts` - Role and permission types
- `src/types/roles.ts` - Application role types
- `_docs/02-core-systems/NAMING-CONVENTIONS-GLOSSARY.md` - Terminology matrix
- `_docs/02-core-systems/ROLE-PROGRESSION-SYSTEM.md` - Role progression
- `_docs/_WorkOS RABAC implemenation/FGA-EVALUATION.md` - FGA evaluation
