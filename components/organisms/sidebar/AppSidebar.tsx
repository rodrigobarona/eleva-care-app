'use client';

import { useIsExpert } from '@/components/molecules/AuthorizationProvider';
import { NavMain } from '@/components/organisms/sidebar/NavMain';
import { NavSecondary } from '@/components/organisms/sidebar/NavSecondary';
import { NavUser } from '@/components/organisms/sidebar/NavUser';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
} from '@/components/organisms/sidebar/sidebar';
import {
  Calendar,
  CalendarDays,
  CheckSquare,
  Clock,
  Leaf,
  LifeBuoy,
  type LucideIcon,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
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

export function AppSidebar() {
  const isExpert = useIsExpert();

  // Regular user navigation items
  const navigationItems: SidebarItem[] = [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: Leaf,
    },
    {
      title: 'Profile',
      url: '/profile',
      icon: User,
    },
  ];

  // Expert specific navigation items
  const expertItems: SidebarItem[] = [
    {
      title: 'Setup',
      url: '/setup',
      icon: CheckSquare,
    },
    {
      title: 'Appointments',
      url: '/appointments',
      icon: CalendarDays,
    },
    {
      title: 'Events',
      url: '/booking/events',
      icon: Calendar,
    },
    {
      title: 'Customers',
      url: '/appointments/patients',
      icon: Users,
    },
  ];

  const secondaryItems = [
    {
      title: 'Help',
      url: '/help',
      icon: LifeBuoy,
    },
    {
      title: 'Roadmap',
      url: '/roadmap',
      icon: Clock,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/">
          <h2 className="text-xl font-bold">Eleva Care</h2>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarInset>
          <Suspense fallback={<div>Loading...</div>}>
            <NavMain items={navigationItems} />

            {/* Expert navigation section */}
            {isExpert && <NavMain items={expertItems} />}

            <NavSecondary items={secondaryItems} />
          </Suspense>
        </SidebarInset>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
