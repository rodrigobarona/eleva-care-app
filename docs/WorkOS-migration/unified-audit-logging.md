# Unified Audit Logging with RLS (Option A - Industry Standard)

## Overview

Eleva Care uses a **unified audit logging system** where audit logs are stored in the main application database, protected by Row-Level Security (RLS). This is the **industry-standard approach** used by companies like GitHub, Linear, Notion, and Vercel.

**Key Benefits:**

- ✅ Single connection pool (better performance)
- ✅ RLS protection (org-scoped access)
- ✅ Automatic context from JWT (no manual params)
- ✅ Append-only logs (HIPAA compliant)
- ✅ Lower cost ($69/month vs $138/month)
- ✅ Simpler operations (one database to manage)

---

## Architecture

### Before: Separate Audit Database ❌

```
┌─────────────────────┐     ┌─────────────────────┐
│   Application DB    │     │    Audit DB         │
│                     │     │  (Separate Neon     │
│  - Users            │     │   Project)          │
│  - Events           │     │                     │
│  - Appointments     │     │  - Audit Logs       │
│  - Payments         │     │  - Manual logging   │
└─────────────────────┘     └─────────────────────┘
       ↓                             ↓
   Connection Pool 1         Connection Pool 2

❌ Problems:
- Two connection pools = higher latency
- No RLS = any breach exposes all audit logs
- Manual logging = easy to forget
- No org scoping
- Extra $69/month cost
```

### After: Unified Database with RLS ✅

```
┌──────────────────────────────────────────────────┐
│          Single Neon Database                    │
│                                                  │
│  Application Tables:                             │
│  ├─ organizations       (RLS protected)          │
│  ├─ users               (RLS protected)          │
│  ├─ events              (RLS protected)          │
│  └─ appointments        (RLS protected)          │
│                                                  │
│  Audit Tables (same DB!):                        │
│  ├─ audit_logs          (RLS protected)          │
│  ├─ audit_log_exports   (RLS protected)          │
│  └─ audit_stats         (RLS protected)          │
└──────────────────────────────────────────────────┘
       ↓
   Single Connection Pool

✅ Benefits:
- One connection pool = faster queries
- RLS = org-scoped audit access
- Automatic logging context from JWT
- Append-only = tamper-proof
- $69/month total cost
```

---

## Hybrid Audit Strategy

### WorkOS Audit Logs (Auth/Org Events)

**Used for:**

- User sign-in/sign-out
- Password changes
- MFA events
- Organization changes (name, members)
- Subscription updates
- SSO events

**Benefits:**

- ✅ Appears in WorkOS Admin Portal (customers can view!)
- ✅ Zero implementation cost (free tier)
- ✅ Industry-standard format
- ✅ Tamper-proof (stored by WorkOS)

**Example:**

```typescript
// lib/integrations/workos/audit.ts
import { workos } from './client';

export async function logWorkOSAuditEvent(
  orgId: string,
  event: {
    action: string;
    actor: { id: string; type: 'user' | 'system' };
    targets?: Array<{ id: string; type: string }>;
    context: { location: string; userAgent: string };
  },
) {
  await workos.auditLogs.createEvent({
    organizationId: orgId,
    event: {
      action: event.action,
      occurredAt: new Date(),
      actor: event.actor,
      targets: event.targets || [],
      context: event.context,
    },
  });
}

// Usage in server action
export async function inviteExpertToClinic(email: string) {
  const session = await requireAuth();

  const invitation = await workos.userManagement.createInvitation({
    organizationId: session.organizationId,
    email,
  });

  // Log to WorkOS (customer can see in Admin Portal!)
  await logWorkOSAuditEvent(session.organizationId, {
    action: 'org.member_invited',
    actor: { id: session.userId, type: 'user' },
    targets: [{ id: invitation.id, type: 'invitation' }],
    context: {
      location: 'clinic_settings',
      userAgent: req.headers.get('user-agent') || '',
    },
  });
}
```

