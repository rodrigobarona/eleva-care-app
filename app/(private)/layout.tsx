import { Separator } from '@/components/atoms/separator';
import { ExpertSetupChecklistWrapper } from '@/components/organisms/ExpertSetupChecklistWrapper';
import { PrivateLayoutWrapper } from '@/components/organisms/PrivateLayoutWrapper';
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

interface PrivateLayoutProps {
  children: ReactNode;
}

export default async function PrivateLayout({ children }: PrivateLayoutProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);
  }

  return (
    <PrivateLayoutWrapper>
      <SidebarProvider>
        <div className="bg-eleva-neutral-200/50 flex min-h-screen w-full pl-2">
          <AppSidebar />
          <SidebarInset>
            <div className="bg-background w-full rounded-xl">
              <ExpertSetupChecklistWrapper />
              <header className="flex h-16 shrink-0 items-center gap-2 rounded-t-xl border-b">
                <div className="flex items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <AppBreadcrumb />
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="bg-background w-full rounded-xl">{children}</div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </PrivateLayoutWrapper>
  );
}
