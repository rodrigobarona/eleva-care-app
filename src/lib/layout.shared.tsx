import { i18n } from '@/lib/fumadocs-i18n.config';
import type { DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { BookOpen, Building2, Heart, Users } from 'lucide-react';

/**
 * Fumadocs Layout Configuration
 *
 * Uses sidebar tabs for portal switching (no duplicate nav links).
 * URLs follow next-intl as-needed pattern:
 * - English (default): /help/patient (no prefix)
 * - Other locales: /pt/help/patient
 *
 * @see https://fumadocs.vercel.app/docs/ui/layouts/docs
 */

/**
 * Portal configuration for docs sections
 */
export const portals = {
  patient: {
    title: 'Patient Help Center',
    description: 'Learn how to book appointments, manage payments, and get support.',
    basePath: '/help/patient',
    icon: Users,
  },
  expert: {
    title: 'Expert Resources',
    description: 'Everything healthcare professionals need to provide services.',
    basePath: '/help/expert',
    icon: BookOpen,
  },
  workspace: {
    title: 'Workspace Portal',
    description: 'Manage your organization, team, and analytics.',
    basePath: '/help/workspace',
    icon: Building2,
  },
} as const;

export type PortalKey = keyof typeof portals;

/**
 * Get portal URL with locale prefix (as-needed pattern)
 * - English (default): /help/patient (no prefix)
 * - Other locales: /pt/help/patient
 */
function getPortalUrl(basePath: string, locale: string): string {
  return locale === 'en' ? basePath : `/${locale}${basePath}`;
}

/**
 * Base layout options with i18n support
 *
 * Includes nav configuration with locale-aware docs home link (as-needed pattern).
 *
 * @param locale - The current locale code (e.g., 'en', 'pt')
 * @returns Base layout props for Fumadocs
 *
 * @example
 * ```tsx
 * const options = baseOptions('pt');
 * // Returns layout with nav.url = '/pt/help'
 *
 * const enOptions = baseOptions('en');
 * // Returns layout with nav.url = '/help' (no prefix for default locale)
 * ```
 */
export function baseOptions(locale: string): BaseLayoutProps {
  return {
    i18n,
    nav: {
      title: (
        <span className="flex items-center gap-2 font-semibold">
          <Heart className="size-5 text-pink-500" />
          Eleva Care Help Center
        </span>
      ),
      url: locale === 'en' ? '/help' : `/${locale}/help`,
    },
  };
}

/**
 * Sidebar tabs for portal switching with locale support
 *
 * @see https://fumadocs.vercel.app/docs/ui/layouts/docs#sidebar-tabs-dropdown
 */
function getSidebarTabs(locale: string): NonNullable<DocsLayoutProps['sidebar']>['tabs'] {
  return [
    {
      title: 'Patient Help Center',
      description: 'For users booking appointments',
      url: getPortalUrl('/help/patient', locale),
      icon: <Users className="size-4" />,
    },
    {
      title: 'Expert Resources',
      description: 'For healthcare professionals',
      url: getPortalUrl('/help/expert', locale),
      icon: <BookOpen className="size-4" />,
    },
    {
      title: 'Workspace Portal',
      description: 'For organizations',
      url: getPortalUrl('/help/workspace', locale),
      icon: <Building2 className="size-4" />,
    },
  ];
}

/**
 * DocsLayout options with locale support (excludes tree - passed separately)
 *
 * @param locale - The current locale code (e.g., 'en', 'pt')
 * @returns Docs layout props (without tree) for Fumadocs
 *
 * @example
 * ```tsx
 * const options = docsOptions('es');
 * // Returns layout with locale-aware sidebar tabs
 *
 * <DocsLayout {...options} tree={pageTree}>
 *   {children}
 * </DocsLayout>
 * ```
 */
export function docsOptions(locale: string): Omit<DocsLayoutProps, 'tree'> {
  return {
    ...baseOptions(locale),
    sidebar: {
      tabs: getSidebarTabs(locale),
      defaultOpenLevel: 2, // Keep folders expanded by default
    },
  };
}
