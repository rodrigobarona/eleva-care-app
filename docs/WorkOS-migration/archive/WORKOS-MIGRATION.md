# WorkOS Migration Documentation Hub

## Overview

This document serves as the central navigation point for all WorkOS migration documentation. Eleva Care is migrating from Clerk to WorkOS + Neon Auth to implement a more scalable, secure, and B2B-ready authentication system.

**Migration Status:** Planning Complete ✅  
**Start Date:** TBD  
**Estimated Duration:** 1-2 weeks  
**Risk Level:** High (Core authentication system)

---

## Quick Links

### 📋 Migration Plan

- **[Migration Plan (Main)](../clerk-to-workos-migration.plan.md)** - Complete migration plan with all phases

### 📚 Technical Documentation

#### Integration Guides

- **[WorkOS Authentication](./09-integrations/workos-authentication.md)** - WorkOS setup, authentication flows, RBAC, session management
- **[Neon Auth + RLS](./03-infrastructure/neon-auth-rls.md)** - JWT validation, Row-Level Security, database client setup

#### Architecture & Design

- **[Org-Per-User Model](./04-development/org-per-user-model.md)** - Multi-tenancy architecture, data isolation, B2B expansion path

#### Compliance & Security

- **[Hybrid Audit Logging](./06-legal/audit-logging-hybrid.md)** - WorkOS Audit Logs + custom DB for HIPAA compliance

#### Implementation Guide

- **[Migration Runbook](./05-guides/workos-migration-runbook.md)** - Step-by-step execution guide with commands and scripts

---

## Migration Architecture

### Before (Clerk)

```
┌──────────────────────────────────────────┐
│             Current State                │
├──────────────────────────────────────────┤
│  Authentication: Clerk                   │
│  Database: Single Neon DB                │
│  User Model: Flat (no organizations)     │
│  RLS: Manual context setting             │
│  Audit: Single custom DB                 │
│  Cost: ~$70/month                        │
└──────────────────────────────────────────┘
```

### After (WorkOS + Neon Auth)

```
┌─────────────────────────────────────────────────┐
│              Target State                        │
├─────────────────────────────────────────────────┤
│  Authentication: WorkOS AuthKit                 │
│  Database: New Neon DB (Scale plan)             │
│  User Model: Org-per-user (multi-tenant)        │
│  RLS: Automatic via Neon Auth + JWT             │
│  Audit: Hybrid (WorkOS + custom)                │
│  Cost: ~$99/month (+$29)                        │
│                                                  │
│  ✅ Zero manual RLS context setting             │
│  ✅ Database-level security                     │
│  ✅ B2B ready (RBAC, SSO, Directory Sync)       │
│  ✅ Complete data isolation                     │
│  ✅ HIPAA-ready infrastructure                  │
└─────────────────────────────────────────────────┘
```

---

## Key Benefits

### Security & Compliance

- ✅ **Automatic RLS**: Neon Auth validates JWTs and extracts user IDs
- ✅ **Database-level security**: Cannot be bypassed by application bugs
- ✅ **HIPAA-ready**: Audit logs + data isolation
- ✅ **GDPR compliant**: Clear data boundaries, easy deletion

### Scalability & Features

- ✅ **Org-per-user**: Each user gets their own organization
- ✅ **B2B ready**: WorkOS RBAC, SSO, Directory Sync
- ✅ **Future-proof**: Supports courses/lectures expansion
- ✅ **Multi-member clinics**: Experts can invite others

### Developer Experience

- ✅ **Simpler code**: No manual RLS context setting
- ✅ **Better performance**: Connection pooling, Neon Scale plan
- ✅ **Unified auth**: WorkOS handles auth, MFA, passwordless
- ✅ **Admin Portal**: Self-service for organizations

---

## Documentation Structure

### 1. **Infrastructure** (`03-infrastructure/`)

Technical setup for Neon database, Neon Auth configuration, and RLS policies.

**Key Topics:**

- JWKS integration with WorkOS
- `auth.user_id()` function usage
- RLS policy patterns
- Performance optimization

**Read if:** You're setting up infrastructure or debugging RLS

### 2. **Development** (`04-development/`)

Application architecture, multi-tenancy model, and coding patterns.

**Key Topics:**

- Organization types and lifecycle
- Database schema design
- Query patterns with RLS
- B2B expansion roadmap

**Read if:** You're implementing features or refactoring code

### 3. **Guides** (`05-guides/`)

Practical step-by-step instructions for executing the migration.

**Key Topics:**

