/**
 * Root Page - Redirects to the appropriate localized home page
 *
 * This page handles requests to "/" (without locale prefix) and redirects
 * to the appropriate locale-prefixed version (e.g., "/en", "/es", etc.)
 *
 * The locale detection is handled by the proxy middleware, but this page
 * ensures there's a valid route at the root path.
 */
import { defaultLocale } from '@/lib/i18n';
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to default locale
  // The middleware will handle locale detection and may redirect again
  // if a different locale should be used
  redirect(`/${defaultLocale}`);
}

