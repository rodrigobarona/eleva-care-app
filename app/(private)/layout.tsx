import React, { type ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/organisms/sidebar/sidebar";
import { AppSidebar } from "@/components/organisms/sidebar/AppSidebar";
import { AppBreadcrumb } from "@/components/organisms/sidebar/AppBreadcrumb";
import { Separator } from "@/components/atoms/separator";
import { ErrorBoundary } from "@/components/molecules/error-boundary";
import { redirect } from "next/navigation";

interface PrivateLayoutProps {
  children: ReactNode;
}

export default async function PrivateLayout({ children }: PrivateLayoutProps) {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
