import { Separator } from '@/components/atoms/separator';
import { AppBreadcrumb } from '@/components/organisms/sidebar/AppBreadcrumb';
import { AppSidebar } from '@/components/organisms/sidebar/AppSidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/organisms/sidebar/sidebar';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

// Create a client component wrapper for ErrorBoundary
const ErrorBoundaryClient = async () => {
  const { ErrorBoundary } = await import('react-error-boundary');
  return ErrorBoundary;
};

interface PrivateLayoutProps {
  children: ReactNode;
}

export default async function PrivateLayout({ children }: PrivateLayoutProps) {
  const { userId } = await auth();
  const ErrorBoundaryComponent = await ErrorBoundaryClient();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <ErrorBoundaryComponent
      FallbackComponent={() => (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    >
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-eleva-neutral-200/50 pl-2">
          <AppSidebar />
          <SidebarInset className="w-full rounded-xl bg-background">
            <header className="flex h-16 shrink-0 items-center gap-2 rounded-t-xl border-b">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <AppBreadcrumb />
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
              <div className="w-full rounded-xl bg-background">{children}</div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ErrorBoundaryComponent>
  );
}
