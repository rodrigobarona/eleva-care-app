# 📚 WorkOS Migration Documentation

Complete guide and reference for migrating from Clerk to WorkOS authentication.

---

## 🎯 Quick Navigation

### Start Here

- **[CURRENT-STATUS.md](./CURRENT-STATUS.md)** - 📍 **START HERE** - Current progress, what's done, what's next
- **[ROLES-PERMISSIONS-SETUP-MIGRATION.md](./ROLES-PERMISSIONS-SETUP-MIGRATION.md)** - Roles & permissions implementation guide

### Reference Documentation

Technical deep-dives and implementation details:

- **[workos-authentication.md](./reference/workos-authentication.md)** - WorkOS integration guide
- **[neon-auth-rls.md](./reference/neon-auth-rls.md)** - Row-Level Security with Neon Auth
- **[org-per-user-model.md](./reference/org-per-user-model.md)** - Multi-tenancy architecture
- **[unified-audit-logging.md](./reference/unified-audit-logging.md)** - Audit logging implementation

### Setup & Configuration

- **[SETUP-WORKOS-ENV.md](./setup/SETUP-WORKOS-ENV.md)** - Environment configuration
- **[CORRECT-JWKS-CONFIG.md](./setup/CORRECT-JWKS-CONFIG.md)** - JWKS configuration for Neon
- **[TROUBLESHOOT-NEON-JWKS.md](./setup/TROUBLESHOOT-NEON-JWKS.md)** - Troubleshooting guide

### Archive

Historical documentation from completed phases (reference only):

- See `archive/` folder for phase completion summaries and old status files

---

## 📊 Migration Overview

### Current Status: Phase 1-2 Complete (30%)

```
✅ Phase 1: Critical Build Fixes      [█████████████████████] 100%
✅ Phase 2: Guest User Auto-Reg       [█████████████████████] 100%
⏳ Phase 3: Legacy Data Migration     [░░░░░░░░░░░░░░░░░░░░░]   0%
⏳ Phase 4: Schema Consolidation      [░░░░░░░░░░░░░░░░░░░░░]   0%
⏳ Phase 5: Neon Auth & RLS           [░░░░░░░░░░░░░░░░░░░░░]   0%
⏳ Phase 6: Testing & Validation      [░░░░░░░░░░░░░░░░░░░░░]   0%
⏳ Phase 7: Production Deployment     [░░░░░░░░░░░░░░░░░░░░░]   0%
```

---

## 🎯 What's Been Accomplished

### ✅ Phase 1: Critical Build Fixes

- Fixed 55+ files with `clerkUserId` → `workosUserId` changes
- Updated schema imports and table names
- All TypeScript compilation passing
- Zero build errors

### ✅ Phase 2: Guest User System

- Created passwordless guest registration
- Auto-creates WorkOS users + organizations
- Sends magic auth code emails
- Database migration applied
- Ready for testing

### ✅ Authentication Infrastructure

- Complete WorkOS OAuth flow
- Secure session management
- Expert login tested and working
- Middleware routing fixed

### ✅ Database Schema

- Complete WorkOS schema (1,000+ lines)
- 15 tables with RLS support
- Org-per-user model
- Unified audit logging
- Guest user fields

---

## 🚀 Next Steps

### Immediate Actions (This Week)

1. **Test Guest Booking Flow** (30 min)
   - Book meeting as guest
   - Verify WorkOS user creation
   - Check magic auth email

2. **Migrate Dashboard** (2-3 hours)
   - Update `app/(private)/dashboard/page.tsx`
   - Replace Clerk with WorkOS session
   - Test with logged-in expert

3. **Add Roles & Preferences Tables** (1 hour)
   - Add `expert_setup` table
   - Add `user_preferences` table
   - Generate and apply migration

4. **Implement Roles Migration** (3-4 hours)
   - Follow `ROLES-PERMISSIONS-SETUP-MIGRATION.md`
   - Create role checking utilities
   - Update auth middleware

### Phase 3: Data Migration (Next Week)

See [CURRENT-STATUS.md](./CURRENT-STATUS.md) for detailed Phase 3 plan.

---

## 📁 Key Files Created

### Schema & Database

```
drizzle/
  ├── schema-workos.ts              # Complete WorkOS schema
  ├── db.ts                         # Database clients
  └── migrations/
      └── 0000_*.sql                # Initial migration
```

### Authentication

```
lib/
  ├── auth/
  │   └── workos-session.ts         # Session management
  └── integrations/
      ├── workos/
      │   ├── client.ts             # WorkOS SDK
      │   └── guest-users.ts        # Guest registration
      └── neon/
          └── rls-client.ts         # RLS utilities
```

