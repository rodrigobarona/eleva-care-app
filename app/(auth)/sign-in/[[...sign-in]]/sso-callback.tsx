import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

/**
 * SSO Callback handler component
 *
 * This component integrates with Clerk's authentication flow to handle SSO callbacks.
 * The redirection after authentication is controlled by the following (in order of precedence):
 * 1. The 'redirect_url' query parameter in the callback URL
 * 2. The 'signInFallbackRedirectUrl' prop in ClerkProvider (which is set to '/dashboard')
 */
export default function SSOCallback() {
  // The AuthenticateWithRedirectCallback component handles the entire SSO callback process
  // and uses the redirection configuration from ClerkProvider
  return <AuthenticateWithRedirectCallback />;
}
