"use client";
import React from "react";
import { usePathname } from "next/navigation";
import {
  MoreHorizontal,
  type LucideIcon,
  ChevronLeft,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/molecules/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/organisms/sidebar/sidebar";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NavMainProps {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}

const accountItems = [
  { title: "Profile", url: "/account" },
  { title: "Security", url: "/account/security" },
  { title: "Billing", url: "/account/billing" },
];

export function NavMain({ items }: NavMainProps) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const isAccountSection = pathname.startsWith("/account");

  return (
    <div className="relative overflow-hidden">
      <div
        className={cn(
          "transition-transform duration-300 ease-in-out",
          isAccountSection ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <SidebarGroup>
          <SidebarGroupLabel>Appointments</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/appointments" prefetch>
                  <Calendar className="size-4" />
                  <span>All Appointments</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Booking</SidebarGroupLabel>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link href={item.url} prefetch>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {item.items && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction showOnHover>
                        <MoreHorizontal />
                        <span className="sr-only">More</span>
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-48"
                      side={isMobile ? "bottom" : "right"}
                      align={isMobile ? "end" : "start"}
                    >
                      {item.items.map((subItem) => (
                        <DropdownMenuItem key={subItem.title} asChild>
                          <Link href={subItem.url}>{subItem.title}</Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </div>

      <div
        className={cn(
          "absolute inset-0 transition-transform duration-300 ease-in-out",
          isAccountSection ? "translate-x-0" : "translate-x-full"
        )}
      >
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <Link href="/events" className="hover:text-foreground/80">
                <ChevronLeft className="size-4" />
              </Link>
              <span>Account Settings</span>
            </div>
          </SidebarGroupLabel>
          <SidebarMenu>
            {accountItems.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={pathname === item.url}>
                  <Link href={item.url}>
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </div>
    </div>
  );
}
