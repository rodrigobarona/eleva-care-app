import React from "react";
import { Calendar, Home, User, Leaf } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavUser } from "./NavUser";

const items = [
  {
    title: "Events",
    url: "/events",
    icon: Calendar,
  },
  {
    title: "Schedule",
    url: "/schedule",
    icon: Home,
  },
  {
    title: "Profile",
    url: "/my-account/profile",
    icon: User,
  },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2 font-bold">
          <Leaf className="h-6 w-6" />
          <span>Eleva Care</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