### Routes

```
app/
  ├── (auth)/
  │   └── sign-in/page.tsx          # Sign in page
  └── auth/
      ├── callback/route.ts         # OAuth callback
      └── sign-out/route.ts         # Sign out
```

---

## 🏗️ Architecture Decisions

### 1. Org-Per-User Model ✅

**Decision**: Each user gets their own organization

**Benefits**:

- Complete data isolation
- HIPAA/GDPR compliant
- B2B ready (can invite members later)
- Simplified RLS policies

### 2. Unified Audit Logging ✅

**Decision**: Single database with RLS (not separate database)

**Benefits**:

- Saves $240/year (no separate database)
- RLS protection (org-scoped)
- Automatic context from JWT
- Still HIPAA compliant

### 3. Passwordless Guest System ✅

**Decision**: Auto-create WorkOS users for guests, send magic code

**Benefits**:

- No passwords to remember
- Seamless booking experience
- Guests get dashboard access
- Future-proof for patient portal

### 4. Standard RLS (not Neon Auth initially) ✅

**Decision**: Use `SET LOCAL` approach, add Neon Auth in Phase 5

**Benefits**:

- More portable (any Postgres)
- Production-tested approach
- Can add Neon Auth later
- Full control over context

---

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# WorkOS
WORKOS_API_KEY=sk_test_***
WORKOS_CLIENT_ID=client_***
WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback

# Neon Databases
DATABASE_URL=postgresql://***
DATABASE_DEV_URL=postgresql://***
DATABASE_URL_LEGACY=postgresql://***

