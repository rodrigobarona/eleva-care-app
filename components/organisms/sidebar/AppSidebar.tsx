"use client";

import React from "react";
import {
  Calendar,
  Home,
  User,
  Leaf,
  LifeBuoy,
  Send,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/organisms/sidebar/sidebar";
import { NavUser } from "@/components/organisms/sidebar/NavUser";
import { NavMain } from "@/components/organisms/sidebar/NavMain";
import { NavSecondary } from "@/components/organisms/sidebar/NavSecondary";

interface SidebarItem {
  title: string;
  url: string;
  icon: LucideIcon;
  items?: {
    title: string;
    url: string;
  }[];
}

const mainItems: SidebarItem[] = [
  {
    title: "Events",
    url: "/events",
    icon: Calendar,
    items: [
      { title: "All Events", url: "/events" },
      { title: "Create Event", url: "/events/new" },
    ],
  },
  {
    title: "Schedule",
    url: "/schedule",
    icon: Home,
    items: [
      { title: "My Schedule", url: "/schedule" },
      { title: "Availability", url: "/schedule/availability" },
    ],
  },
  {
    title: "Profile",
    url: "/my-account/profile",
    icon: User,
    items: [
      { title: "Settings", url: "/my-account/profile" },
      { title: "Account", url: "/my-account" },
    ],
  },
];

const secondaryItems: SidebarItem[] = [
  {
    title: "Support",
    url: "#",
    icon: LifeBuoy,
  },
  {
    title: "Feedback",
    url: "#",
    icon: Send,
  },
];

export function AppSidebar() {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Leaf className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Eleva Care</span>
                  <span className="truncate text-xs">Professional</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={mainItems} />
        <NavSecondary items={secondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