- Phase-by-phase migration steps
- Command reference
- Testing procedures
- Rollback plans

**Read if:** You're executing the migration

### 4. **Legal** (`06-legal/`)

Compliance requirements and audit logging strategy.

**Key Topics:**

- HIPAA audit requirements
- WorkOS vs custom audit logs
- Retention policies
- Compliance reporting

**Read if:** You're ensuring compliance or reviewing audit logs

### 5. **Integrations** (`09-integrations/`)

Third-party service integrations and authentication flows.

**Key Topics:**

- WorkOS SDK usage
- Authentication flows
- Session management
- Webhook handling

**Read if:** You're working with WorkOS APIs or auth flows

---

## Migration Phases Overview

### Phase 1: Infrastructure Setup (Days 1-2)

- Create WorkOS account and configure RBAC
- Create new Neon database (Scale plan)
- Configure Neon Auth with WorkOS JWKS
- Install dependencies

### Phase 2: New Schema (Days 2-4)

- Create organization-scoped tables
- Implement RLS policies using `crudPolicy`
- Add indexes for performance
- Test RLS policies

### Phase 3: WorkOS Integration (Days 4-6)

- Build WorkOS client wrapper
- Implement session management
- Create auth routes and callbacks
- Set up Neon RLS client with JWT

### Phase 4: Code Refactoring (Days 6-9)

- Update all API routes (~50 files)
- Update all server actions (~30 files)
- Replace Clerk auth with WorkOS
- Update database queries for RLS

### Phase 5: Google Calendar (Day 8)

- Create reconnection flow for experts
- Build notification system
- Test calendar integration

### Phase 6: Data Migration (Day 9)

- Export users from Clerk/legacy DB
- Create organizations for each user
- Migrate user data with org_id
- Validate data integrity

### Phase 7: User Communication (Day 10)

- Send password reset emails
- Prepare support documentation
- Set up help desk for migration day

### Phase 8: Testing (Days 11-12)

- Unit tests for RLS policies
- Integration tests for auth flows
- Manual testing checklist
- Load testing

### Phase 9: Deployment (Day 13)

- Update production environment variables
- Deploy to Vercel
- Execute cutover plan
- Monitor for issues

### Phase 10: Post-Migration (Days 14-30)

- Monitor auth success rates
- Track calendar reconnections
- Address support tickets
- Archive legacy systems

---

## Success Criteria

### Technical Metrics

- [ ] 95%+ users logged in successfully
- [ ] 90%+ experts reconnected calendar within 7 days
- [ ] All features working (bookings, payments, profiles)
- [ ] No data loss or corruption
- [ ] RLS policies working correctly
- [ ] Performance equal or better than Clerk

### Compliance Metrics

- [ ] WorkOS Audit Logs capturing auth events
- [ ] Custom audit DB capturing PHI access
- [ ] All audit logs exportable
- [ ] 7-year retention policy in place

### Support Metrics

- [ ] <5 critical support tickets
- [ ] <10 medium support tickets
- [ ] <2 hour average response time
- [ ] Zero security incidents

---

## Risk Mitigation

### High-Risk Areas

**1. Authentication Failure**

- **Risk:** Users unable to log in
- **Mitigation:** Legacy DB remains accessible for rollback
- **Response:** Immediate rollback to Clerk if >20% failure rate

**2. Data Loss**

- **Risk:** Data not properly migrated
- **Mitigation:** Full database backups before migration
- **Response:** Restore from backup, postpone cutover

**3. Calendar Integration Breaks**

- **Risk:** Experts lose calendar sync
- **Mitigation:** Proactive email communication
- **Response:** Expert-by-expert support for reconnection

**4. RLS Policy Errors**

- **Risk:** Users see wrong data or no data
- **Mitigation:** Comprehensive RLS testing
- **Response:** Admin DB queries to verify, fix policies

### Rollback Plan

**Trigger Conditions:**

- > 20% authentication failure rate
- Data corruption detected
- Critical security vulnerability discovered
- > 50 support tickets in first 24 hours

**Rollback Steps:**

1. Switch DNS/env vars back to Clerk
2. Restore legacy database from backup
3. Deploy previous codebase version
4. Notify users of temporary reversion
5. Investigate root cause
6. Plan revised migration attempt

---

## Communication Plan

### Pre-Migration (1 week before)

**Email to all users:**

