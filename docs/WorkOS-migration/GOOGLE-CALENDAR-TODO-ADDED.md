# ✅ Google Calendar TODOs Added to WorkOS Migration Tracking

**Date**: November 6, 2025  
**File Updated**: `docs/WorkOS-migration/TODO-TRACKING.md`

---

## 📝 Summary of Changes

### Updated Statistics

**Before**:

- Total TODOs: 64 items
- Categories: 11

**After**:

- Total TODOs: **67 items** (+3)
- Categories: **12** (+1 new category)

### New Category Added: Google Calendar Integration

**Priority**: ⚠️ HIGH  
**Items**: 3  
**Estimated Time**: ~3.5 hours

---

## 🎯 Three TODOs Added

### 1. OAuth Callback Route Implementation

**Location**: `server/googleCalendar.ts` (Migration item #6)  
**Time**: 1 hour  
**Status**: Infrastructure ready (database + encryption)

**What Needs to Be Done**:

- Create `app/api/auth/google/callback/route.ts`
- Handle WorkOS OAuth response
- Extract and store encrypted tokens
- Redirect to success page

**Prerequisites**:

- ✅ Database schema deployed
- ✅ Token encryption system ready
- ✅ Token management service created
- ❌ WorkOS OAuth provider configured (still needed)

---

### 2. Refactor googleCalendar.ts to Use New Token System

**Location**: `server/googleCalendar.ts` (Migration item #7)  
**Time**: 2 hours  
**Status**: Currently BROKEN (uses Clerk)

**What Needs to Be Done**:

Replace all Clerk-based OAuth with new database-backed system:

| Function                    | Current (Broken)           | New (Working)                  |
| --------------------------- | -------------------------- | ------------------------------ |
| `getOAuthClient()`          | Uses `createClerkClient()` | Use `getGoogleOAuthClient()`   |
| `getCalendarEventTimes()`   | Clerk OAuth tokens         | Database encrypted tokens      |
| `createCalendarEvent()`     | Clerk OAuth tokens         | Database encrypted tokens      |
| `hasValidTokens()`          | Clerk API call             | `hasGoogleCalendarConnected()` |
| `getGoogleCalendarClient()` | Clerk OAuth                | New token system               |
| `getGoogleAccessToken()`    | Clerk API                  | Remove (handled by service)    |

**6 functions to update** across 560+ lines of code

---

### 3. Update Function Signatures for workosUserId

**Location**: `server/googleCalendar.ts` (Migration item #8)  
**Time**: 30 minutes  
**Status**: Code cleanup for consistency

**What Needs to Be Done**:

Ensure all functions use `workosUserId` parameter naming consistently:

- Update JSDoc comments
- Update parameter names
- Update function signatures

**Lines to Update**: 10+ function declarations

---

## 📊 Integration with TODO-TRACKING.md

### Added to Section 3: Google Calendar Integration

**Location**: Line 184-316 in `TODO-TRACKING.md`

**Contents**:

- Full detailed breakdown of 3 TODOs
- Code examples (old vs new)
- Prerequisites checklist
- Migration status tracker (8 phases, 5 complete)
- Reference documentation links
- Additional requirements checklist

### Updated Summary Statistics Table

Added new row:

```markdown
| Google Calendar Integration | 3 | ⚠️ High |
```

### Updated Phase 6 Plan

Added Google Calendar integration to Week 1:

```markdown
**Week 1** (High Priority):

- [ ] **Google Calendar Integration** (~3.5 hours)
  - [ ] Implement OAuth callback route (1 hour)
  - [ ] Refactor googleCalendar.ts to use new token system (2 hours)
  - [ ] Update function signatures for workosUserId (30 min)
  - [ ] Configure WorkOS Dashboard for Google OAuth
  - [ ] Test full OAuth flow end-to-end
```

### Updated Critical Files List

Added to quick reference:

```markdown
- `server/googleCalendar.ts` - Google Calendar migration
```

---

## 🔗 Cross-References Added

### Documentation Links in TODO-TRACKING.md

```markdown
**Reference Documentation**:

- `docs/09-integrations/IMPLEMENTATION-COMPLETE.md` - Complete implementation guide
- `docs/09-integrations/google-calendar-workos-migration.md` - Migration strategy
- `docs/09-integrations/ENCRYPTION-IMPLEMENTATION.md` - Security details
- `lib/integrations/google/oauth-tokens.ts` - Token management service
```

### Status Tracker Added

```markdown
**Status**:

- ✅ Phase 1: Database schema
- ✅ Phase 2: Token management service
- ✅ Phase 3: AES-256-GCM encryption
- ✅ Phase 4: Auto-refresh token handling
- ✅ Phase 5: Database columns deployed
- ❌ Phase 6: OAuth callback route
- ❌ Phase 7: Refactor googleCalendar.ts
- ❌ Phase 8: Update function signatures
```

---

## 🎯 Why This Matters

### Benefits of Tracking in TODO-TRACKING.md

1. **Central Visibility** - All WorkOS migration TODOs in one place
2. **Priority Alignment** - Google Calendar properly prioritized as HIGH
3. **Time Estimates** - Clear effort estimates for planning
4. **Phase Integration** - Integrated into Phase 6 post-migration plan
5. **Progress Tracking** - Can check off items as completed
6. **Context Preservation** - Links to all relevant documentation
7. **Team Coordination** - Everyone knows what's left to do

### Integration with Existing Workflow

Google Calendar migration now tracked alongside:

- Database schema updates (Critical)
- Username implementation (Critical)
- Authentication tracking (High)
- Webhook handlers (High)
- Admin features (Medium)
- And more...

---

## 📋 Quick Reference

### Where to Find the TODOs

**Main File**: `docs/WorkOS-migration/TODO-TRACKING.md`

**Section**: "⚠️ HIGH Priority (Needed Soon After Migration)"

**Sub-section**: "3. Google Calendar Integration (3 items)"

**Lines**: 184-316

### Related Documentation

**Implementation Details**:

- `docs/09-integrations/IMPLEMENTATION-COMPLETE.md`
- `docs/09-integrations/google-calendar-workos-migration.md`
- `docs/09-integrations/ENCRYPTION-IMPLEMENTATION.md`

**Code Files**:

- `server/googleCalendar.ts` (needs refactoring)
- `lib/integrations/google/oauth-tokens.ts` (new system, ready)
- `drizzle/schema-workos.ts` (schema deployed)

---

## ✅ Completion Criteria

These TODOs will be marked complete when:

- [ ] OAuth callback route created and tested
- [ ] All 6 functions in googleCalendar.ts refactored
- [ ] All function signatures use workosUserId consistently
- [ ] WorkOS Dashboard configured for Google OAuth
- [ ] Full OAuth flow tested end-to-end
- [ ] User can connect Google Calendar
- [ ] User can create calendar events
- [ ] Tokens automatically refresh
- [ ] Encryption verified in database

---

## 🚀 Next Steps

1. **Review** the new section in `TODO-TRACKING.md`
2. **Configure** WorkOS Dashboard for Google OAuth
3. **Implement** OAuth callback route (highest priority)
4. **Refactor** googleCalendar.ts to use new system
5. **Test** full OAuth flow
6. **Mark complete** in TODO-TRACKING.md when done

---

**Status**: ✅ Google Calendar TODOs successfully tracked in WorkOS migration docs  
**Location**: `docs/WorkOS-migration/TODO-TRACKING.md`  
**Priority**: ⚠️ HIGH  
**Estimated Completion**: ~3.5 hours development + testing
