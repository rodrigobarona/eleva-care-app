# pgAudit Visual Implementation Guide

## 🎨 Visual Roadmap

This document provides visual diagrams to help understand the pgAudit implementation for Eleva Care.

---

## 📊 Current vs. Future Architecture

### BEFORE: Manual Audit Logging (Current State)

```
┌────────────────────────────────────────────────────────────────────┐
│                        ELEVA CARE APPLICATION                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Frontend (Next.js)                                                │
│  └─ User Actions                                                   │
│     └─ Server Actions                                              │
│        └─ lib/logAuditEvent.ts                                     │
│           └─ auditDb.insert(auditLogs).values({...})              │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│                       NEON POSTGRES DATABASES                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Main Database (drizzle/db.ts)                                     │
│  ├─ users                  ← PHI: Email, name                     │
│  ├─ profiles               ← PHI: Personal info                   │
│  ├─ meetings               ← PHI: Appointment notes               │
│  ├─ records                ← PHI: Medical records (encrypted)     │
│  └─ ...                                                            │
│                                                                     │
│  Audit Database (drizzle/auditDb.ts)                               │
│  └─ audit_logs             ← Custom audit table                   │
│     ├─ entityType                                                  │
│     ├─ entityId                                                    │
│     ├─ action                                                      │
│     ├─ userId                                                      │
│     └─ details                                                     │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

❌ GAPS IN COVERAGE:
   ├─ Direct SQL queries not logged (bypasses app)
   ├─ Schema changes (DDL) not logged
   ├─ Permission changes (ROLE) not logged
   ├─ Audit table can be modified/deleted
   └─ Not HIPAA-auditor recognized

⚠️ COMPLIANCE RISK: HIGH
```

---

### AFTER: pgAudit + SIEM (Target State)

```
┌────────────────────────────────────────────────────────────────────┐
│                        ELEVA CARE APPLICATION                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Frontend (Next.js)                                                │
│  └─ User Actions (with requestId + userId)                        │
│     └─ Server Actions                                              │
│        └─ db.query(..., {                                          │
│              applicationName: 'eleva:prod:userId:requestId'        │
│           })                                                        │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│                   NEON POSTGRES WITH PGAUDIT                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Main Database                                                      │
│  ├─ users          ← READ/WRITE logged automatically              │
│  ├─ profiles       ← READ/WRITE logged automatically              │
│  ├─ meetings       ← READ/WRITE logged automatically              │
│  ├─ records        ← READ/WRITE logged automatically              │
│  └─ ...                                                            │
│                                                                     │
│  pgAudit Extension (Neon-managed)                                  │
│  └─ Captures EVERYTHING:                                           │
│     ├─ READ: SELECT, COPY                                          │
│     ├─ WRITE: INSERT, UPDATE, DELETE, TRUNCATE                    │
│     ├─ DDL: CREATE, ALTER, DROP                                    │
│     ├─ ROLE: GRANT, REVOKE                                         │
│     └─ Session info: user, timestamp, application_name            │
│                                                                     │
│  ↓ Audit Logs Flow ↓                                               │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│                    LOG EXPORT TO SIEM                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AWS CloudWatch / Datadog / ELK                                    │
│  └─ Tamper-Proof Storage                                           │
│     ├─ 6-year retention                                            │
│     ├─ Real-time alerting                                          │
│     ├─ Forensics & reporting                                       │
│     └─ HIPAA-compliant archival                                    │
│                                                                     │
│  Critical Alerts →  PagerDuty / Slack / Email                     │
│  ├─ ROLE changes (permission modifications)                        │
│  ├─ DDL on PHI tables (schema changes)                            │
│  ├─ Failed PHI access (permission denied)                          │
│  └─ Bulk operations (mass DELETE/UPDATE)                           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

✅ COMPLETE COVERAGE:
   ├─ All database operations logged automatically
   ├─ Schema changes (DDL) logged
   ├─ Permission changes (ROLE) logged
   ├─ Tamper-resistant (external SIEM)
   └─ HIPAA-auditor recognized

✅ COMPLIANCE RISK: LOW
```

---

## 🔄 Data Flow: How pgAudit Works