### Database Audit Logs (PHI/Application Events)

**Used for:**

- Medical record access (HIPAA required)
- Appointment booking/cancellation
- Payment processing
- Prescription views
- Health data exports
- Lab results access

**Benefits:**

- ✅ 7-year retention (HIPAA requirement)
- ✅ RLS protection (org-scoped)
- ✅ Append-only (tamper-proof)
- ✅ Automatic context from JWT
- ✅ Direct SQL access for reporting

**Example:**

```typescript
// lib/utils/server/audit-workos.ts
import { logAuditEvent } from '@/lib/utils/server/audit-workos';

// Usage in server action - AUTOMATIC CONTEXT!
export async function viewMedicalRecord(recordId: string) {
  const db = await getOrgScopedDb();

  const record = await db.query.MedicalRecordsTable.findFirst({
    where: eq(MedicalRecordsTable.id, recordId),
  });

  if (!record) {
    throw new Error('Record not found');
  }

  // Log PHI access - workosUserId, orgId, ipAddress, userAgent extracted automatically!
  await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', recordId);

  return record;
}
```

---

## Schema Design

### Audit Logs Table

```typescript
export const AuditLogsTable = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey(),

    // Who (from JWT automatically)
    workosUserId: text('workos_user_id').notNull(),
    orgId: uuid('org_id').notNull(),

    // What
    action: text('action').notNull(), // AuditEventAction type
    resourceType: text('resource_type').notNull(), // AuditResourceType type
    resourceId: text('resource_id'),

    // Change tracking
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),

    // Context (automatic)
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),

    // Timestamp (required for HIPAA)
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    // 🔒 RLS: Users can only see their org's audit logs
    crudPolicy({
      role: authenticatedRole,
      read: sql`EXISTS (
        SELECT 1 FROM user_org_memberships 
        WHERE user_org_memberships.org_id = ${table.orgId}
        AND user_org_memberships.workos_user_id = auth.user_id()
        AND user_org_memberships.status = 'active'
      )`,
      // Append-only: Nobody can modify or delete
      modify: sql`false`,
    }),
  ],
);
```

---

## Usage Examples

### Basic Audit Logging

```typescript
// server/actions/medical-records.ts
'use server';

import { logAuditEvent } from '@/lib/utils/server/audit-workos';

// server/actions/medical-records.ts

export async function viewMedicalRecord(recordId: string) {
  const db = await getOrgScopedDb();
  const record = await db.query.MedicalRecordsTable.findFirst({
    where: eq(MedicalRecordsTable.id, recordId),
  });

  // Simple! Automatic context extraction
  await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', recordId);

  return record;
}
```

### Audit with Change Tracking

```typescript
export async function updateAppointment(id: string, data: UpdateData) {
  const db = await getOrgScopedDb();

  // Get old values
  const oldRecord = await db.query.AppointmentsTable.findFirst({
    where: eq(AppointmentsTable.id, id),
  });

  // Update
  const [updated] = await db
    .update(AppointmentsTable)
    .set(data)
    .where(eq(AppointmentsTable.id, id))
    .returning();

  // Log with change tracking
  await logAuditEvent('APPOINTMENT_UPDATED', 'appointment', id, {
    oldValues: oldRecord,
    newValues: updated,
  });

  return updated;
}
```

### Query Audit Logs

```typescript
// Get audit trail for a resource
const trail = await getResourceAuditTrail('medical_record', 'rec_123');

// Get user activity
const activity = await getUserAuditLogs('user_123', new Date('2025-01-01'), new Date('2025-01-31'));

// Export for compliance
const { exportRecord, logs } = await exportAuditLogs({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-03-31'),
  reason: 'HIPAA audit request',
});
```

### Generate Compliance Report

```typescript
// Quarterly compliance report
const report = await generateComplianceReport(new Date('2025-01-01'), new Date('2025-03-31'));

console.log(report.summary);
// {
//   totalEvents: 1234,
//   medicalRecordAccess: 456,
//   appointmentEvents: 678,
//   paymentEvents: 100,
//   securityEvents: 0
// }
```

