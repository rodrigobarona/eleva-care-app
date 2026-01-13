import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import {
  patientDocs,
  patientMeta,
  expertDocs,
  expertMeta,
  workspaceDocs,
  workspaceMeta,
  developerDocs,
  developerMeta,
} from 'fumadocs-mdx:collections/server';
import { toFumadocsSource } from 'fumadocs-mdx/runtime/server';
import { i18n } from './fumadocs-i18n';

/**
 * Fumadocs Source Loaders
 *
 * Each portal has its own source loader for proper URL handling.
 * Uses lucideIconsPlugin to render Lucide icons in sidebar.
 *
 * @see https://fumadocs.vercel.app/docs/headless/source-api
 */

export const patientSource = loader({
  baseUrl: '/docs/patient',
  source: toFumadocsSource(patientDocs, patientMeta),
  i18n,
  plugins: [lucideIconsPlugin()],
});

export const expertSource = loader({
  baseUrl: '/docs/expert',
  source: toFumadocsSource(expertDocs, expertMeta),
  i18n,
  plugins: [lucideIconsPlugin()],
});

export const workspaceSource = loader({
  baseUrl: '/docs/workspace',
  source: toFumadocsSource(workspaceDocs, workspaceMeta),
  i18n,
  plugins: [lucideIconsPlugin()],
});

export const developerSource = loader({
  baseUrl: '/docs/developer',
  source: toFumadocsSource(developerDocs, developerMeta),
  i18n,
  plugins: [lucideIconsPlugin()],
});

/**
 * Portal sources map - used by dynamic [portal] route
 */
export const portalSources = {
  patient: patientSource,
  expert: expertSource,
  workspace: workspaceSource,
  developer: developerSource,
} as const;

export type PortalKey = keyof typeof portalSources;

/**
 * Get source for a portal
 */
export function getPortalSource(portal: string) {
  return portalSources[portal as PortalKey];
}

/**
 * Check if portal is valid
 */
export function isValidPortal(portal: string): portal is PortalKey {
  return portal in portalSources;
}
