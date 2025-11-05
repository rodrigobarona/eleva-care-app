# Hybrid Audit Logging Strategy

## Overview

Eleva Care implements a **hybrid audit logging approach** combining **WorkOS Audit Logs** for authentication/authorization events with a **custom audit database** for PHI (Protected Health Information) and medical record access tracking.

**Last Updated:** November 3, 2025  
**Status:** Active  
**Compliance:** HIPAA §164.312(b), GDPR Article 30, Lei n.º 58/2019  
**Owner:** Compliance Officer

---

## Table of Contents

1. [Why Hybrid Approach](#why-hybrid-approach)
2. [Architecture Overview](#architecture-overview)
3. [WorkOS Audit Logs](#workos-audit-logs)
4. [Custom Audit Database](#custom-audit-database)
5. [Implementation Guide](#implementation-guide)
6. [Compliance Requirements](#compliance-requirements)
7. [Audit Log Retention](#audit-log-retention)
8. [Querying Audit Logs](#querying-audit-logs)
9. [Monitoring & Alerts](#monitoring--alerts)

---

## Why Hybrid Approach

### Two Types of Events

**Authentication/Authorization Events (WorkOS)**

- User sign-in/sign-out
- Password changes
- Organization membership changes
- Role assignments
- SSO connections
- Directory sync events

**Healthcare/PHI Events (Custom DB)**

- Medical record access
- Appointment creation/modification
- Payment processing
- Prescription viewing
- Lab result access
- Health data exports

### Benefits of Hybrid Approach

| Requirement               | WorkOS Solution               | Custom DB Solution        |
| ------------------------- | ----------------------------- | ------------------------- |
| Auth event tracking       | ✅ Built-in, tamper-proof     | ❌ Manual implementation  |
| PHI access tracking       | ❌ Not designed for PHI       | ✅ Complete control       |
| Organization transparency | ✅ Admin Portal for customers | ❌ Internal only          |
| HIPAA compliance          | ⚠️ Partial coverage           | ✅ Complete coverage      |
| Export capability         | ✅ API + Admin Portal         | ✅ Direct SQL access      |
| Cost                      | ✅ Free (< 100 orgs)          | 💰 Database storage       |
| Retention control         | ⚠️ WorkOS manages             | ✅ Full control (7 years) |

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                   Hybrid Audit Logging Flow                    │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  Authentication Events                                         │
│  ├─> user.signed_in                                           │
│  ├─> user.signed_out                                          │
│  ├─> user.password_reset                                      │
│  ├─> org.created                                              │
│  ├─> org.membership_added                                     │
│  └─> sso.connected                                            │
│      │                                                         │
│      └──> WorkOS Audit Logs API                               │
│           ├─> Stored in WorkOS infrastructure                 │
│           ├─> Accessible via Admin Portal                     │
│           └─> Exportable via API                              │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│                                                                │
│  Healthcare/PHI Events                                         │
│  ├─> medical_record.accessed                                  │
│  ├─> medical_record.created                                   │
│  ├─> medical_record.updated                                   │
│  ├─> appointment.created                                      │
│  ├─> payment.processed                                        │
│  └─> health_data.exported                                     │
│      │                                                         │
│      └──> Custom Audit Database (Neon)                        │
│           ├─> Stored in dedicated audit DB                    │
│           ├─> Separate from operational data                  │
│           └─> 7-year retention for HIPAA                      │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

---

## WorkOS Audit Logs

### Event Categories

#### 1. Authentication Events

```typescript
// lib/integrations/workos/audit.ts
import { workos } from './client';

export async function logAuthEvent(params: {
  action: 'user.signed_in' | 'user.signed_out' | 'user.password_reset';
  orgId: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}) {
  await workos.auditLogs.createEvent({
    organizationId: params.orgId,
    event: {
      action: params.action,
      occurredAt: new Date(),
      actor: {
        type: 'user',
        id: params.userId,
        name: params.userEmail,
        metadata: {
          ip_address: params.ipAddress,
          user_agent: params.userAgent,
        },
      },
      targets: [],
      context: {
        location: params.ipAddress,
        userAgent: params.userAgent,
      },
      metadata: params.metadata || {},
    },
  });
}
```

**Example Usage:**

```typescript
// After successful sign-in
await logAuthEvent({
  action: 'user.signed_in',
  orgId: session.organizationId,
  userId: session.userId,
  userEmail: session.user.email,
  ipAddress: req.ip,
  userAgent: req.headers.get('user-agent') || 'unknown',
  metadata: {
    provider: 'email_password',
    mfa_enabled: false,
  },
});
```

#### 2. Organization Events

```typescript
export async function logOrgEvent(params: {
  action: 'org.created' | 'org.updated' | 'org.deleted';
  orgId: string;
  actorId: string;
  actorEmail: string;
  targetOrgName: string;
  changes?: Record<string, unknown>;
}) {
  await workos.auditLogs.createEvent({
    organizationId: params.orgId,
    event: {
      action: params.action,
      occurredAt: new Date(),
      actor: {
        type: 'user',
        id: params.actorId,
        name: params.actorEmail,
      },
      targets: [
        {
          type: 'organization',
          id: params.orgId,
          name: params.targetOrgName,
        },
      ],
      metadata: {
        changes: params.changes || {},
      },
    },
  });
}
```

#### 3. Membership Events

```typescript
export async function logMembershipEvent(params: {
  action: 'membership.added' | 'membership.removed' | 'membership.role_changed';
  orgId: string;
  actorId: string;
  targetUserId: string;
  targetUserEmail: string;
  role?: string;
  previousRole?: string;
}) {
  await workos.auditLogs.createEvent({
    organizationId: params.orgId,
    event: {
      action: params.action,
      occurredAt: new Date(),
      actor: {
        type: 'user',
        id: params.actorId,
      },
      targets: [
        {
          type: 'user',
          id: params.targetUserId,
          name: params.targetUserEmail,
        },
      ],
      metadata: {
        role: params.role,
        previous_role: params.previousRole,
      },
    },
  });
}
```

### Exporting WorkOS Audit Logs

```typescript
// lib/integrations/workos/audit-export.ts
export async function exportAuditLogs(params: {
  orgId: string;
  startDate: Date;
  endDate: Date;
  actions?: string[];
}) {
  const exportRequest = await workos.auditLogs.createExport({
    organizationId: params.orgId,
    rangeStart: params.startDate.toISOString(),
    rangeEnd: params.endDate.toISOString(),
    actions: params.actions,
  });

  // Poll for export completion
  let exportStatus = await workos.auditLogs.getExport(exportRequest.id);

  while (exportStatus.state === 'pending') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    exportStatus = await workos.auditLogs.getExport(exportRequest.id);
  }

  if (exportStatus.state === 'ready' && exportStatus.url) {
    // Download the export
    const response = await fetch(exportStatus.url);
    return await response.json();
  }

  throw new Error(`Export failed: ${exportStatus.state}`);
}
```

### Admin Portal Access

Organizations can view their audit logs via WorkOS Admin Portal:

```typescript
// Generate Admin Portal session for customers
export async function getAdminPortalUrl(orgId: string) {
  const portalSession = await workos.portal.generateLink({
    organizationId: orgId,
    intent: 'audit_logs',
    returnUrl: 'https://eleva.care/dashboard',
  });

  return portalSession.url;
}
```

---

## Custom Audit Database

### Schema

```typescript
// drizzle/auditSchema.ts
import { jsonb, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  workosUserId: text('workos_user_id').notNull(),  // Changed from clerkUserId
  action: varchar('action', { length: 50 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  resourceId: varchar('resource_id', { length: 255 }),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  organizationId: text('organization_id'),  // NEW: For org context
  createdAt: timestamp('created_at').defaultNow(),
});

// Index for queries
CREATE INDEX idx_audit_logs_user ON audit_logs(workos_user_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

### Event Types

```typescript
// types/audit.ts
export type AuditEventType =
  // Medical Records (PHI)
  | 'CREATE_MEDICAL_RECORD'
  | 'READ_MEDICAL_RECORDS_FOR_MEETING'
  | 'UPDATE_MEDICAL_RECORD'
  | 'DELETE_MEDICAL_RECORD'
  | 'EXPORT_MEDICAL_RECORDS'

  // Appointments
  | 'MEETING_CREATED'
  | 'MEETING_UPDATED'
  | 'MEETING_CANCELLED'
  | 'MEETING_COMPLETED'

  // Payments (Financial PHI)
  | 'PAYMENT_PROCESSED'
  | 'PAYMENT_REFUNDED'
  | 'MEETING_PAYMENT_FAILED'

  // Health Data
  | 'HEALTH_DATA_ACCESSED'
  | 'PRESCRIPTION_VIEWED'
  | 'LAB_RESULTS_ACCESSED'

  // Security Events
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'SUSPICIOUS_ACTIVITY_DETECTED';

export type AuditResourceType =
  | 'medical_record'
  | 'appointment'
  | 'meeting'
  | 'payment_intent'
  | 'health_data'
  | 'prescription'
  | 'lab_result';
```

### Logging Function

```typescript
// lib/utils/server/audit.ts
import { auditDb } from '@/drizzle/auditDb';
import { auditLogs } from '@/drizzle/auditSchema';
import type { AuditEventMetadata, AuditEventType, AuditResourceType } from '@/types/audit';

/**
 * Log audit event to custom database
 * Used for PHI and medical record access tracking
 */
export async function logAuditEvent(
  workosUserId: string,
  action: AuditEventType,
  resourceType: AuditResourceType,
  resourceId: string,
  oldValues: Record<string, unknown> | null,
  newValues: AuditEventMetadata,
  ipAddress: string,
  userAgent: string,
  organizationId?: string,
): Promise<void> {
  try {
    await auditDb.insert(auditLogs).values({
      workosUserId,
      action,
      resourceType,
      resourceId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      organizationId,
      createdAt: new Date(),
    });
  } catch (error) {
    // Log failure but don't block operation
    console.error(
      '[AUDIT FAILURE]',
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : String(error),
          auditData: {
            workosUserId,
            action,
            resourceType,
            resourceId,
            timestamp: new Date().toISOString(),
          },
        },
        null,
        2,
      ),
    );

    // Alert monitoring service
    // Sentry.captureException(error, { extra: { auditData } });
  }
}
```

### Usage Examples

#### Medical Record Access

```typescript
// app/api/records/route.ts
import { requireAuth } from '@/lib/auth/workos-session';
import { logAuditEvent } from '@/lib/utils/server/audit';

export async function GET(req: Request) {
  const session = await requireAuth();
  const { searchParams } = new URL(req.url);
  const meetingId = searchParams.get('meetingId');

  // Fetch medical records
  const records = await getMedicalRecords(meetingId);

  // Log PHI access
  await logAuditEvent(
    session.userId,
    'READ_MEDICAL_RECORDS_FOR_MEETING',
    'medical_record',
    meetingId!,
    null,
    {
      meetingId,
      recordCount: records.length,
      timestamp: new Date().toISOString(),
    },
    req.headers.get('x-forwarded-for') || 'unknown',
    req.headers.get('user-agent') || 'unknown',
    session.organizationId,
  );

  return Response.json({ records });
}
```

#### Payment Processing

```typescript
// app/api/webhooks/stripe/handlers/payment.ts
await logAuditEvent(
  customerId,
  'PAYMENT_PROCESSED',
  'payment_intent',
  paymentIntentId,
  null,
  {
    amount: amount / 100,
    currency: 'eur',
    meetingId,
    status: 'succeeded',
  },
  'stripe_webhook',
  'Stripe-Webhook',
  organizationId,
);
```

---

## Implementation Guide

### Step 1: Install Dependencies

```bash
pnpm add @workos-inc/node
# iron-session already installed
```

### Step 2: Configure Environment

```bash
# .env.local
WORKOS_API_KEY=sk_test_...
WORKOS_CLIENT_ID=client_...
AUDITLOG_DATABASE_URL=postgresql://...  # Separate audit DB
```

### Step 3: Create Audit Helper Functions

```typescript
// lib/audit/index.ts
import { logAuthEvent } from '@/lib/integrations/workos/audit';
import { logAuditEvent } from '@/lib/utils/server/audit';

/**
 * Determine which audit system to use based on event type
 */
export async function logEvent(params: {
  category: 'auth' | 'phi' | 'org' | 'membership';
  action: string;
  userId: string;
  userEmail?: string;
  orgId?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
}) {
  // Authentication/Org events → WorkOS Audit Logs
  if (params.category === 'auth' || params.category === 'org' || params.category === 'membership') {
    await logAuthEvent({
      action: params.action as any,
      orgId: params.orgId!,
      userId: params.userId,
      userEmail: params.userEmail!,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    });
  }

  // PHI events → Custom Audit DB
  if (params.category === 'phi') {
    await logAuditEvent(
      params.userId,
      params.action as any,
      params.resourceType as any,
      params.resourceId!,
      null,
      params.metadata || {},
      params.ipAddress,
      params.userAgent,
      params.orgId,
    );
  }
}
```

### Step 4: Implement in Application

```typescript
// Example: Sign-in handler
import { logEvent } from '@/lib/audit';

export async function handleSignIn(req: Request) {
  const session = await authenticateUser(req);

  // Log to WorkOS Audit Logs
  await logEvent({
    category: 'auth',
    action: 'user.signed_in',
    userId: session.userId,
    userEmail: session.user.email,
    orgId: session.organizationId,
    ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    metadata: {
      provider: 'email_password',
      mfa_enabled: session.user.mfaEnabled,
    },
  });

  return session;
}
```

---

## Compliance Requirements

### HIPAA §164.312(b) - Audit Controls

**Requirement:**

> Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use electronic protected health information.

**Our Implementation:**

- ✅ Custom audit database records all PHI access
- ✅ Immutable audit trail (append-only)
- ✅ 7-year retention period
- ✅ Searchable and exportable logs
- ✅ IP address and user agent tracking
- ✅ Before/after values for modifications

### GDPR Article 30 - Records of Processing

**Requirement:**

> Maintain records of processing activities under its responsibility.

**Our Implementation:**

- ✅ Both WorkOS and custom logs provide processing records
- ✅ User identification (WorkOS user ID)
- ✅ Purpose of processing (event action)
- ✅ Categories of data (resource type)
- ✅ Timestamp of processing

### Portuguese Law - Lei n.º 58/2019

**Requirement:**

> Healthcare providers must maintain audit trails of access to patient data.

**Our Implementation:**

- ✅ Custom audit DB tracks all medical record access
- ✅ Logs include accessor identity, timestamp, and purpose
- ✅ Retained for regulatory period
- ✅ Available for inspection by CNPD (Data Protection Authority)

---

## Audit Log Retention

### Retention Policies

| Log Type        | System    | Retention Period         | Reason                |
| --------------- | --------- | ------------------------ | --------------------- |
| Auth events     | WorkOS    | 90 days (WorkOS default) | Operational needs     |
| PHI access      | Custom DB | 7 years                  | HIPAA requirement     |
| Payment events  | Custom DB | 7 years                  | Tax/legal requirement |
| Org changes     | WorkOS    | 90 days                  | Operational needs     |
| Security events | Custom DB | 7 years                  | Legal protection      |

### Archival Process

```sql
-- Monthly archival job (run via cron)
CREATE TABLE audit_logs_archive (
  LIKE audit_logs INCLUDING ALL
);

-- Archive logs older than 7 years
INSERT INTO audit_logs_archive
SELECT * FROM audit_logs
WHERE created_at < NOW() - INTERVAL '7 years';

-- Delete archived logs from main table
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '7 years';
```

### Backup Strategy

```bash
# Daily backup of audit database
pg_dump $AUDITLOG_DATABASE_URL > audit_backup_$(date +%Y%m%d).sql

# Upload to secure storage
aws s3 cp audit_backup_$(date +%Y%m%d).sql \
  s3://eleva-audit-backups/ \
  --storage-class GLACIER_INSTANT_RETRIEVAL
```

---

## Querying Audit Logs

### WorkOS Audit Logs API

```typescript
// Query recent auth events
export async function getRecentAuthEvents(orgId: string, limit: number = 50) {
  const events = await workos.auditLogs.list({
    organizationId: orgId,
    limit,
    order: 'desc',
  });

  return events.data;
}

// Query specific user's auth history
export async function getUserAuthHistory(
  orgId: string,
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  return await exportAuditLogs({
    orgId,
    startDate,
    endDate,
    actions: ['user.signed_in', 'user.signed_out', 'user.password_reset'],
  });
}
```

### Custom Audit Database Queries

```typescript
// Query medical record access for a patient
export async function getPatientRecordAccess(patientId: string) {
  return await auditDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.resourceType, 'medical_record'),
        eq(auditLogs.resourceId, patientId),
        like(auditLogs.action, 'READ%'),
      ),
    )
    .orderBy(desc(auditLogs.createdAt));
}

// Query suspicious activity
export async function getSuspiciousActivity(since: Date) {
  return await auditDb
    .select()
    .from(auditLogs)
    .where(
      and(
        gte(auditLogs.createdAt, since),
        or(
          eq(auditLogs.action, 'UNAUTHORIZED_ACCESS_ATTEMPT'),
          eq(auditLogs.action, 'SUSPICIOUS_ACTIVITY_DETECTED'),
        ),
      ),
    )
    .orderBy(desc(auditLogs.createdAt));
}

// Audit report for compliance
export async function generateComplianceReport(orgId: string, startDate: Date, endDate: Date) {
  const [workosEvents, customEvents] = await Promise.all([
    exportAuditLogs({ orgId, startDate, endDate }),
    auditDb
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, orgId),
          gte(auditLogs.createdAt, startDate),
          lte(auditLogs.createdAt, endDate),
        ),
      ),
  ]);

  return {
    organization: orgId,
    period: { start: startDate, end: endDate },
    authEvents: workosEvents.length,
    phiAccessEvents: customEvents.length,
    summary: {
      signIns: workosEvents.filter((e) => e.action === 'user.signed_in').length,
      medicalRecordAccess: customEvents.filter((e) => e.action.includes('MEDICAL_RECORD')).length,
      payments: customEvents.filter((e) => e.action.includes('PAYMENT')).length,
    },
    events: {
      workos: workosEvents,
      custom: customEvents,
    },
  };
}
```

---

## Monitoring & Alerts

### Alert Rules

```typescript
// lib/monitoring/audit-alerts.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Alert on suspicious audit patterns
 */
export async function checkAuditAnomalies() {
  // 1. Multiple failed access attempts
  const failedAttempts = await auditDb
    .select()
    .from(auditLogs)
    .where(
      and(
        like(auditLogs.action, 'FAILED_%'),
        gte(auditLogs.createdAt, new Date(Date.now() - 3600000)), // Last hour
      ),
    );

  if (failedAttempts.length > 10) {
    await sendAlert({
      subject: 'ALERT: Multiple Failed Access Attempts',
      message: `Detected ${failedAttempts.length} failed access attempts in the last hour`,
      severity: 'high',
    });
  }

  // 2. After-hours PHI access
  const now = new Date();
  const hour = now.getHours();

  if (hour < 6 || hour > 22) {
    const afterHoursAccess = await auditDb
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceType, 'medical_record'),
          gte(auditLogs.createdAt, new Date(Date.now() - 3600000)),
        ),
      );

    if (afterHoursAccess.length > 0) {
      await sendAlert({
        subject: 'ALERT: After-Hours PHI Access',
        message: `Detected ${afterHoursAccess.length} medical record access events after hours`,
        severity: 'medium',
      });
    }
  }

  // 3. Unusual data export volume
  const exports = await auditDb
    .select()
    .from(auditLogs)
    .where(
      and(
        like(auditLogs.action, '%EXPORT%'),
        gte(auditLogs.createdAt, new Date(Date.now() - 86400000)), // Last 24h
      ),
    );

  if (exports.length > 5) {
    await sendAlert({
      subject: 'ALERT: High Volume of Data Exports',
      message: `Detected ${exports.length} data export events in the last 24 hours`,
      severity: 'high',
    });
  }
}