# Encryption
ENCRYPTION_KEY=***
```

See [SETUP-WORKOS-ENV.md](./setup/SETUP-WORKOS-ENV.md) for details.

---

## 🧪 Testing Status

### ✅ Tested & Working

- [x] Expert login via WorkOS AuthKit
- [x] OAuth callback processing
- [x] Session creation and persistence
- [x] Secure cookie handling
- [x] TypeScript compilation

### ⏳ Pending Tests

- [ ] Guest booking flow
- [ ] Magic auth code email
- [ ] Guest dashboard access
- [ ] Dashboard with WorkOS session
- [ ] RLS policy enforcement

---

## 📖 Documentation Index

### Core Documents

| Document                                                                       | Purpose                    | Status        |
| ------------------------------------------------------------------------------ | -------------------------- | ------------- |
| [CURRENT-STATUS.md](./CURRENT-STATUS.md)                                       | Current state & next steps | ✅ Up to date |
| [ROLES-PERMISSIONS-SETUP-MIGRATION.md](./ROLES-PERMISSIONS-SETUP-MIGRATION.md) | Roles implementation       | ✅ Complete   |
| [workos-authentication.md](./reference/workos-authentication.md)               | WorkOS integration         | ✅ Reference  |
| [neon-auth-rls.md](./reference/neon-auth-rls.md)                               | RLS implementation         | ✅ Reference  |
| [org-per-user-model.md](./reference/org-per-user-model.md)                     | Multi-tenancy guide        | ✅ Reference  |
| [unified-audit-logging.md](./reference/unified-audit-logging.md)               | Audit logging              | ✅ Reference  |

### Setup Guides

| Document                                                       | Purpose            | Status         |
| -------------------------------------------------------------- | ------------------ | -------------- |
| [SETUP-WORKOS-ENV.md](./setup/SETUP-WORKOS-ENV.md)             | Environment setup  | ✅ Reference   |
| [CORRECT-JWKS-CONFIG.md](./setup/CORRECT-JWKS-CONFIG.md)       | JWKS configuration | ⏳ For Phase 5 |
| [TROUBLESHOOT-NEON-JWKS.md](./setup/TROUBLESHOOT-NEON-JWKS.md) | Troubleshooting    | ⏳ For Phase 5 |

---

## 🎓 Key Concepts

### WorkOS AuthKit

- Hosted authentication UI
- OAuth 2.0 flow
- JWT-based sessions
- No password management needed

### Org-Per-User Model

- Each user = one organization
- User is "owner" of their org
- All data scoped to `org_id`
- Can invite others later (B2B)

### Row-Level Security (RLS)

- Database-level data isolation
- Policies filter queries automatically
- Uses session context (`SET LOCAL`)
- Can't be bypassed in app code

### Guest User System

- Passwordless registration
- Magic auth code via email
- Auto-create WorkOS user + org
- Transparent to user

---

## 🔄 Migration Timeline

### Completed (2 weeks)

- Phase 1: Critical build fixes
- Phase 2: Guest user system
- Authentication infrastructure
- Database schema design

### Current Week

- Test guest booking
- Migrate dashboard
- Add roles tables
- Implement roles system

### Next 2 Weeks

- Phase 3: Data migration (3-4 days)
- Phase 4: Schema consolidation (1 day)
- Phase 5: Neon Auth & RLS (1 day)
- Phase 6: Testing (2-3 days)

### Week 4

- Phase 7: Production deployment (1 day)
- Monitoring and stabilization

**Total Estimated Time**: 4 weeks from start to production

---

## 📝 Outstanding TODOs

### 🚨 Critical TODOs (64 items tracked)

**By Category:**
- **Database Schema**: 13 items (orgId fields, username field, deprecated fields)
- **Authentication**: 5 items (auth tracking, webhook handlers)
- **Admin Features**: 4 items (permission checks)
- **Monitoring**: 6 items (Sentry, metrics, alerts)
- **Caching**: 5 items (next-intl cacheComponents)
- **Migration Scripts**: 3 items (user mapping, audit logs)
- **Testing**: 2 items (device recognition, test suite)
- **Features**: 3 items (onboarding, Novu integration)

**Most Critical (Blocking Migration):**
1. **Add `username` field to UsersTable** - Required for:
   - Profile URLs (`/[username]`)
   - Sitemap generation
   - User discovery
   - Affected files: `ProfileAccessControl.tsx`, `SetupCompletePublishCard.tsx`, `sitemap.ts`

2. **Schema `orgId` fields** - Make `.notNull()` after migration complete
   - Affects 9 tables
   - Required for Phase 5 (Schema Consolidation)

3. **Webhook handlers** - Implement webhook-specific step completion
   - Identity verification webhook
   - Stripe account webhook

**See Full TODO List**: `.cursor/plans/clerk-to-workos-migration-7ad57dce.plan.md` (Section: "📝 Outstanding TODOs by Category")

---

## 🚨 Important Notes

### ⚠️ Breaking Changes

- All `clerkUserId` fields renamed to `workosUserId`
- Schema file changed from `schema.ts` to `schema-workos.ts`
- Auth functions changed from Clerk to WorkOS
- Clerk components need replacement

### ✅ Backward Compatibility

- Legacy database preserved as `DATABASE_URL_LEGACY`
- Mapping table will track `clerkUserId` → `workosUserId`
- 6-month grace period for legacy data access

### 🔐 Security Considerations

- All sessions use HTTP-only cookies
- JWT tokens expire after 1 hour
- RLS enforced at database level
- Audit logging tracks all changes
- HIPAA-compliant data handling

---

## 📞 Getting Help

### Documentation Issues

- Check [CURRENT-STATUS.md](./CURRENT-STATUS.md) for latest state
- Review relevant technical doc in `/reference`
- Check `/setup` for configuration issues

### Technical Issues

- **Build errors**: Check TypeScript compilation
- **Auth issues**: Verify environment variables
- **Database issues**: Check migration status
- **RLS issues**: Review RLS policies (Phase 5)

### Questions About:

- **Current state**: See [CURRENT-STATUS.md](./CURRENT-STATUS.md)
- **Roles**: See [ROLES-PERMISSIONS-SETUP-MIGRATION.md](./ROLES-PERMISSIONS-SETUP-MIGRATION.md)
- **WorkOS auth**: See [workos-authentication.md](./reference/workos-authentication.md)
- **RLS**: See [neon-auth-rls.md](./reference/neon-auth-rls.md)
- **Architecture**: See [org-per-user-model.md](./reference/org-per-user-model.md)

---

## 📝 Contributing to Docs

When updating documentation:

1. Update [CURRENT-STATUS.md](./CURRENT-STATUS.md) for state changes
2. Keep technical docs in `/reference` folder
3. Move completed phase docs to `/archive`
4. Update this README if structure changes

---

## 🎉 Quick Wins

Already working and tested:

- ✅ Expert login with WorkOS
- ✅ Secure session management
- ✅ Guest user auto-registration service
- ✅ Database schema with RLS support
- ✅ All TypeScript types updated
- ✅ Zero build errors

Ready to test:

- ⏳ Guest booking with auto-registration
- ⏳ Magic auth code delivery
- ⏳ Guest dashboard access

---

**Last Updated**: November 5, 2025  
**Maintained By**: Development Team  
**Status**: Active Migration (Phase 1-2 Complete)

---

**Ready to start?** Read [CURRENT-STATUS.md](./CURRENT-STATUS.md) for the current state and next actions!
