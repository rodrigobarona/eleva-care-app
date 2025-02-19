import { ReactNode } from 'react';

import { redirect } from 'next/navigation';

import { auth } from '@clerk/nextjs/server';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (userId != null) redirect('/');
  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center">{children}</div>
    </>
  );
}