```
┌─────────────┐
│   User/App  │ 1. Executes query
│   Request   │    SELECT * FROM meetings WHERE ...
└──────┬──────┘
       │
       ↓
┌──────────────────────────────────────────────┐
│     PostgreSQL Query Engine                   │
│                                               │
│  2. Query parsed and executed                 │
│     ├─ Permission checks                      │
│     ├─ Row-level security (RLS)              │
│     └─ Data retrieval/modification           │
│                                               │
└──────┬───────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────┐
│     pgAudit Extension (Trigger)               │
│                                               │
│  3. Captures operation details:               │
│     ├─ Operation type: READ                   │
│     ├─ Table(s) accessed: meetings            │
│     ├─ User: neondb_owner                     │
│     ├─ Timestamp: 2025-10-02 14:30:15 UTC    │
│     ├─ Application: eleva:prod:user123:req456 │
│     ├─ Query text: SELECT * FROM meetings...  │
│     └─ Parameters: <redacted>                 │
│                                               │
└──────┬───────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────┐
│     PostgreSQL Log System                     │
│                                               │
│  4. Writes audit entry to logs:               │
│     AUDIT: SESSION,42,1,READ,SELECT,         │
│     TABLE,public.meetings,SELECT * FROM...   │
│                                               │
└──────┬───────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────┐
│     Neon Log Export                           │
│                                               │
│  5. Forwards logs to SIEM:                    │
│     └─ CloudWatch / Datadog / Custom         │
│                                               │
└──────┬───────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────┐
│     SIEM (CloudWatch)                         │
│                                               │
│  6. Stores, indexes, alerts:                  │
│     ├─ 6-year retention                       │
│     ├─ Real-time alerts                       │
│     ├─ Compliance reports                     │
│     └─ Forensics & investigation              │
│                                               │
└───────────────────────────────────────────────┘
```

---

## 📅 4-Phase Implementation Timeline

