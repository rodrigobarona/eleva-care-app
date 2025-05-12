import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  // For auth pages, redirect if already signed in
  const { userId } = await auth();
  if (userId != null) {
    // Special case handling for SSO callback is now in the component itself
    redirect(`${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}`);
  }

  // Render children directly with the styling that was previously in the wrapper
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center">
      {children}
    </div>
  );
}