```
Subject: Important: Eleva Care Platform Upgrade

Dear [Name],

We're upgrading our authentication system on [DATE] to provide
enhanced security and new features.

What you need to know:
- Migration will take place [DATE] from [TIME] to [TIME]
- You'll need to reset your password
- Experts: You'll need to reconnect your Google Calendar
- Downtime: ~30 minutes expected

We'll send detailed instructions [DATE - 1 day].

Questions? Reply to this email or visit our help center.

Best regards,
Eleva Care Team
```

### Migration Day

**Status page updates:**

```
T-30min: "Maintenance starting in 30 minutes"
T-0: "Migration in progress, expected completion: [TIME]"
T+30min: "Migration complete, please check your email"
```

**Post-migration email:**

```
Subject: Action Required: Reset Your Eleva Care Password

Your Eleva Care account has been upgraded!

Next steps:
1. Visit eleva.care/sign-in
2. Click "Forgot Password"
3. Check your email for reset link
4. [Experts only] Reconnect Google Calendar

Questions? We're here to help: support@eleva.care

Best regards,
Eleva Care Team
```

### Post-Migration (Weekly for 4 weeks)

**Week 1:** Daily check-ins with support team  
**Week 2:** Email to non-migrated users  
**Week 3:** Phone calls to remaining experts  
**Week 4:** Final migration report to stakeholders

---

## Resource Requirements

### Team

- **DevOps Engineer:** Infrastructure setup, deployment (40h)
- **Backend Engineers (2):** Schema, integration, refactoring (80h)
- **Frontend Engineer:** UI updates, testing (20h)
- **QA Engineer:** Testing, validation (24h)
- **Support Lead:** User communication, help desk (16h)

### Infrastructure

- **Neon Scale Plan:** $69/month
- **WorkOS Free Tier:** $0/month (< 100 orgs)
- **Vercel Pro:** $20/month (existing)
- **Stripe:** No additional cost
- **Total New Cost:** +$29/month

### Timeline

- **Planning:** 1 week (complete)
- **Implementation:** 2 weeks
- **Monitoring:** 2 weeks
- **Total:** 5 weeks

---

## Support & Escalation

### During Migration

**Tier 1 Support:** support@eleva.care

- Password reset issues
- General questions
- Non-urgent bugs

**Tier 2 Support:** engineering@eleva.care

- Authentication failures
- Data access issues
- Calendar integration problems

**Tier 3 Support (Emergency):** Phone +[NUMBER]

- System down
- Security incidents
- Data loss

### Escalation Path

1. **Minor issues:** Support ticket → 4h response
2. **Major issues:** Email engineering → 1h response
3. **Critical issues:** Phone DevOps → Immediate response

---

## Post-Migration Tasks

### Week 1

- [ ] Monitor authentication success rates daily
- [ ] Track calendar reconnection progress
- [ ] Review support tickets daily
- [ ] Check audit logs for anomalies
- [ ] Performance monitoring (response times, errors)

### Week 2

- [ ] Send reminder to non-migrated users
- [ ] Review and fix any reported bugs
- [ ] Optimize slow queries if needed
- [ ] Update documentation based on learnings

### Week 3

- [ ] Phone follow-up with remaining experts
- [ ] Final data validation checks
- [ ] Archive legacy database (read-only mode)
- [ ] Remove Clerk packages from codebase

### Week 4

- [ ] Migration retrospective meeting
- [ ] Update runbook with lessons learned
- [ ] Close all migration-related tasks
- [ ] Plan WorkOS feature adoption (SSO, Directory Sync)

---

## Lessons Learned (Post-Migration)

> This section will be updated after migration completion

**What went well:**

- TBD

**What didn't go well:**

- TBD

**What we'd do differently:**

- TBD

**Metrics:**

- Migration duration: TBD
- User impact: TBD
- Support tickets: TBD
- Downtime: TBD

---

## Related Documentation

### Internal

- [Neon Database Setup](./03-infrastructure/neon-database-setup.md)
- [Stripe Integration](./09-integrations/stripe-integration.md)
- [Google Calendar Integration](./09-integrations/google-calendar.md)

### External

- [WorkOS Documentation](https://workos.com/docs)
- [Neon Auth Guide](https://neon.tech/docs/guides/neon-auth)
- [Drizzle ORM RLS](https://orm.drizzle.team/docs/rls)

---

## Questions & Support

**Technical Questions:** engineering@eleva.care  
**Compliance Questions:** compliance@eleva.care  
**Business Questions:** management@eleva.care

**Emergency Contact:** [On-call phone number]

---

**Last Updated:** November 3, 2025  
**Next Review:** After migration completion  
**Document Owner:** DevOps Team
