'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Documentation portal definitions
 */
const portals = [
  {
    id: 'patient',
    name: 'Patient Help Center',
    description: 'Booking, payments, and account help',
    href: '/docs/patient',
    icon: '👤',
  },
  {
    id: 'expert',
    name: 'Expert Resources',
    description: 'Profile setup, services, and earnings',
    href: '/docs/expert',
    icon: '🩺',
  },
  {
    id: 'workspace',
    name: 'Workspace Portal',
    description: 'Team management and B2B features',
    href: '/docs/workspace',
    icon: '🏢',
    comingSoon: true,
  },
  {
    id: 'developer',
    name: 'Developer Docs',
    description: 'API reference and integrations',
    href: '/docs/developer',
    icon: '💻',
    comingSoon: true,
  },
] as const;

/**
 * PersonaSwitcher Component
 *
 * Allows users to switch between different documentation portals
 * (Patient, Expert, Workspace, Developer).
 *
 * @example
 * ```tsx
 * <PersonaSwitcher />
 * ```
 */
export function PersonaSwitcher() {
  const pathname = usePathname();

  // Determine active portal from pathname
  const activePortal = portals.find((portal) => pathname?.startsWith(portal.href));

  return (
    <div className="flex flex-col gap-2">
      <p className="px-2 text-xs font-medium text-muted-foreground">Documentation</p>
      <nav className="flex flex-col gap-1">
        {portals.map((portal) => {
          const isActive = activePortal?.id === portal.id;
          const isComingSoon = 'comingSoon' in portal && portal.comingSoon;

          if (isComingSoon) {
            return (
              <div
                key={portal.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 opacity-50"
              >
                <span className="text-lg">{portal.icon}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{portal.name}</span>
                  <span className="text-xs text-muted-foreground">Coming soon</span>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={portal.id}
              href={portal.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
              )}
            >
              <span className="text-lg">{portal.icon}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{portal.name}</span>
                <span className="text-xs text-muted-foreground">{portal.description}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Compact PersonaSwitcher for mobile/smaller spaces
 */
export function PersonaSwitcherCompact() {
  const pathname = usePathname();
  const activePortal = portals.find((portal) => pathname?.startsWith(portal.href));

  return (
    <div className="flex gap-2">
      {portals.map((portal) => {
        const isActive = activePortal?.id === portal.id;
        const isComingSoon = 'comingSoon' in portal && portal.comingSoon;

        if (isComingSoon) {
          return (
            <span
              key={portal.id}
              className="rounded-md px-2 py-1 text-sm opacity-50"
              title={`${portal.name} - Coming soon`}
            >
              {portal.icon}
            </span>
          );
        }

        return (
          <Link
            key={portal.id}
            href={portal.href}
            className={cn(
              'rounded-md px-2 py-1 text-sm transition-colors',
              isActive ? 'bg-accent' : 'hover:bg-accent/50',
            )}
            title={portal.name}
          >
            {portal.icon} {portal.name}
          </Link>
        );
      })}
    </div>
  );
}

export default PersonaSwitcher;

