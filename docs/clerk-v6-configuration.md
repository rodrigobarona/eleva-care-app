# Clerk v6 (Core 2) Configuration Guide

This document outlines the proper configuration for Clerk v6 (Core 2) in our application.

## Environment Variables

In Clerk v6, the redirection URL handling has changed. Here are the updated environment variables to use:

```
# Deprecated (Clerk v5)
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# Recommended (Clerk v6 Core 2)
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/dashboard"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/dashboard"
```

## Provider Configuration

In your `ClerkProvider` component, use environment variables for all URLs:

```tsx
<ClerkProvider
  signInFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}
  signUpFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL}
  signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
  signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}
>
  {children}
</ClerkProvider>
```

This approach keeps all URLs configured in your environment files, allowing for easier maintenance and different configurations across environments.

## How Redirection Works in Clerk v6

The redirection after authentication follows this order of precedence:

1. The `redirect_url` query parameter in the callback URL takes highest priority
2. The `signInFallbackRedirectUrl` prop in `ClerkProvider` (or equivalent env var) is used as fallback
3. If neither is specified, Clerk will redirect to the root path `/`

## SSO Callback Handling

The SSO callback is handled by Clerk's `AuthenticateWithRedirectCallback` component:

```tsx
export default function SSOCallback() {
  return <AuthenticateWithRedirectCallback />;
}
```

This component automatically uses the redirection configuration from the `ClerkProvider`.

## Common Issues and Solutions

- **Issue**: Users redirected to homepage instead of dashboard after SSO login

  - **Solution**: Ensure `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` is set to `/dashboard` in your environment variables

- **Issue**: Client-side redirection not working

  - **Solution**: Check browser console for errors; ensure environment variables are properly set and accessible to the client

- **Issue**: Random redirects to sign-in page while already authenticated
  - **Solution**: Ensure your middleware is correctly configured and not redirecting authenticated users

## Additional Resources

- [Clerk Core 2 Migration Guide](https://clerk.com/docs/upgrade-guides/core-2)
- [Clerk Redirect URLs Documentation](https://clerk.com/docs/references/javascript/clerk/redirect-urls)
