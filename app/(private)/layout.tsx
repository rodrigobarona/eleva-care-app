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

interface PrivateLayoutProps {
  children: ReactNode;
}

export default async function PrivateLayout({ children }: PrivateLayoutProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);
  }

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
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-xl bg-white p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
