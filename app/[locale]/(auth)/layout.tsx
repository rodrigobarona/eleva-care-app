import { Icons } from '@/components/atoms/icons';
import { auth } from '@clerk/nextjs/server';
import Image from 'next/image';
import Link from 'next/link';
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
    <div className="grid min-h-svh bg-white lg:grid-cols-5">
      <div className="flex flex-col gap-4 p-6 md:p-10 lg:col-span-3">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <Icons.elevaCareLogo className="h-6 w-auto lg:h-8" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:col-span-2 lg:block">
        <Image
          src="/img/Pregnant-Woman-Flowers.jpg"
          alt="Image"
          width={1000}
          height={1000}
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
