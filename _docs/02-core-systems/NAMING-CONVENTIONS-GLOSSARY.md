# Naming Conventions & Glossary

**Date:** February 25, 2026
**Status:** Active
**Owner:** Product & Engineering Teams

---

## Executive Summary

This document establishes consistent naming conventions across marketing, product, documentation, and technical layers for Eleva Care's multi-tenant B2B features.

**Key Principle:** Different audiences need different terminology, but internal systems must map consistently.

**Authoritative source:** `_docs/02-core-systems/RBAC-NAMING-DECISIONS.md`

---

## Terminology Matrix

| Layer             | Term                    | Slug/ID                     | Audience                   | Example                  |
| ----------------- | ----------------------- | --------------------------- | -------------------------- | ------------------------ |
| **Marketing**     | For Teams               | `/organizations`            | Public, B2B prospects      | "For Teams" landing page |
| **Product UI**    | Team                    | `/team`                     | Users, admins              | "Team Dashboard"         |
| **Documentation** | Team                    | `/docs/team`                | Users learning the product | "Team Portal" docs       |
| **RBAC Roles**    | team_member, team_admin | `team_member`, `team_admin` | Technical, WorkOS          | Role assignments         |
| **Database**      | team                    | `type: 'team'`              | Internal, developers       | OrganizationType         |
| **Revenue Model** | Team                    | `team_commission_*`         | Business logic             | Commission calculations  |

---

## Why Different Terms?

### Marketing: "For Teams"

- **Audience:** B2B decision-makers, procurement teams
- **Reason:** People-focused, modern, friendly (inspired by Cal.com, Vercel)
- **Usage:** Landing pages, sales materials, external communications

### Product: "Team"

- **Audience:** Daily users (admins, team members)
- **Reason:** Modern SaaS term, implies collaboration without being too formal
- **Usage:** Dashboard, settings, team management

### Technical: "team\_\*"

- **Audience:** Developers, WorkOS configuration
- **Reason:** Avoids collision with WorkOS "Organization" (our tenant container)
- **Usage:** RBAC roles, permissions, API endpoints

---

## Role Naming Convention

### WorkOS RBAC Roles

```typescript
// src/types/workos-rbac.ts
export const WORKOS_ROLES = {
  MEMBER: 'member', // Base user (free)
  TEAM_MEMBER: 'team_member', // Team member
  EXPERT_COMMUNITY: 'expert_community', // Standard expert
  EXPERT_TOP: 'expert_top', // Premium expert
  TEAM_ADMIN: 'team_admin', // Team administrator
  ADMIN: 'admin', // Platform admin
} as const;
```

### Role Priority (Hierarchy)

```typescript
// src/lib/auth/roles.server.ts
const ROLE_PRIORITY: WorkOSRole[] = [
  WORKOS_ROLES.MEMBER, // Priority 10 - Lowest
  WORKOS_ROLES.TEAM_MEMBER, // Priority 60
  WORKOS_ROLES.EXPERT_COMMUNITY, // Priority 70
  WORKOS_ROLES.EXPERT_TOP, // Priority 80
  WORKOS_ROLES.TEAM_ADMIN, // Priority 90
  WORKOS_ROLES.ADMIN, // Priority 100 - Highest
];
```

### Display Names (User-Facing)

```typescript
// src/types/workos-rbac.ts
export const WORKOS_ROLE_DISPLAY_NAMES: Record<WorkOSRole, string> = {
  [WORKOS_ROLES.MEMBER]: 'Member',
  [WORKOS_ROLES.EXPERT_COMMUNITY]: 'Community Expert',
  [WORKOS_ROLES.EXPERT_TOP]: 'Top Expert',
  [WORKOS_ROLES.TEAM_MEMBER]: 'Team Member',
  [WORKOS_ROLES.TEAM_ADMIN]: 'Team Admin',
  [WORKOS_ROLES.ADMIN]: 'Admin',
};
```

---

## Organization Types

```typescript
// drizzle/schema.ts
export type OrganizationType =
  | 'member_personal' // Individual member's personal organization
  | 'expert_individual' // Solo expert's organization (1 expert = 1 org)
  | 'team' // Multi-expert team (multiple experts, mixed levels)
  | 'educational_institution'; // For courses/lectures (future)
```

---

## URL Structure

### Marketing Routes

```
/for-teams                 → B2B landing page
/contact?team=true         → Team inquiry
```

### Documentation Routes

```
/docs/team                 → Team Portal documentation
/docs/team/members         → Team management docs
/docs/team/pricing         → Team pricing docs
```

