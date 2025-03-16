import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  try {
    // Get the current URL path - safely handle potential errors
    const headersList = headers();
    const path = headersList.get('x-pathname') || '';

    // Skip auth check for SSO callback page to prevent redirection issues
    if (path.includes('/sso-callback')) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center">{children}</div>
      );
    }
  } catch (e) {
    // Ignore errors when trying to get headers
    console.error('Error accessing request headers:', e);
  }

  // For other auth pages, redirect if already signed in
  const { userId } = await auth();
  if (userId != null) {
    redirect('/dashboard');
  }

  return <div className="flex min-h-screen flex-col items-center justify-center">{children}</div>;
}
