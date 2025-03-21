'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar';
import { Skeleton } from '@/components/atoms/skeleton';
import { RequireRole } from '@/components/molecules/AuthorizationProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/molecules/dropdown-menu';
import { UserNavNotifications } from '@/components/organisms/layout/UserNavNotifications';
import { SidebarMenu, SidebarMenuItem, useSidebar } from '@/components/organisms/sidebar/sidebar';
import { useClerk, useUser } from '@clerk/nextjs';
import {
  BadgeCheck,
  BanknoteIcon,
  Bell,
  ChevronsUpDown,
  CreditCard,
  Home,
  Lock,
  LogOut,
  Shield,
  Tag,
  Users,
} from 'lucide-react';
import Link from 'next/link';

function NavUserSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex w-full items-center gap-3 rounded-lg px-3 py-2">
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="grid flex-1 gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="size-4 shrink-0" />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function NavUser() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isMobile } = useSidebar();
  if (!user) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <UserNavNotifications />
      </SidebarMenuItem>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                <AvatarImage src={user.imageUrl} alt={user.fullName || ''} />
                <AvatarFallback className="rounded-lg">
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1">
                <span className="truncate text-sm font-semibold">{user.fullName}</span>
                <span className="truncate text-xs">{user.primaryEmailAddress?.emailAddress}</span>
              </div>
              <ChevronsUpDown className="size-4 shrink-0" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <Link
                href="/account"
                className="flex items-center gap-2 rounded-md px-1 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.imageUrl} alt={user.fullName || ''} />
                  <AvatarFallback className="rounded-lg">
                    {user.firstName?.[0]}
                    {user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.fullName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Manage your account
                  </span>
                </div>
              </Link>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/account">
                  Personal Information
                  <BadgeCheck className="ml-auto h-4 w-4" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/account/notifications">
                  Notifications
                  <Bell className="ml-auto h-4 w-4" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/account/security">
                  Security
                  <Lock className="ml-auto h-4 w-4" />
                </Link>
              </DropdownMenuItem>
              <RequireRole roles={['community_expert', 'top_expert']}>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/account/billing">
                    Billing
                    <CreditCard className="ml-auto h-4 w-4" />
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/account/identity">
                    Identity
                    <Shield className="ml-auto h-4 w-4" />
                  </Link>
                </DropdownMenuItem>
              </RequireRole>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <RequireRole roles={['admin', 'superadmin']}>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/admin/users">
                  Users
                  <Users className="ml-auto h-4 w-4" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/admin/categories">
                  Categories
                  <Tag className="ml-auto h-4 w-4" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/admin/payments">
                  Manage Payments
                  <BanknoteIcon className="ml-auto h-4 w-4" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </RequireRole>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/?home=true">
                Home Page
                <Home className="ml-auto h-4 w-4" />
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
              Log out
              <LogOut className="ml-auto h-4 w-4" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// Attach Skeleton component as a static property
NavUser.Skeleton = NavUserSkeleton;
