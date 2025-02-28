import { ExpertOnboardingProvider } from '@/components/molecules/ExpertOnboardingProvider';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

interface ExpertOnboardingLayoutProps {
  children: ReactNode;
}

export default async function ExpertOnboardingLayout({ children }: ExpertOnboardingLayoutProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-eleva-neutral-100">
      <ExpertOnboardingProvider>
        <main className="container max-w-7xl py-6 md:py-10">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Expert Onboarding
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">
                Complete these steps to set up your expert profile
              </p>
            </div>
            
            {children}
          </div>
        </main>
      </ExpertOnboardingProvider>
    </div>
  );
} 