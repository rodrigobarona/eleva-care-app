# User Preferences Table Decision: Merge vs Separate

## Decision: MERGE into UsersTable ✅

**Date:** 2025-01-06  
**Status:** Recommended  
**Impact:** Simplification, Better Performance

---

## Analysis

### Current State

```
UserPreferencesTable (separate):
├── securityAlerts (boolean)
├── theme (text)
└── language (text)

Total: 3 fields
```

### Problem

- **Unnecessary complexity**: Requires JOIN for every user query
- **No scalability benefit**: Fixed schema, not expanding
- **1:1 relationship**: Every user has exactly one preferences record
- **Performance overhead**: Extra table, extra indexes, extra JOIN cost

---

## Industry Best Practices Research

### When to Keep Separate Table:

✅ **Large number of fields** (10+)  
✅ **Frequently changing schema**  
✅ **Optional/sparse data** (many NULLs)  
✅ **Accessed independently** from main table  
✅ **Complex data types** (JSON, arrays)

### When to Merge into Main Table:

✅ **Small, fixed set** (< 5 fields) ← **We have 3**  
✅ **Always accessed together** ← **Yes**  
✅ **Mandatory 1:1 relationship** ← **Yes**  
✅ **Stable schema** ← **Yes**  
✅ **Simple data types** ← **Yes**

---

## Recommendation: MERGE

### Benefits:

1. **Simpler queries**: No JOINs needed

   ```typescript
   // Before (separate table)
   const user = await db.query.UsersTable.findFirst({
     where: eq(UsersTable.workosUserId, userId),
     with: { preferences: true }  // JOIN required
   });

   // After (merged)
   const user = await db.query.UsersTable.findFirst({
     where: eq(UsersTable.workosUserId, userId)
   });  // Already has theme, language, securityAlerts
   ```

2. **Better performance**: Eliminates JOIN overhead
3. **Less code**: Remove security-utils.ts wrapper functions
4. **Fewer migrations**: One less table to manage
5. **API simplification**: Update user and preferences in one call

### Migration Path:

1. Add fields to `UsersTable`: `theme`, `language`, `securityAlerts`
2. Migrate existing preferences data
3. Drop `UserPreferencesTable`
4. Update API routes to use user fields directly
5. Remove `lib/integrations/workos/security-utils.ts`

---

## Alternative Considered: Keep Separate

### Why NOT to keep separate:

- ❌ Adds unnecessary complexity
- ❌ No flexibility advantage (schema is fixed)
- ❌ Performance penalty (JOIN cost)
- ❌ More code to maintain
- ❌ Doesn't follow "merge small 1:1 tables" best practice

---

## Sources

- Database design best practices (StackOverflow, DB forums)
- PostgreSQL documentation on table relationships
- Industry standard: Merge small, stable 1:1 relationships
- Examples: GitHub, Stripe, Shopify all merge basic user preferences

---

## Implementation

### Schema Changes:

```typescript
export const UsersTable = pgTable('users', {
  // ... existing fields ...

  // Merged from UserPreferencesTable
  theme: text('theme').notNull().default('light').$type<'light' | 'dark' | 'system'>(),
  language: text('language').notNull().default('en').$type<'en' | 'es' | 'pt' | 'br'>(),
  securityAlerts: boolean('security_alerts').notNull().default(true),

  // ... timestamps ...
});
```

### API Simplification:

```typescript
// Before: Separate preferences endpoint
GET / api / user / security - preferences;
PUT / api / user / security - preferences;

// After: Part of user profile
GET / api / user / profile; // Returns theme, language, securityAlerts
PATCH / api / user / profile; // Updates all user fields including preferences
```

---

## Conclusion

**MERGE is the clear winner** for this use case. It follows industry best practices for small, stable 1:1 relationships and provides tangible benefits in performance, simplicity, and maintainability.

**Next Steps:**

1. Get approval for schema change
2. Create migration to merge tables
3. Update API routes
4. Remove deprecated security-utils.ts
5. Update frontend to use unified user object