async function sendAlert(alert: {
  subject: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}) {
  await resend.emails.send({
    from: 'security@eleva.care',
    to: ['compliance@eleva.care', 'security@eleva.care'],
    subject: `[${alert.severity.toUpperCase()}] ${alert.subject}`,
    html: `
      <h2>${alert.subject}</h2>
      <p>${alert.message}</p>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    `,
  });
}
```

### Scheduled Monitoring

```typescript
// app/api/cron/audit-monitoring/route.ts
import { checkAuditAnomalies } from '@/lib/monitoring/audit-alerts';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await checkAuditAnomalies();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Audit monitoring failed:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/audit-monitoring",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## Migration from Clerk Audit Logs

### Update Audit Schema

```sql
-- Add workosUserId column
ALTER TABLE audit_logs ADD COLUMN workos_user_id TEXT;

-- Migrate existing data
UPDATE audit_logs
SET workos_user_id = users_new.workos_user_id
FROM users_new
WHERE audit_logs.clerk_user_id = users_new.legacy_clerk_id;

-- After verification, drop old column
-- ALTER TABLE audit_logs DROP COLUMN clerk_user_id;
```

### Update Audit Function

```typescript
// Before (Clerk)
await logAuditEvent(
  clerkUserId, // ← Old
  action,
  // ...
);

// After (WorkOS)
await logAuditEvent(
  workosUserId, // ← New
  action,
  // ...
);
```

