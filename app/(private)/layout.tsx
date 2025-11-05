import { AppBreadcrumb } from '@/components/layout/sidebar/AppBreadcrumb';
import { AppSidebar } from '@/components/layout/sidebar/AppSidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/layout/sidebar/sidebar';
import { Separator } from '@/components/ui/separator';
import { requireAuth } from '@/lib/auth/workos-session';
import type { ReactNode } from 'react';

interface PrivateLayoutProps {
  children: ReactNode;
}

/**
 * Private Layout - WorkOS Protected
 *
 * All routes in (private) require authentication.
 * WorkOS session is verified via requireAuth() which auto-redirects to /sign-in if not authenticated.
 */
export default async function PrivateLayout({ children }: PrivateLayoutProps) {
  // Require authentication - auto-redirects to /sign-in if not logged in
  await requireAuth();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 rounded-t-xl bg-white">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <AppBreadcrumb />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-b-xl bg-white p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