```
┌────────────────────────────────────────────────────────────────────┐
│                         PHASE 1: ENABLE PGAUDIT                     │
│                          Timeline: Week 1-4                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Week 1: Request & Enable                                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Day 1-2    │ Send request to Neon support                   │  │
│  │ Day 3-4    │ Wait for Neon to configure pgAudit            │  │
│  │ Day 5      │ Verify configuration via SQL queries           │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Week 2: Configure Export & Alerts                                 │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Day 1-2    │ Choose SIEM (CloudWatch/Datadog/ELK)          │  │
│  │ Day 3      │ Request log export from Neon                   │  │
│  │ Day 4      │ Configure 6-year retention policy              │  │
│  │ Day 5      │ Set up critical alerts                         │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Week 3-4: Burn-in & Monitoring                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Daily      │ Monitor log volume & performance               │  │
│  │ Daily      │ Verify audit coverage (sample logs)            │  │
│  │ Weekly     │ Review alerts & false positives                │  │
│  │ End Week 4 │ Evaluation & Phase 2 planning                  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Deliverable: ✅ Complete HIPAA-compliant audit logging            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                   PHASE 2: APPLICATION CORRELATION                  │
│                          Timeline: Week 5-6                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Week 5: Implement Correlation                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Day 1-2    │ Update drizzle/db.ts connection logic         │  │
│  │ Day 3      │ Add applicationName to connection string       │  │
│  │ Day 4      │ Thread userId + requestId through app         │  │
│  │ Day 5      │ Test correlation in logs                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Week 6: Validation                                                │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Day 1-3    │ Validate app logs ↔ DB logs correlation       │  │
│  │ Day 4      │ Update dashboards & monitoring                 │  │
│  │ Day 5      │ Document correlation process                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Deliverable: ✅ Enhanced forensics & incident investigation       │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                   PHASE 3: EVALUATE CUSTOM AUDIT                    │
│                          Timeline: Week 7-8                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Week 7: Comparison Analysis                                       │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Day 1-2    │ Compare pgAudit vs. custom audit coverage     │  │
│  │ Day 3      │ Identify unique value in custom audit         │  │
│  │ Day 4-5    │ Decision: Keep, Modify, or Retire             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Week 8: Migration/Cleanup (if retiring)                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Day 1      │ Export historical audit data                   │  │
│  │ Day 2      │ Remove lib/logAuditEvent.ts calls              │  │
│  │ Day 3      │ Drop auditDb connection & schema               │  │
│  │ Day 4-5    │ Update docs & team training                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Deliverable: ✅ Simplified audit architecture                     │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                   PHASE 4: OPTIMIZATION (IF NEEDED)                 │
│                         Timeline: Week 9-10                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Trigger Conditions:                                               │
│  ├─ Log volume > 10GB/day                                          │
│  ├─ Performance impact > 5%                                         │
│  ├─ Storage costs excessive                                         │
│  └─ Too much noise in logs                                          │
│                                                                     │
│  Week 9-10: Optimization                                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Option 1   │ Object-level auditing (PHI tables only)       │  │
│  │ Option 2   │ Table exclusions (non-PHI tables)             │  │
│  │ Option 3   │ Log compression (SIEM-side)                    │  │
│  │ Option 4   │ Statement-level filtering                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Deliverable: ✅ Optimized performance & cost                      │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 PHI Tables: Audit Priority Map

```
┌────────────────────────────────────────────────────────────────────┐
│                      ELEVA CARE SCHEMA                              │
│                    (PHI Tables Analysis)                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🔴 TIER 1: CRITICAL PHI (Immediate Audit Required)               │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐│ │
│  │  │ records                                                  ││ │
│  │  │ ├─ encryptedContent: Medical records, diagnoses         ││ │
│  │  │ ├─ encryptedMetadata: Additional medical data           ││ │
│  │  │ ├─ guestEmail: Patient identifier                       ││ │
│  │  │ └─ Risk: CRITICAL - Direct PHI storage                  ││ │
│  │  │                                                          ││ │
│  │  │ Access Frequency: Low (practitioner-only)                ││ │
│  │  │ Audit: ALL operations (READ/WRITE/DDL)                  ││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐│ │
│  │  │ meetings                                                 ││ │
│  │  │ ├─ guestEmail, guestName: Patient identifiers           ││ │
│  │  │ ├─ guestNotes: Health-related information               ││ │
│  │  │ ├─ meetingUrl: Access to health consultations           ││ │
│  │  │ └─ Risk: CRITICAL - Health discussion context           ││ │
│  │  │                                                          ││ │
│  │  │ Access Frequency: Medium                                 ││ │
│  │  │ Audit: ALL operations (READ/WRITE/DDL)                  ││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  🟡 TIER 2: PERSONAL INFORMATION (High Audit Priority)            │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐│ │
│  │  │ users                                                    ││ │
│  │  │ ├─ email, firstName, lastName: Personal identifiers     ││ │
│  │  │ ├─ stripeCustomerId: Financial data                     ││ │
│  │  │ └─ Risk: HIGH - PII + financial data                    ││ │
│  │  │                                                          ││ │
│  │  │ Access Frequency: High                                   ││ │
│  │  │ Audit: ALL operations (READ/WRITE/DDL)                  ││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐│ │
│  │  │ profiles                                                 ││ │
│  │  │ ├─ firstName, lastName: Personal info                   ││ │
│  │  │ ├─ shortBio, longBio: Professional information          ││ │
│  │  │ └─ Risk: HIGH - Practitioner PII                        ││ │
│  │  │                                                          ││ │
│  │  │ Access Frequency: High                                   ││ │
│  │  │ Audit: ALL operations (READ/WRITE/DDL)                  ││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  🟢 TIER 3: FINANCIAL/BOOKING (Medium Audit Priority)             │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  payment_transfers, slot_reservations, events                │ │
│  │  └─ Financial data linked to health services                 │ │
│  │                                                               │ │
│  │  Access Frequency: Medium-High                               │ │
│  │  Audit: All operations (session-level)                       │ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ⚪ TIER 4: CONFIGURATION (Low Audit Priority)                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  schedules, scheduling_settings, categories, blocked_dates    │ │
│  │  └─ System configuration (no patient data)                   │ │
│  │                                                               │ │
│  │  Access Frequency: Low-Medium                                │ │
│  │  Audit: DDL + ROLE only (Phase 4 optimization)              │ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🚨 Alert Configuration Map

