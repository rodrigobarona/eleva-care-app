import { permanentRedirect } from 'next/navigation';

/**
 * Help Center Root Page
 *
 * Permanently redirects to the default help center portal (patient).
 */
export default function HelpPage() {
  permanentRedirect('/help/patient');
}