---

## Best Practices

### 1. Choose Correct Audit System

```typescript
// ✅ Auth events → WorkOS
await logAuthEvent({ action: 'user.signed_in', ... });

// ✅ PHI events → Custom DB
await logAuditEvent('READ_MEDICAL_RECORDS_FOR_MEETING', ...);
```

### 2. Include Context

```typescript
// ✅ Good - Rich context
await logAuditEvent(
  userId,
  'READ_MEDICAL_RECORDS',
  'medical_record',
  recordId,
  null,
  {
    meetingId,
    recordCount: 5,
    purpose: 'consultation',
    duration_ms: 3000,
  },
  ipAddress,
  userAgent,
  orgId,
);

// ❌ Bad - Minimal context
await logAuditEvent(userId, 'READ', 'record', recordId, null, {}, '', '', '');
```

### 3. Don't Block on Audit Failures

```typescript
// ✅ Good - Logs error but continues
try {
  await logAuditEvent(...);
} catch (error) {
  console.error('Audit logging failed:', error);
  // Don't throw - operation should succeed
}

// ❌ Bad - Blocks operation
await logAuditEvent(...); // If this fails, everything fails
```

### 4. Regular Audits of Audit Logs

```typescript
// Monthly audit review
export async function performAuditReview(month: Date) {
  const report = await generateComplianceReport(orgId, startOfMonth(month), endOfMonth(month));

  // Review for anomalies
  // Export for compliance records
  // Archive if needed
}
```

---

## Resources

- [WorkOS Audit Logs API](https://workos.com/docs/audit-logs)
- [HIPAA Audit Requirements](https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html)
- [GDPR Article 30 Requirements](https://gdpr-info.eu/art-30-gdpr/)
- [Eleva Audit Logging Strategy](./audit-logging-strategy.md)

---

**Questions?** Contact: compliance@eleva.care