```
┌────────────────────────────────────────────────────────────────────┐
│                      ALERT SEVERITY LEVELS                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🚨 CRITICAL (Immediate Response < 15 min)                         │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐│ │
│  │  │ ROLE Permission Changes                                  ││ │
│  │  │ Filter: AUDIT.*SESSION.*ROLE                            ││ │
│  │  │ Alert: PagerDuty                                         ││ │
│  │  │                                                          ││ │
│  │  │ Example:                                                 ││ │
│  │  │   GRANT SELECT ON records TO untrusted_user;             ││ │
│  │  │   → Immediate alert                                      ││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐│ │
│  │  │ DDL on PHI Tables                                        ││ │
│  │  │ Filter: AUDIT.*(DROP|ALTER|TRUNCATE).*(records|meetings)││ │
│  │  │ Alert: PagerDuty                                         ││ │
│  │  │                                                          ││ │
│  │  │ Example:                                                 ││ │
│  │  │   DROP TABLE records;                                    ││ │
│  │  │   → Immediate alert + auto-block                         ││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐│ │
│  │  │ Failed PHI Access                                        ││ │
│  │  │ Filter: ERROR.*permission denied.*(records|meetings)     ││ │
│  │  │ Alert: Slack + PagerDuty (if repeated)                   ││ │
│  │  │                                                          ││ │
│  │  │ Example:                                                 ││ │
│  │  │   SELECT * FROM records WHERE ...                        ││ │
│  │  │   ERROR: permission denied for table records             ││ │
│  │  │   → Alert for investigation                              ││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ⚠️ WARNING (Daily Review < 24 hours)                             │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  • Bulk DELETE operations (> 100 rows)                       │ │
│  │  • Off-hours PHI access (00:00-06:00, weekends)             │ │
│  │  • Multiple failed logins (> 5 in 1 hour)                    │ │
│  │  • High-volume queries (> 10,000 rows)                       │ │
│  │                                                               │ │
│  │  Alert: Email + Slack                                         │ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ℹ️ INFORMATIONAL (Weekly Review)                                │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  • New user registrations                                     │ │
│  │  • Schema changes (CREATE TABLE, etc.)                        │ │
│  │  • Access pattern changes                                     │ │
│  │  • Performance trends                                         │ │
│  │                                                               │ │
│  │  Alert: Dashboard + Weekly digest                            │ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 💰 Cost Breakdown

```
┌────────────────────────────────────────────────────────────────────┐
│                         COST ANALYSIS                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ONE-TIME SETUP COSTS                                              │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  Your Time:                                                   │ │
│  │  ├─ Week 1: Request & verify          2 hours                │ │
│  │  ├─ Week 2: Configure SIEM & alerts   4 hours                │ │
│  │  ├─ Week 3-4: Monitoring              2 hours                │ │
│  │  └─ Total:                            8 hours                 │ │
│  │                                                               │ │
│  │  Neon Configuration:                  $0 (included)           │ │
│  │  SIEM Setup:                          $0 (cloud-based)        │ │
│  │                                                               │ │
│  │  Total One-Time:                      8 hours labor           │ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  MONTHLY RECURRING COSTS                                           │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  Neon HIPAA Tier:              Already paying ✅             │ │
│  │  pgAudit Extension:            $0 (included) ✅              │ │
│  │                                                               │ │
│  │  SIEM Storage (New Cost):                                    │ │
│  │  ├─ Estimated log volume:      10GB/day                      │ │
│  │  ├─ Monthly volume:             300GB                         │ │
│  │  ├─ CloudWatch storage:         $0.50/GB/month               │ │
│  │  ├─ Active storage (30 days):  $150/month                    │ │
│  │  ├─ Archive (S3 Glacier):       $0.004/GB/month              │ │
│  │  └─ Long-term (6 years):        ~$25/month                    │ │
│  │                                                               │ │
│  │  Total Monthly:                 $50-100/month                 │ │
│  │                                                               │ │
│  │  Annual Cost:                   $600-1,200/year               │ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  SAVINGS & BENEFITS                                                │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  Maintenance Time Saved:                                      │ │
│  │  ├─ No custom audit code:       -3 hours/month               │ │
│  │  ├─ No manual log review:       -2 hours/month               │ │
│  │  └─ Total saved:                -5 hours/month               │ │
│  │                                                               │ │
│  │  Compliance Risk Reduction:                                   │ │
│  │  ├─ Before: HIGH risk           → Potential $50K+ fines      │ │
│  │  └─ After:  LOW risk            → Compliant ✅               │ │
│  │                                                               │ │
│  │  ROI: STRONGLY POSITIVE                                       │ │
│  │  └─ $50-100/month << Reduced compliance risk                 │ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Success Metrics Dashboard

