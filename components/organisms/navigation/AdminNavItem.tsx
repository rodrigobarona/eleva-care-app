'use client';

import { Button } from '@/components/atoms/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/molecules/dropdown-menu';
import { fetchUserRoles, isAdmin } from '@/lib/auth/roles';
import { Settings, Users, ChevronDown, BarChart } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function AdminNavItem() {
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRoles() {
      try {
        const roles = await fetchUserRoles();
        setUserRoles(roles);
      } catch (error) {
        console.error('Error loading user roles:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadRoles();
  }, []);

  if (isLoading || !isAdmin(userRoles)) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 gap-1">
          Admin
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href="/admin" className="flex w-full cursor-pointer items-center gap-2">
            <Settings className="h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin?tab=users" className="flex w-full cursor-pointer items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin?tab=analytics" className="flex w-full cursor-pointer items-center gap-2">
            <BarChart className="h-4 w-4" />
            Analytics
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 