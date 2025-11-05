'use client';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/layout/sidebar/sidebar';
import { RequireRole } from '@/components/shared/providers/AuthorizationProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useClerk } from '@clerk/nextjs';
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
  const { user } = useAuth();
  const { signOut } = useClerk();
  const { isMobile } = useSidebar();
  if (!user) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                <AvatarImage src={user.imageUrl} alt={user.fullName || ''} />
                <AvatarFallback className="rounded-lg">
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm">
                <span className="truncate font-semibold">{user.fullName}</span>
                <span className="truncate text-xs">{user.primaryEmailAddress?.emailAddress}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
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
                <div className="grid flex-1">
                  <span className="text-sm font-medium text-foreground">{user.fullName}</span>
                  <span className="text-xs text-muted-foreground">
                    {user.primaryEmailAddress?.emailAddress}
                  </span>
                </div>
              </Link>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/account">
                  <Home className="mr-2 h-4 w-4" />
                  <span>Account</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Billing</span>
                </Link>
              </DropdownMenuItem>
              <RequireRole roles={['community_expert', 'top_expert']}>
                <DropdownMenuItem asChild>
                  <Link href="/account/billing">
                    <BanknoteIcon className="mr-2 h-4 w-4" />
                    <span>Earnings</span>
                  </Link>
                </DropdownMenuItem>
              </RequireRole>
              <DropdownMenuItem asChild>
                <Link href="/account/identity">
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  <span>Identity</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/security">
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Security</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/notifications">
                  <Bell className="mr-2 h-4 w-4" />
                  <span>My Notifications</span>
                </Link>
              </DropdownMenuItem>
              <RequireRole roles={['superadmin']}>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Admin Portal</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/tags">
                    <Tag className="mr-2 h-4 w-4" />
                    <span>Tags Management</span>
                  </Link>
                </DropdownMenuItem>
              </RequireRole>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account/security">
                <Lock className="mr-2 h-4 w-4" />
                <span>Privacy & Data</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ redirectUrl: '/' })}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// Attach Skeleton component as a static property
NavUser.Skeleton = NavUserSkeleton;
