'use client';

import { cn } from '@/lib/utils';
import { useLocale } from 'next-intl';
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
    basePath: '/docs/patient',
    icon: '👤',
  },
  {
    id: 'expert',
    name: 'Expert Resources',
    description: 'Profile setup, services, and earnings',
    basePath: '/docs/expert',
    icon: '🩺',
  },
  {
    id: 'workspace',
    name: 'Workspace Portal',
    description: 'Team management and B2B features',
    basePath: '/docs/workspace',
    icon: '🏢',
    comingSoon: true,
  },
  {
    id: 'developer',
    name: 'Developer Docs',
    description: 'API reference and integrations',
    basePath: '/docs/developer',
    icon: '💻',
    comingSoon: true,
  },
] as const;

/**
 * Get portal URL with locale prefix (as-needed pattern)
 * - English (default): /docs/patient (no prefix)
 * - Other locales: /pt/docs/patient
 */
function getPortalUrl(basePath: string, locale: string): string {
  return locale === 'en' ? basePath : `/${locale}${basePath}`;
}

/**
 * PersonaSwitcher Component
 *
 * Allows users to switch between different documentation portals
 * (Patient, Expert, Workspace, Developer).
 *
 * Uses next-intl's useLocale() hook to get the current locale from context.
 * URLs follow as-needed pattern: no prefix for English, prefix for others.
 *
 * @example
 * ```tsx
 * <PersonaSwitcher />
 * ```
 */
export function PersonaSwitcher() {
  const pathname = usePathname();
  const locale = useLocale();

  // Determine active portal from pathname (accounts for locale prefix)
  const activePortal = portals.find((portal) =>
    pathname?.includes(portal.basePath)
  );

  return (
    <div className="flex flex-col gap-2">
      <p className="px-2 text-xs font-medium text-muted-foreground">Documentation</p>
      <nav className="flex flex-col gap-1">
        {portals.map((portal) => {
          const isActive = activePortal?.id === portal.id;
          const isComingSoon = 'comingSoon' in portal && portal.comingSoon;
          const href = getPortalUrl(portal.basePath, locale);

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
              href={href}
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
  const locale = useLocale();

  const activePortal = portals.find((portal) =>
    pathname?.includes(portal.basePath)
  );

  return (
    <div className="flex gap-2">
      {portals.map((portal) => {
        const isActive = activePortal?.id === portal.id;
        const isComingSoon = 'comingSoon' in portal && portal.comingSoon;
        const href = getPortalUrl(portal.basePath, locale);

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
            href={href}
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