### App Routes

```
/team                      → Team dashboard (future)
/team/members              → Team management
/team/settings             → Team settings
/team/analytics            → Team analytics
```

### API Routes

```
/api/team                  → Team CRUD
/api/team/members          → Member management
/api/team/invitations      → Team invitations
```

---

## Database Naming

### Tables (Future Implementation)

```sql
-- Team settings
team_settings
  - id
  - org_id (WorkOS organization)
  - team_name
  - team_commission_rate
  - team_branding_enabled
  - created_at
  - updated_at

-- Team invitations
team_invitations
  - id
  - team_id
  - email
  - role (team_member | team_admin)
  - status
  - invited_by
  - created_at
  - expires_at
```

### Commission Fields

```sql
-- Transaction commissions
transaction_commissions
  - team_commission_rate       -- Team's marketing fee percentage
  - team_commission_amount     -- Team's marketing fee amount
  - organization_type: 'team' | 'expert_individual'
```

---

## 4-Concept Model

| Concept   | Purpose            | System              | Example                        |
| --------- | ------------------ | ------------------- | ------------------------------ |
| **Role**  | What you can DO    | WorkOS RBAC         | member, expert_top, team_admin |
| **Tier**  | What you PAY       | Stripe Subscription | community, top, team           |
| **Addon** | Extra capabilities | Stripe Addon Sub    | Lecturer Module                |
| **Badge** | What you EARNED    | Future system       | "Top Rated", "Verified"        |

---

## Migration Notes

### From "Clinic/Partner/Workspace" to "Team"

The revenue model documentation formerly used "Clinic" and "Workspace" terminology. The mapping:

| Old Term                      | New Term                     |
| ----------------------------- | ---------------------------- |
| `clinic`                      | `team`                       |
| `clinic_settings`             | `team_settings`              |
| `clinic_commission_rate`      | `team_commission_rate`       |
| `clinic_fee`                  | `team_fee`                   |
| `partner_member`              | `team_member`                |
| `partner_admin`               | `team_admin`                 |
| `workspace` (UI)              | `team` (UI)                  |
| `patient` (role)              | `member` (role)              |
| `patient_personal` (org type) | `member_personal` (org type) |

---

## Validation Checklist

### Marketing Alignment

- [ ] Landing page uses "For Teams"
- [ ] CTAs use "Create a Team" or "Get Started"
- [ ] Sales materials consistent

### Documentation Alignment

- [ ] Docs portal named "Team Portal"
- [ ] All docs reference "team" not "clinic" or "workspace"
- [ ] Getting started guides use "team"

### Technical Alignment

- [ ] RBAC roles use `team_*` prefix
- [ ] Database tables use `team_*` prefix
- [ ] API endpoints use `/team/`
- [ ] Display names show "Team Member/Admin"

### Code Alignment

- [ ] `WORKOS_ROLE_DISPLAY_NAMES` shows "Team"
- [ ] UI components use "Team" terminology
- [ ] Error messages use "Team"
- [ ] OrganizationType uses `'team'` not `'clinic'`

---

## Quick Reference

### When to Use Each Term

| Situation            | Use                                           |
| -------------------- | --------------------------------------------- |
| Talking to prospects | "For Teams"                                   |
| In the product UI    | "Team"                                        |
| In documentation     | "Team"                                        |
| In code/RBAC         | `team_member`, `team_admin`                   |
| In database org type | `'team'`                                      |
| In API endpoints     | `/team/`                                      |
| For the base user    | "Member" (role), "member_personal" (org type) |

### Role Slug → Display Name

| Slug               | Display          |
| ------------------ | ---------------- |
| `member`           | Member           |
| `team_member`      | Team Member      |
| `team_admin`       | Team Admin       |
| `expert_community` | Community Expert |
| `expert_top`       | Top Expert       |
| `admin`            | Admin            |

---

## Related Documentation

- `_docs/02-core-systems/RBAC-NAMING-DECISIONS.md` - ADR with full rationale
- `_docs/02-core-systems/ROLE-PROGRESSION-SYSTEM.md` - Role progression
- `_docs/_WorkOS RABAC implemenation/WORKOS-ROLES-PERMISSIONS-CONFIGURATION.md` - Full RBAC config
- `_docs/02-core-systems/THREE-PARTY-CLINIC-REVENUE-MODEL.md` - Revenue model (uses "Team")
- `src/types/workos-rbac.ts` - Role definitions
- `src/lib/auth/roles.server.ts` - Role priority logic

---

**Last Updated:** February 25, 2026
**Next Review:** Before Team feature launch