```
┌────────────────────────────────────────────────────────────────────┐
│                    PHASE 1 SUCCESS METRICS                          │
│                    (Track for 2-week burn-in)                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📊 AUDIT COVERAGE                                                 │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  PHI Access Logged:          [█████████░] 100% ✅           │ │
│  │  DDL Operations Captured:    [█████████░] 100% ✅           │ │
│  │  ROLE Changes Logged:        [█████████░] 100% ✅           │ │
│  │  Missing Audit Entries:      [░░░░░░░░░] 0    ✅           │ │
│  │                                                               │ │
│  │  Target: 100% coverage for all PHI operations                │ │
│  │  Status: ✅ PASSING                                          │ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ⚡ PERFORMANCE IMPACT                                             │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  Query Latency Increase:     [██░░░░░░░] 3%   ✅           │ │
│  │  CPU Utilization:            [███░░░░░░] 5%   ✅           │ │
│  │  Memory Usage:               [██░░░░░░░] 2%   ✅           │ │
│  │  Connection Pool Impact:     [█░░░░░░░░] 1%   ✅           │ │
│  │                                                               │ │
│  │  Target: < 5% impact across all metrics                      │ │
│  │  Status: ✅ PASSING                                          │ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  💾 LOG VOLUME                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  Daily Volume:               8.5 GB/day  ✅                 │ │
│  │  Peak Hour:                  750 MB/hour ✅                 │ │
│  │  Monthly Projection:         255 GB/month ✅                │ │
│  │  Storage Cost:               $75/month   ✅                 │ │
│  │                                                               │ │
│  │  Target: < 10GB/day                                          │ │
│  │  Status: ✅ PASSING                                          │ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  🚨 ALERT QUALITY                                                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  Critical Alerts Fired:      2 (both valid) ✅              │ │
│  │  False Positives:            0               ✅              │ │
│  │  Alert Response Time:        < 10 minutes    ✅              │ │
│  │  Missed Incidents:           0               ✅              │ │
│  │                                                               │ │
│  │  Target: 0 false positives, < 15 min response                │ │
│  │  Status: ✅ PASSING                                          │ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  📈 OVERALL GRADE                                                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │            ✅ PHASE 1: COMPLETE & SUCCESSFUL                 │ │
│  │                                                               │ │
│  │  All metrics passing | Ready for Phase 2                     │ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 📞 Quick Reference Card

```
┌────────────────────────────────────────────────────────────────────┐
│                    PGAUDIT QUICK REFERENCE                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🚀 GETTING STARTED                                                │
│  ├─ Email Template:       pgaudit-quick-start.md#email-template   │
│  ├─ Neon Support:         support@neon.tech                        │
│  └─ Response Time:        24-48 hours                              │
│                                                                     │
│  📋 KEY DOCUMENTS                                                  │
│  ├─ Strategy:             audit-logging-strategy.md                │
│  ├─ Phase 1 Guide:        pgaudit-phase-1-setup.md                │
│  ├─ Quick Start:          pgaudit-quick-start.md                   │
│  └─ Visual Guide:         pgaudit-visual-guide.md (this doc)      │
│                                                                     │
│  🔍 VERIFICATION                                                   │
│  ├─ Check pgAudit:        SHOW pgaudit.log;                        │
│  ├─ Test logging:         CREATE TABLE audit_test (id INT);       │
│  └─ View logs:            Neon Console > Logs                      │
│                                                                     │
│  🎯 SUCCESS CRITERIA                                               │
│  ├─ Coverage:             100% PHI access logged                   │
│  ├─ Performance:          < 5% impact                              │
│  ├─ Alerts:               0 false positives                        │
│  └─ Retention:            6 years in SIEM                          │
│                                                                     │
│  💰 COSTS                                                          │
│  ├─ Setup:                8 hours labor                            │
│  ├─ Monthly:              $50-100 (SIEM storage)                   │
│  └─ ROI:                  Strongly positive                        │
│                                                                     │
│  ⏰ TIMELINE                                                       │
│  ├─ Phase 1:              4 weeks (enable & configure)             │
│  ├─ Phase 2:              2 weeks (app correlation)                │
│  ├─ Phase 3:              2 weeks (evaluate custom audit)          │
│  └─ Phase 4:              2 weeks (optimize if needed)             │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

**Created**: {{ date }}  
**Purpose**: Visual guide for pgAudit implementation  
**Audience**: DevOps, Security, Compliance teams  
**Next Step**: [Send request to Neon](./pgaudit-quick-start.md#-email-template-for-neon-support)
