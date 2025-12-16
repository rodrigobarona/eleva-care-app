---
name: Schema & Audit Consolidation
overview: Rename schema files to reflect the migration from Clerk to WorkOS as complete, consolidate audit logging into a single unified system, and clean up deprecated code for a production-ready codebase.
todos:
  - id: rename-schemas
    content: Rename schema files (schema-workos.ts -> schema.ts, schema.ts -> schema-clerk-legacy.ts)
    status: pending
  - id: update-db-import
    content: Update drizzle/db.ts import path
    status: pending
  - id: update-81-imports
    content: Update 81 files importing from schema-workos to schema
    status: pending
  - id: consolidate-audit
    content: Merge audit-workos.ts into audit.ts with new unified API
    status: pending
  - id: update-audit-callers
    content: Update 6 files using deprecated audit API
    status: pending
  - id: delete-legacy
    content: Delete legacy files (auditDb.ts, auditSchema.ts, types/audit.ts, audit-workos.ts)
    status: pending
  - id: update-docs
    content: Update drizzle/README.md and CHANGELOG.md
    status: pending
---

# Schema Renaming & Audit Logging Consolidation

Finalize the Clerk to WorkOS migration by renaming schema files and consolidating the audit logging system into a unified, HIPAA/GDPR/SOC2-compliant implementation.

## Current State Analysis

### Schema Files

| Current Name | Purpose | Files Importing |

|--------------|---------|-----------------|

| `drizzle/schema-workos.ts` | Active schema (WorkOS) | 81 files |

| `drizzle/schema.ts` | Legacy schema (Clerk) | 0 files in src/ |

### Audit System (Fragmented)

| File | Purpose | Status |

|------|---------|--------|

| `src/lib/utils/server/audit.ts` | Legacy wrapper (deprecated) | 6 files use it |

| `src/lib/utils/server/audit-workos.ts` | New unified audit | 4 files use it |

| `drizzle/auditDb.ts` | Separate audit DB (unused) | Legacy |

| `drizzle/auditSchema.ts` | Old Clerk audit schema | Legacy |

| `src/types/audit.ts` | Legacy audit types | Duplicates schema-workos types |

## Proposed Changes

### Phase 1: Schema Renaming

```
drizzle/schema-workos.ts  -->  drizzle/schema.ts
drizzle/schema.ts         -->  drizzle/schema-clerk-legacy.ts
```

**Impact**: 81 files need import path updates (automated with find/replace)

### Phase 2: Audit Consolidation

Consolidate to single audit system: `src/lib/utils/server/audit.ts`

**Before (fragmented)**:

```
audit.ts (deprecated wrapper) -> audit-workos.ts -> schema-workos AuditLogsTable
```

**After (unified)**:

```
audit.ts (main) -> schema AuditLogsTable (with RLS)
```

### Phase 3: Cleanup Legacy Files

Files to delete:

- `drizzle/auditDb.ts` (separate audit DB - not needed)
- `drizzle/auditSchema.ts` (old Clerk audit schema)
- `src/types/audit.ts` (duplicates schema types)
- `src/lib/utils/server/audit-workos.ts` (merged into audit.ts)

## Implementation Details

### 1. Rename Schema Files

```bash
# Rename files
mv drizzle/schema.ts drizzle/schema-clerk-legacy.ts
mv drizzle/schema-workos.ts drizzle/schema.ts

# Update db.ts import
# Change: import * as schema from './schema-workos';
# To:     import * as schema from './schema';
```

### 2. Update 81 Import Paths

All files importing from `@/drizzle/schema-workos` will be updated to `@/drizzle/schema`:

```typescript
// Before
import { UsersTable, EventsTable } from '@/drizzle/schema-workos';

// After
import { UsersTable, EventsTable } from '@/drizzle/schema';
```

### 3. Consolidate Audit System

Merge `audit-workos.ts` content into `audit.ts` and remove the deprecated wrapper:

```typescript
// src/lib/utils/server/audit.ts (final version)
'use server';

import { AuditLogsTable, type AuditEventAction, type AuditResourceType } from '@/drizzle/schema';
import { getOrgScopedDb } from '@/lib/integrations/neon/rls-client';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { headers } from 'next/headers';

/**
 * Log audit event with automatic context extraction
 * 
 * Compliance: HIPAA, GDPR, SOC2
 * - Append-only logs (immutable)
 * - RLS ensures org-scoped access
 * - Automatic user/IP/userAgent capture
 */
export async function logAuditEvent(
  action: AuditEventAction,
  resourceType: AuditResourceType,
  resourceId: string,
  changes?: { oldValues?: Record<string, unknown>; newValues?: Record<string, unknown> },
  metadata?: Record<string, unknown>,
): Promise<void> {
  // Implementation from audit-workos.ts
}
```

### 4. Update Callers

6 files using deprecated `audit.ts` API need parameter updates:

| File | Change Required |

|------|-----------------|

| `src/app/api/appointments/[meetingId]/records/route.ts` | Already updated |

| `src/app/api/webhooks/stripe/handlers/payment.ts` | Update to new API |

| `src/server/actions/meetings.ts` | Update to new API |

| `src/server/actions/events.ts` | Update to new API |

| `src/server/actions/schedule.ts` | Update to new API |

| `src/server/actions/expert-profile.ts` | Update to new API |

**Old API** (8 params, manual context):

```typescript
await logAuditEvent(userId, action, resourceType, resourceId, oldValues, newValues, ip, userAgent);
```

**New API** (5 params, auto context):

```typescript
await logAuditEvent(action, resourceType, resourceId, { oldValues, newValues }, metadata);
```

### 5. Delete Legacy Files

- `drizzle/auditDb.ts`
- `drizzle/auditSchema.ts`
- `src/types/audit.ts`
- `src/lib/utils/server/audit-workos.ts`

### 6. Remove Environment Variable

```bash
# No longer needed
AUDITLOG_DATABASE_URL=...  # Remove (unified into main DB)
```

## Audit Logging Best Practices (HIPAA/GDPR/SOC2)

The consolidated audit system follows these compliance requirements:

1. **Immutability**: Append-only logs (no UPDATE/DELETE)
2. **Access Control**: RLS ensures org-scoped queries
3. **Data Minimization**: Only store necessary fields
4. **Retention**: Configurable retention policies
5. **Encryption**: Data at rest via Neon, in transit via TLS
6. **Context**: Automatic IP, user-agent, timestamp capture
7. **Performance**: Async logging (non-blocking)

## Files Summary

| Action | File |

|--------|------|

| Rename | `drizzle/schema-workos.ts` -> `drizzle/schema.ts` |

| Rename | `drizzle/schema.ts` -> `drizzle/schema-clerk-legacy.ts` |

| Update | `drizzle/db.ts` (import path) |

| Update | 81 files (import paths) |

| Rewrite | `src/lib/utils/server/audit.ts` |

| Update | 6 files (audit API callers) |

| Delete | `drizzle/auditDb.ts` |

| Delete | `drizzle/auditSchema.ts` |

| Delete | `src/types/audit.ts` |

| Delete | `src/lib/utils/server/audit-workos.ts` |

| Update | `drizzle/README.md` |