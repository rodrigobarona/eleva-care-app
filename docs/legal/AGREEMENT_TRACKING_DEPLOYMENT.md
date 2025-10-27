# Agreement Tracking System - Deployment Guide

## 🚀 Quick Start

### 1. Run Database Migration

```bash
# Navigate to project root
cd /Users/rodrigo.barona/Documents/GitHub/eleva-care-app

# Push schema changes to database
pnpm drizzle-kit push

# Or generate migration SQL
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 2. Verify Environment Variables

Ensure you have both database connections configured:

```bash
# .env.local
DATABASE_URL="postgresql://..."           # Main database
AUDITLOG_DATABASE_URL="postgresql://..."  # Audit database
```

### 3. Test Locally

```bash
# Start development server
pnpm dev

# Navigate to expert profile setup
# Complete all steps and try to publish profile
# Verify checkbox appears and agreement is tracked
```

---

## 🗄️ Database Changes

### Schema Changes

**Added to `profiles` table**:

```sql
practitioner_agreement_accepted_at  TIMESTAMP
practitioner_agreement_version      TEXT
practitioner_agreement_ip_address   TEXT
```

### Data Impact

- **Existing Users**: NULL values (acceptable)
- **New Users**: Populated on first publish
- **No Data Loss**: All existing data preserved

### Rollback Plan

If needed, remove fields:

```sql
ALTER TABLE "profiles" DROP COLUMN "practitioner_agreement_accepted_at";
ALTER TABLE "profiles" DROP COLUMN "practitioner_agreement_version";
ALTER TABLE "profiles" DROP COLUMN "practitioner_agreement_ip_address";
```

---

## 📊 Verification Checklist

### After Deployment

- [ ] **Database Migration Successful**

  ```sql
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'profiles'
    AND column_name LIKE 'practitioner_agreement%';
  ```

- [ ] **UI Renders Correctly**
  - Visit expert dashboard
  - Toggle publish switch
  - Verify checkbox appears
  - Verify link to agreement works

- [ ] **Data Saves Correctly**

  ```sql
  SELECT
    clerk_user_id,
    practitioner_agreement_accepted_at,
    practitioner_agreement_version,
    practitioner_agreement_ip_address
  FROM profiles
  WHERE published = true
  LIMIT 5;
  ```

- [ ] **Audit Logs Created**
  ```sql
  SELECT
    action,
    resource_type,
    created_at
  FROM audit_logs
  WHERE action IN ('PROFILE_PUBLISHED', 'PRACTITIONER_AGREEMENT_ACCEPTED')
  ORDER BY created_at DESC
  LIMIT 10;
  ```

---

## 🧪 Testing Scenarios

### Scenario 1: New Expert (Never Published)

1. Complete expert setup
2. Click publish toggle
3. **Expected**:
   - Checkbox appears
   - Must check to enable publish
   - Agreement data saves
   - 2 audit logs created

### Scenario 2: Existing Expert (Re-Publishing)

1. Already published once
2. Unpublish profile
3. Publish again
4. **Expected**:
   - Checkbox appears
   - Agreement data NOT overwritten
   - Only 1 audit log created (PROFILE_PUBLISHED)

### Scenario 3: Unpublishing

1. Published expert
2. Click to unpublish
3. **Expected**:
   - No checkbox (just confirmation)
   - Agreement data preserved
   - 1 audit log created (PROFILE_UNPUBLISHED)

---

## 🔍 Monitoring

### Key Metrics

```sql
-- Total agreements accepted
SELECT COUNT(*)
FROM profiles
WHERE practitioner_agreement_accepted_at IS NOT NULL;

-- Agreements by version
SELECT
  practitioner_agreement_version,
  COUNT(*) as count
FROM profiles
WHERE practitioner_agreement_accepted_at IS NOT NULL
GROUP BY practitioner_agreement_version;

-- Recent acceptances (last 7 days)
SELECT
  clerk_user_id,
  practitioner_agreement_accepted_at,
  practitioner_agreement_version
FROM profiles
WHERE practitioner_agreement_accepted_at > NOW() - INTERVAL '7 days'
ORDER BY practitioner_agreement_accepted_at DESC;
```

### Audit Log Queries

```sql
-- Agreement acceptance events
SELECT
  clerk_user_id,
  action,
  new_values->>'version' as version,
  new_values->>'acceptedAt' as accepted_at,
  ip_address,
  created_at
FROM audit_logs
WHERE action = 'PRACTITIONER_AGREEMENT_ACCEPTED'
ORDER BY created_at DESC
LIMIT 20;

