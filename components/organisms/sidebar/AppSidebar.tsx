'use client';

import { NavMain } from '@/components/organisms/sidebar/NavMain';
import { NavSecondary } from '@/components/organisms/sidebar/NavSecondary';
import { NavUser } from '@/components/organisms/sidebar/NavUser';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/organisms/sidebar/sidebar';
import { useUser } from '@clerk/nextjs';
import { Clock, ExternalLink, Leaf, LifeBuoy, Link, type LucideIcon, User } from 'lucide-react';
import { Suspense } from 'react';

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
    title: 'Events Types',
    url: '/events',
    icon: Link,
    items: [
      { title: 'All Events', url: '/events' },
      { title: 'Create Event', url: '/events/new' },
    ],
  },
  {
    title: 'Availability',
    url: '/schedule',
    icon: Clock,
  },
  {
    title: 'Expert Profile',
    url: '/expert',
    icon: User,
  },
];

export function AppSidebar() {
  const { user } = useUser();

  const secondaryItems: SidebarItem[] = [
    {
      title: 'Public Expert Profile',
      url: user?.username ? `/${user.username}` : '#',
      icon: ExternalLink,
    },
    {
      title: 'Need help?',
      url: '#',
      icon: LifeBuoy,
    },
  ];

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Leaf className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Eleva Care</span>
                  <span className="truncate text-xs">Professional</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={mainItems} />
        <NavSecondary items={secondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <Suspense fallback={<NavUser.Skeleton />}>
          <NavUser />
        </Suspense>
      </SidebarFooter>
    </Sidebar>
  );
}
