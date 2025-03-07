'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GoogleCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Simply redirect back to the security page
    router.push('/account/security');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="rounded-lg bg-card p-6 shadow-lg">
          <div className="mb-4 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Redirecting...</h2>
        </div>
      </div>
    </div>
  );
}