-- Profile publication events
SELECT
  clerk_user_id,
  action,
  new_values->>'expertName' as expert_name,
  created_at
FROM audit_logs
WHERE action IN ('PROFILE_PUBLISHED', 'PROFILE_UNPUBLISHED')
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🚨 Troubleshooting

### Issue: Migration Fails

**Symptoms**: `pnpm drizzle-kit push` errors

**Solutions**:

1. Check database connection: `psql $DATABASE_URL`
2. Verify user has ALTER TABLE permissions
3. Check for table locks:
   ```sql
   SELECT * FROM pg_locks WHERE relation::regclass = 'profiles'::regclass;
   ```

### Issue: Checkbox Doesn't Appear

**Symptoms**: UI shows publish toggle but no checkbox

**Solutions**:

1. Clear Next.js cache: `rm -rf .next`
2. Check translation keys exist in `messages/en.json`
3. Verify component imports are correct
4. Check browser console for errors

### Issue: Agreement Data Not Saving

**Symptoms**: Checkbox works but database fields stay NULL

**Solutions**:

1. Check server action logs for errors
2. Verify `PRACTITIONER_AGREEMENT_CONFIG` is imported
3. Check if user is completing setup steps
4. Verify database user has UPDATE permissions

### Issue: Audit Logs Not Created

**Symptoms**: Database saves but audit_logs table empty

**Solutions**:

1. Check `AUDITLOG_DATABASE_URL` is set
2. Verify audit database is accessible
3. Check `logAuditEvent` function doesn't throw errors
4. Review server logs for audit errors (non-blocking)

---

## 📈 Performance Considerations

### Database Indexes

Consider adding indexes if you frequently query by agreement timestamp:

```sql
-- Index for finding recent acceptances
CREATE INDEX idx_practitioner_agreement_accepted_at
ON profiles(practitioner_agreement_accepted_at DESC)
WHERE practitioner_agreement_accepted_at IS NOT NULL;

-- Index for version-based queries
CREATE INDEX idx_practitioner_agreement_version
ON profiles(practitioner_agreement_version)
WHERE practitioner_agreement_version IS NOT NULL;
```

### Audit Log Partitioning

For high-volume platforms, consider partitioning audit logs by date:

```sql
-- Example: Monthly partitions
CREATE TABLE audit_logs_2025_10 PARTITION OF audit_logs
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
```

---

## 🔐 Security Considerations

### IP Address Privacy

- **Storage**: IP addresses are personal data under GDPR/LGPD
- **Purpose**: Fraud prevention only
- **Retention**: Should follow data retention policies
- **Access**: Restricted to security/compliance teams

### Audit Log Protection

- **Immutability**: Never allow UPDATE or DELETE on audit_logs
- **Backup**: Regular backups to secure storage
- **Access Control**: Grant SELECT only to authorized roles
- **Encryption**: Database-level encryption for sensitive fields

---

## 📋 Deployment Steps

### Development Environment

1. Pull latest changes
2. Run migration: `pnpm drizzle-kit push`
3. Test locally
4. Verify audit logs

### Staging Environment

1. Deploy code to staging
2. Run migration (automated via CI/CD)
3. Run test suite
4. Manual QA testing
5. Verify metrics

### Production Environment

1. **Backup Database** (critical!)
2. Deploy during low-traffic window
3. Run migration (automated)
4. Monitor error logs
5. Verify first few expert publications
6. Monitor performance metrics

### Post-Deployment

1. Announce to team
2. Update documentation
3. Monitor for 48 hours
4. Collect feedback
5. Plan future enhancements

---

## 🎯 Success Criteria

### Immediate (Day 1)

- ✅ Migration completes successfully
- ✅ No errors in production logs
- ✅ First test publication works correctly
- ✅ Audit logs are being created

### Short-term (Week 1)

- ✅ 100% of new publications have agreement data
- ✅ No user complaints about checkbox
- ✅ Translations work in all languages
- ✅ Performance remains stable

### Long-term (Month 1)

- ✅ All active experts have agreement data
- ✅ Audit trail is complete and usable
- ✅ Ready for compliance audit
- ✅ Version update process tested

---

## 📞 Emergency Contacts

- **Database Issues**: DevOps team
- **Legal Questions**: dpo@eleva.care
- **Technical Support**: Development team
- **Production Incidents**: On-call engineer

---

**Deployment Date**: TBD  
**Prepared By**: Development Team  
**Last Updated**: October 1, 2025
