import type { DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { BookOpen, Building2, Code, Heart, Users } from 'lucide-react';

/**
 * Fumadocs Layout Configuration
 *
 * Uses sidebar tabs for portal switching (no duplicate nav links).
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
    url: '/docs/patient',
    icon: Users,
  },
  expert: {
    title: 'Expert Resources',
    description: 'Everything healthcare professionals need to provide services.',
    url: '/docs/expert',
    icon: BookOpen,
  },
  workspace: {
    title: 'Workspace Portal',
    description: 'Manage your organization, team, and analytics.',
    url: '/docs/workspace',
    icon: Building2,
  },
  developer: {
    title: 'Developer API',
    description: 'API documentation, webhooks, and integration guides.',
    url: '/docs/developer',
    icon: Code,
  },
} as const;

export type PortalKey = keyof typeof portals;

/**
 * Base layout options (nav only, no links - tabs handle portal switching)
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2 font-semibold">
          <Heart className="size-5 text-pink-500" />
          Eleva Care Docs
        </span>
      ),
      url: '/docs',
    },
  };
}

/**
 * Sidebar tabs for portal switching
 *
 * @see https://fumadocs.vercel.app/docs/ui/layouts/docs#sidebar-tabs-dropdown
 */
export const sidebarTabs: NonNullable<DocsLayoutProps['sidebar']>['tabs'] = [
  {
    title: 'Patient Help Center',
    description: 'For users booking appointments',
    url: '/docs/patient',
    icon: <Users className="size-4" />,
  },
  {
    title: 'Expert Resources',
    description: 'For healthcare professionals',
    url: '/docs/expert',
    icon: <BookOpen className="size-4" />,
  },
  {
    title: 'Workspace Portal',
    description: 'For organizations',
    url: '/docs/workspace',
    icon: <Building2 className="size-4" />,
  },
  {
    title: 'Developer API',
    description: 'For integrations',
    url: '/docs/developer',
    icon: <Code className="size-4" />,
  },
];

/**
 * DocsLayout options (excludes tree - passed separately)
 */
export function docsOptions(): Omit<DocsLayoutProps, 'tree'> {
  return {
    ...baseOptions(),
    sidebar: {
      tabs: sidebarTabs,
      defaultOpenLevel: 2, // Keep folders expanded by default
    },
  };
}
