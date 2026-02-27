'use client';

/**
 * Organization Switcher Component
 *
 * Allows users to switch between their personal organization and team organizations.
 * When switching, the WorkOS session is refreshed with the new organizationId,
 * which updates role, permissions, and entitlements in the JWT.
 *
 * @see src/server/actions/teams.ts - getUserOrganizations()
 */
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from '@/lib/i18n/navigation';
import { Building2, Check, ChevronsUpDown, Plus, User } from 'lucide-react';
import { useTransition } from 'react';

interface Organization {
  id: string;
  workosOrgId: string;
  name: string;
  type: string;
  role: string;
  isCurrent: boolean;
}

interface OrgSwitcherProps {
  organizations: Organization[];
  onSwitch?: (workosOrgId: string) => Promise<void>;
}

const orgTypeIcons: Record<string, React.ReactNode> = {
  member_personal: <User className="h-4 w-4" />,
  expert_individual: <User className="h-4 w-4" />,
  team: <Building2 className="h-4 w-4" />,
};

const orgTypeLabels: Record<string, string> = {
  member_personal: 'Personal',
  expert_individual: 'Practice',
  team: 'Team',
};

export function OrgSwitcher({ organizations, onSwitch }: OrgSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentOrg = organizations.find((o) => o.isCurrent);
  const hasMultipleOrgs = organizations.length > 1;

  if (!currentOrg) return null;

  // If user only has one org, show it without dropdown
  if (!hasMultipleOrgs) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
        {orgTypeIcons[currentOrg.type] || <Building2 className="h-4 w-4" />}
        <div className="flex-1 truncate">
          <p className="truncate text-sm font-medium">{currentOrg.name}</p>
          <p className="text-xs text-muted-foreground">
            {orgTypeLabels[currentOrg.type] || currentOrg.type}
          </p>
        </div>
      </div>
    );
  }

  const handleSwitch = (org: Organization) => {
    if (org.isCurrent) return;

    startTransition(async () => {
      if (onSwitch) {
        await onSwitch(org.workosOrgId);
      }
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isPending}>
        <button
          className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
          type="button"
        >
          {orgTypeIcons[currentOrg.type] || <Building2 className="h-4 w-4" />}
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium">{currentOrg.name}</p>
            <p className="text-xs text-muted-foreground">
              {orgTypeLabels[currentOrg.type] || currentOrg.type}
            </p>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitch(org)}
            className="flex cursor-pointer items-center gap-2"
          >
            {orgTypeIcons[org.type] || <Building2 className="h-4 w-4" />}
            <div className="flex-1 truncate">
              <p className="truncate text-sm">{org.name}</p>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {orgTypeLabels[org.type] || org.type}
                </span>
                <Badge variant="outline" className="px-1 py-0 text-[10px]">
                  {org.role}
                </Badge>
              </div>
            </div>
            {org.isCurrent && <Check className="h-4 w-4 shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/team/create')}
          className="flex cursor-pointer items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">Create a Team</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
