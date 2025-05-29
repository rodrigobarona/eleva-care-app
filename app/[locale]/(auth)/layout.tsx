import { auth } from '@clerk/nextjs/server';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

// Inline the logo SVG for better performance
const ElevaCareLogo = ({ className }: { className?: string }) => (
  <svg
    width="1801"
    height="357"
    viewBox="0 0 1801 357"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="ElevaCare Logo"
    role="img"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0 179c0 87.1 70.9 158 158 158s158-70.9 158-158S245.1 21 158 21C70.9 21 0 91.9 0 179Zm9.9 0c0-81.6 66.4-148.1 148.1-148.1 21.2 0 41.4 4.5 59.7 12.5C137.9 170.5 106.4 267.6 93.8 312.5c-49.6-24-83.9-74.8-83.9-133.5ZM119.9 322.1c14.9-81 90.6-242.6 105.9-274.7 47.7 24.6 80.3 74.4 80.3 131.6 0 81.7-66.4 148.1-148.1 148.1-13.2 0-26-1.7-38.1-5Z"
    />
    <path d="M414.1 78.9H553.2v20.5H437.5v70.3h103.4v20.2H437.5v73.8h119.5v20.2H414.1V78.9Z" />
  </svg>
);

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
            <ElevaCareLogo className="h-7 w-auto text-primary" />
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
