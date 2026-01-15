import { permanentRedirect } from 'next/navigation';

/**
 * Help Center Root Page (Fallback)
 *
 * This page should not normally be reached - the proxy handles the redirect
 * from /help and /{locale}/help to the patient portal with proper locale cookies.
 *
 * This exists as a fallback in case the request somehow bypasses the proxy.
 *
 * @see src/proxy.ts - STEP 3 (locale-prefixed) and STEP 4 (non-locale)
 */
export default function HelpPage() {
  permanentRedirect('/help/patient');
}