---

## Security Features

### 1. Row-Level Security (RLS)

```sql
-- Users can only see audit logs from their org
CREATE POLICY audit_logs_select_policy ON audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = audit_logs.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);

-- Nobody can modify or delete audit logs
CREATE POLICY audit_logs_modify_policy ON audit_logs
FOR ALL
USING (false);
```

### 2. Append-Only Logs

Audit logs cannot be modified or deleted by:

- Application code
- Database users
- Even admin users

This ensures tamper-proof audit trails for HIPAA compliance.

### 3. Automatic Context

All context is extracted automatically from:

- **JWT** → `workosUserId` via `auth.user_id()`
- **Session** → `orgId` from WorkOS session
- **Request headers** → `ipAddress`, `userAgent`

No manual parameters = no human error!

### 4. Encryption at Rest

Neon provides automatic encryption at rest for all data, including audit logs.

---

## HIPAA Compliance

### Required Elements ✅

| Requirement             | Implementation                          |
| ----------------------- | --------------------------------------- |
| **Access Tracking**     | ✅ Every PHI access logged              |
| **User Identification** | ✅ WorkOS user ID (immutable)           |
| **Timestamp**           | ✅ Automatic `createdAt` field          |
| **Event Type**          | ✅ Typed actions (read/write/delete)    |
| **Resource ID**         | ✅ Links to specific records            |
| **Change Tracking**     | ✅ Old/new values for updates           |
| **Tamper-Proof**        | ✅ Append-only, RLS protected           |
| **Retention**           | ✅ 7-year retention policy              |
| **Audit of Audits**     | ✅ Exports table tracks who viewed logs |

### HIPAA Audit Report

```typescript
// Generate HIPAA compliance report
const hipaaReport = await generateComplianceReport(new Date('2024-01-01'), new Date('2024-12-31'));

// Export for auditor
const { exportRecord, logs } = await exportAuditLogs({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  actions: [
    'MEDICAL_RECORD_VIEWED',
    'MEDICAL_RECORD_UPDATED',
    'MEDICAL_RECORD_DELETED',
    'PRESCRIPTION_VIEWED',
    'LAB_RESULTS_VIEWED',
  ],
  reason: 'Annual HIPAA audit',
});

// Save to secure storage
await saveAuditExport(exportRecord.id, logs);
```

---

## Migration from Separate Database

### Step 1: Run Migration Script

```bash
# Dry run (no changes)
tsx scripts/migrate-audit-logs-to-unified.ts --dry-run

# Execute migration
tsx scripts/migrate-audit-logs-to-unified.ts --execute --verbose
```

### Step 2: Validate Data

```sql
-- Check counts
SELECT COUNT(*) FROM audit_logs;

-- Verify org distribution
SELECT org_id, COUNT(*) as log_count
FROM audit_logs
GROUP BY org_id
ORDER BY log_count DESC;

-- Verify date ranges
SELECT
  MIN(created_at) as oldest_log,
  MAX(created_at) as newest_log
FROM audit_logs;
```

### Step 3: Update Environment Variables

```bash
# Remove old audit DB URL
# DATABASE_URL now contains everything!

# .env.local
DATABASE_URL="postgresql://...neon.tech/eleva_workos?sslmode=require"
DATABASE_URL_LEGACY="postgresql://...neon.tech/eleva_legacy?sslmode=require" # Keep for 6 months

# Remove these:
# AUDITLOG_DATABASE_URL="..." ← DELETE
```

### Step 4: Update Code

```typescript
// Old import (separate DB)
import { auditDb } from '@/drizzle/auditDb';
import { logAuditEvent } from '@/lib/utils/server/audit';

// New import (unified schema)
import { logAuditEvent } from '@/lib/utils/server/audit-workos';

// Usage is simpler!
await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', 'rec_123');
// ↑ No need for: clerkUserId, orgId, ipAddress, userAgent
```

