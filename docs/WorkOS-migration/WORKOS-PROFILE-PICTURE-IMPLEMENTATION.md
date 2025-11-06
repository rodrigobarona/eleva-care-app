# WorkOS Profile Picture Implementation

## Overview

Updated the application to properly use WorkOS's `profile_picture_url` field as a fallback for user profile images across the application.

## WorkOS User Object

WorkOS provides a `profile_picture_url` field in their user object:

```json
{
  "event": "user.created",
  "id": "event_01K8QT17P813E267PAJC34AKV1",
  "data": {
    "id": "user_01K8QT17KX25XPHVQ4H1K0HTR7",
    "email": "rbarona@hey.com",
    "profile_picture_url": "https://...",
    // ... other fields
  }
}
```

## Changes Made

### 1. API Route: `/api/user/profile`

Updated to use WorkOS profile picture as fallback:

```ts
const userProfile = {
  // ...other fields
  imageUrl: dbUser.imageUrl || (user as any).profilePictureUrl || (user as any).profile_picture_url || null,
};
```

### 2. Components Updated

#### `components/features/forms/AccountForm.tsx`
- Avatar now shows WorkOS profile picture if database doesn't have one
- Fallback order: `dbUser.imageUrl` → WorkOS `profilePictureUrl` → empty string

#### `components/features/forms/ExpertForm.tsx`
- Default form value uses WorkOS profile picture as fallback
- Error handling resets to WorkOS profile picture instead of clearing
- Fallback order: `initialData` → WorkOS `profilePictureUrl` → empty string

#### `components/layout/sidebar/NavUser.tsx`
- Both sidebar trigger avatar and dropdown avatar show WorkOS profile picture
- Consistent across all user-facing avatar instances

### 3. Fallback Chain

All components now use this fallback chain:

1. **Database `imageUrl`** (if user uploaded custom picture)
2. **WorkOS `profilePictureUrl`** (camelCase, might be returned by SDK)
3. **WorkOS `profile_picture_url`** (snake_case, as returned by API)
4. **Empty string** (triggers AvatarFallback with initials)

## TypeScript Handling

Since WorkOS TypeScript types don't include `profile_picture_url` (yet), we use type assertion:

```ts
(user as any)?.profilePictureUrl || (user as any)?.profile_picture_url
```

This handles both potential naming conventions (camelCase from SDK, snake_case from raw API).

## Benefits

1. ✅ Users see their profile picture immediately from WorkOS
2. ✅ No more blank avatars on first login
3. ✅ Custom uploaded pictures take priority
4. ✅ Graceful fallback to initials if no picture available
5. ✅ Consistent behavior across all components

## Future Improvements

- [ ] Update WorkOS TypeScript types when they add `profilePictureUrl` to official types
- [ ] Consider syncing WorkOS profile picture to database on user creation
- [ ] Add profile picture update webhook handler from WorkOS

---

**Date:** 2025-01-06  
**Status:** ✅ Complete  
**Impact:** Improved UX - users see their profile pictures immediately

