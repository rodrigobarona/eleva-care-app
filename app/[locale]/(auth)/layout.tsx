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
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="flex flex-col py-10 md:p-6 lg:col-span-1">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <Icons.elevaCareLogo className="h-7 w-auto text-primary" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full">{children}</div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:col-span-1 lg:block">
        <Image
          src="/img/Pregnant-Woman-Flowers.jpg"
          alt="Image"
          width={1280}
          height={854}
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
