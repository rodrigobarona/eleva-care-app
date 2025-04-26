import { locales } from '@/locales';

// Home page redirects to dashboard for authenticated users
// and shows landing page for unauthenticated users
export default function HomePage() {
  // Re-use the original home page content
  return null;
}

// Generate static pages for all locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