---

## Cost Analysis

### Before: Separate Audit Database

```
Main Database (Neon Scale):    $69/month
Audit Database (Neon Basic):   $20/month
──────────────────────────────────────────
Total:                          $89/month
```

### After: Unified Database

```
Main Database (Neon Scale):    $69/month
Audit logs included:           $0/month (same DB)
──────────────────────────────────────────
Total:                          $69/month

SAVINGS: $20/month ($240/year)
```

**Additional benefits:**

- Single connection pool (better performance)
- Simpler operations (one database)
- Atomic transactions (app + audit)
- No sync issues

---

## Best Practices

### 1. Always Log PHI Access

```typescript
// ✅ Good: Log every PHI access
export async function getMedicalRecord(id: string) {
  const record = await db.query.MedicalRecordsTable.findFirst(...);
  await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', id);
  return record;
}

// ❌ Bad: Forgot to log
export async function getMedicalRecord(id: string) {
  return await db.query.MedicalRecordsTable.findFirst(...);
}
```

### 2. Use Typed Actions

```typescript
// ✅ Good: Type-safe action
await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', id);

// ❌ Bad: String literal (typos!)
await logAuditEvent('medical_record_viewed', 'record', id);
```

### 3. Include Change Tracking for Updates

```typescript
// ✅ Good: Track what changed
await logAuditEvent('APPOINTMENT_UPDATED', 'appointment', id, {
  oldValues: { status: 'pending' },
  newValues: { status: 'confirmed' },
});
```

### 4. Don't Block User Actions on Audit Failures

```typescript
// ✅ Good: Audit failures are logged but don't block
export async function logAuditEvent(...) {
  try {
    await db.insert(AuditLogsTable).values(...);
  } catch (error) {
    console.error('[AUDIT FAILURE]', error);
    // Alert monitoring, but DON'T throw
  }
}
```

### 5. Regular Exports for Compliance

```typescript
// Monthly automated export
export async function monthlyAuditExport() {
  const lastMonth = {
    startDate: startOfMonth(subMonths(new Date(), 1)),
    endDate: endOfMonth(subMonths(new Date(), 1)),
  };

  const { exportRecord, logs } = await exportAuditLogs({
    ...lastMonth,
    reason: 'Monthly compliance backup',
  });

  // Save to secure storage
  await saveToSecureStorage(exportRecord.id, logs);
}
```

---

## Monitoring & Alerts

### Daily Statistics

```typescript
// Run via cron: daily at 1am
export async function generateDailyAuditStats() {
  const yesterday = subDays(new Date(), 1);

  const stats = await generateComplianceReport(startOfDay(yesterday), endOfDay(yesterday));

  // Check for anomalies
  if (stats.summary.securityEvents > 0) {
    await alertSecurityTeam(stats);
  }

  if (stats.summary.medicalRecordAccess > 1000) {
    await alertComplianceTeam(stats);
  }
}
```

### Real-time Alerts

```typescript
// Alert on suspicious activity
export async function logAuditEventWithAlerts(...) {
  await logAuditEvent(...);

  // Check for suspicious patterns
  if (action.includes('UNAUTHORIZED')) {
    await alertSecurityTeam({ action, resourceType, workosUserId });
  }

  // After-hours PHI access
  const hour = new Date().getHours();
  if (hour < 6 || hour > 22) {
    if (resourceType === 'medical_record') {
      await alertComplianceOfficer({ hour, action, workosUserId });
    }
  }
}
```

---

## Resources

- [Neon RLS Documentation](https://neon.tech/docs/guides/neon-rls)
- [WorkOS Audit Logs](https://workos.com/docs/audit-logs)
- [HIPAA Audit Log Requirements](https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html)
- [Drizzle ORM RLS](https://orm.drizzle.team/docs/rls)

---

**Last Updated:** November 3, 2025  
**Document Owner:** DevOps Team  
**Review Frequency:** Quarterly
