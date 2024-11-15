import React, { ReactNode } from "react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/organisms/sidebar";
import { AppSidebar } from "@/components/organisms/AppSidebar";
import { AppBreadcrumb } from "@/components/organisms/AppBreadcrumb";
import { Toaster } from "@/components/molecules/toaster";
import { Separator } from "@/components/atoms/separator";

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <AppBreadcrumb />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
        </SidebarInset>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
