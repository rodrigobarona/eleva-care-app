'use client';

import { RequireRole } from '@/components/molecules/AuthorizationProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/molecules/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/organisms/sidebar/sidebar';
import { cn } from '@/lib/utils';
import {
  Calendar,
  ChevronLeft,
  FileText,
  Home,
  type LucideIcon,
  MoreHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavMainContentProps {
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

export function NavMainContent({ items }: NavMainContentProps) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const isAccountSection = pathname.startsWith('/account');

  return (
    <div className="relative overflow-hidden">
      <div
        className={cn(
          'transition-transform duration-300 ease-in-out',
          isAccountSection ? '-translate-x-full' : 'translate-x-0',
        )}
      >
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard">
                  <Home className="size-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        {/* Expert section */}
        <RequireRole roles={['community_expert', 'top_expert']}>
          <>
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
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/appointments/records" prefetch>
                      <FileText className="size-4" />
                      <span>Records</span>
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
                          side={isMobile ? 'bottom' : 'right'}
                          align={isMobile ? 'end' : 'start'}
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
          </>
        </RequireRole>
      </div>

      <div
        className={cn(
          'absolute inset-0 transition-transform duration-300 ease-in-out',
          isAccountSection ? 'translate-x-0' : 'translate-x-full',
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
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/account'}>
                <Link href="/account">
                  <span>Account</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/account/security'}>
                <Link href="/account/security">
                  <span>Security</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <RequireRole roles={['community_expert', 'top_expert']}>
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/account/billing'}>
                    <Link href="/account/billing">
                      <span>Billing</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/account/identity'}>
                    <Link href="/account/identity">
                      <span>Identity</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            </RequireRole>
          </SidebarMenu>
        </SidebarGroup>
      </div>
    </div>
  );
}
