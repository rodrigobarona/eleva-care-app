# Google Account Metadata Sync Fix

## Issue Description

When experts connected their Google account via OAuth in the Security Settings page, the `expertSetup.google_account` metadata was being updated on the server side via `handleGoogleAccountConnection()`, but the client-side UI was not reflecting the change. The status remained `false` in the UI even though the backend had correctly updated it to `true`.

## Root Cause Analysis

### The Problem Flow

1. User clicks "Connect Google Account" in Security Settings
2. OAuth flow completes successfully
3. `handleGoogleAccountConnection()` server action runs and updates `user.unsafeMetadata.expertSetup.google_account = true`
4. **❌ ISSUE**: Clerk's `useUser()` hook doesn't automatically refresh after external account changes
5. Client-side `user` object still shows stale data with `google_account: false`
6. UI doesn't update to reflect the connected status

### Why This Happens

According to Clerk's documentation, when external accounts are added via OAuth or metadata is updated server-side, the client-side user object from `useUser()` becomes stale and requires manual refresh using `user.reload()`.

## The Solution

### 1. Added `user.reload()` After Google Account Connection

```typescript
// In app/(private)/account/security/page.tsx
if (result.success) {
  console.log('✅ Google account connection status updated in expert metadata');

  // 🔧 FIX: Reload user data to reflect server-side metadata changes
  // This is crucial because Clerk's useUser() doesn't auto-refresh after external account changes
  if (user) {
    console.log('🔄 Reloading user data to reflect metadata changes...');
    await user.reload();
    console.log('✅ User data reloaded successfully');

    // Dispatch event to notify other components about the Google account connection
    window.dispatchEvent(
      new CustomEvent('google-account-connected', {
        detail: {
          timestamp: new Date().toISOString(),
          status: 'connected',
        },
      }),
    );
  }
}
```

### 2. Added `user.reload()` After Google Account Disconnection

```typescript
// Also in the disconnect flow for consistency
await checkExpertSetupStatus();

// 🔧 FIX: Reload user data to reflect the disconnection changes
if (user) {
  console.log('🔄 Reloading user data after Google account disconnection...');
  await user.reload();
  console.log('✅ User data reloaded after disconnection');
}
```

### 3. Added Custom Events for Cross-Component Communication

The fix also dispatches custom events (`google-account-connected` and `google-account-disconnected`) that other components (like `ExpertSetupChecklist`) can listen to for immediate UI updates.

## Technical Details

### Clerk's User Object Refresh Behavior

- `useUser()` hook provides a cached user object
- External account changes via OAuth don't trigger automatic refresh
- Server-side metadata updates don't trigger automatic refresh
- Manual `user.reload()` is required to fetch latest data from Clerk

### Expert Setup Metadata Structure

```typescript
user.unsafeMetadata.expertSetup = {
  profile: boolean,
  availability: boolean,
  events: boolean,
  identity: boolean,
  payment: boolean,
  google_account: boolean, // This field wasn't updating in UI
};
```

## Files Modified

1. **`app/(private)/account/security/page.tsx`**

   - Added `user.reload()` after successful Google account connection
   - Added `user.reload()` after Google account disconnection
   - Added custom event dispatching for cross-component communication
   - Fixed missing `catch` block in disconnect error handling

2. **`server/actions/expert-setup.ts`** (already documented)
   - Comprehensive JSDoc comments added for all functions
   - Better understanding of metadata update flow

## Testing the Fix

### Manual Testing Steps

1. Navigate to Security Settings page as an expert user
2. Connect a Google account via OAuth
3. Verify the UI immediately shows "Connected" status
4. Check that expert setup checklist updates appropriately
5. Disconnect the account and verify immediate UI update

### Expected Behavior

- ✅ Google account connection immediately reflects in UI
- ✅ Expert setup metadata correctly shows `google_account: true`
- ✅ Cross-component updates work via custom events
- ✅ Disconnect flow also works correctly

## Related Components

This fix impacts several components that rely on the Google account status:

1. **`ExpertSetupChecklist.tsx`** - Shows setup progress
2. **`useExpertSetup` hook** - Manages expert setup state
3. **Calendar availability features** - Require Google account connection

## Best Practices Applied

1. **Explicit User Data Refresh**: Always call `user.reload()` after server-side metadata updates
2. **Event-Driven Updates**: Use custom events for cross-component communication
3. **Comprehensive Logging**: Added detailed console logs for debugging
4. **Error Handling**: Improved error handling in async operations
5. **Documentation**: Added inline comments explaining the fix

## Future Considerations

- Consider implementing a global user data refresh strategy for other similar scenarios
- Monitor for other places where `user.reload()` might be needed after server actions
- Consider using React Query or SWR for more sophisticated data synchronization

## References

- [Clerk User Metadata Documentation](https://clerk.com/docs/users/metadata)
- [Clerk useUser Hook Documentation](https://clerk.com/docs/references/react/use-user)
- [External Account Management](https://clerk.com/docs/custom-flows/manage-sso-connections)
