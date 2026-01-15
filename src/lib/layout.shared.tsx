import { i18n } from '@/lib/fumadocs-i18n.config';
import type { DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { BookOpen, Building2, Code, Heart, Users } from 'lucide-react';

/**
 * Fumadocs Layout Configuration
 *
 * Uses sidebar tabs for portal switching (no duplicate nav links).
 * URLs follow next-intl as-needed pattern:
 * - English (default): /docs/patient (no prefix)
 * - Other locales: /pt/docs/patient
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
    basePath: '/docs/patient',
    icon: Users,
  },
  expert: {
    title: 'Expert Resources',
    description: 'Everything healthcare professionals need to provide services.',
    basePath: '/docs/expert',
    icon: BookOpen,
  },
  workspace: {
    title: 'Workspace Portal',
    description: 'Manage your organization, team, and analytics.',
    basePath: '/docs/workspace',
    icon: Building2,
  },
  developer: {
    title: 'Developer API',
    description: 'API documentation, webhooks, and integration guides.',
    basePath: '/docs/developer',
    icon: Code,
  },
} as const;

export type PortalKey = keyof typeof portals;

/**
 * Get portal URL with locale prefix (as-needed pattern)
 * - English (default): /docs/patient (no prefix)
 * - Other locales: /pt/docs/patient
 */
function getPortalUrl(basePath: string, locale: string): string {
  return locale === 'en' ? basePath : `/${locale}${basePath}`;
}

/**
 * Base layout options with i18n support
 * Includes nav configuration with locale-aware docs home link (as-needed pattern)
 */
export function baseOptions(locale: string): BaseLayoutProps {
  return {
    i18n,
    nav: {
      title: (
        <span className="flex items-center gap-2 font-semibold">
          <Heart className="size-5 text-pink-500" />
          Eleva Care Docs
        </span>
      ),
      url: locale === 'en' ? '/docs' : `/${locale}/docs`,
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
      url: getPortalUrl('/docs/patient', locale),
      icon: <Users className="size-4" />,
    },
    {
      title: 'Expert Resources',
      description: 'For healthcare professionals',
      url: getPortalUrl('/docs/expert', locale),
      icon: <BookOpen className="size-4" />,
    },
    {
      title: 'Workspace Portal',
      description: 'For organizations',
      url: getPortalUrl('/docs/workspace', locale),
      icon: <Building2 className="size-4" />,
    },
    {
      title: 'Developer API',
      description: 'For integrations',
      url: getPortalUrl('/docs/developer', locale),
      icon: <Code className="size-4" />,
    },
  ];
}

/**
 * DocsLayout options with locale support (excludes tree - passed separately)
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
