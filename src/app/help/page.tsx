import { permanentRedirect } from 'next/navigation';

/**
 * Docs Root Page
 *
 * Permanently redirects to the default documentation portal.
 */
export default function HelpPage() {
  permanentRedirect('/help/patient');
}
