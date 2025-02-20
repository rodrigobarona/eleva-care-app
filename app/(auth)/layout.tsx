import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (userId != null) redirect('/');
  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center">{children}</div>
    </>
  );
}
