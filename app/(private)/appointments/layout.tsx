import { isExpert } from '@/lib/auth/roles.server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

interface AppointmentsLayoutProps {
  children: React.ReactNode;
}

export default async function AppointmentsLayout({ children }: AppointmentsLayoutProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);
  }

  // Check if user is an expert using the centralized isExpert function
  const userIsExpert = await isExpert();

  if (!userIsExpert) {
    redirect(`${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}`);
  }

  return <>{children}</>;
}
