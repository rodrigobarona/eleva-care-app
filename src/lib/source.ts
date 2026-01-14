import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { patient, expert, workspace, developer } from 'fumadocs-mdx:collections/server';
import { i18n } from './fumadocs-i18n';

/**
 * Fumadocs Source Loaders
 *
 * Each portal has its own source loader for proper URL handling.
 * Uses the recommended .toFumadocsSource() method on defineDocs collections.
 * Uses lucideIconsPlugin to render Lucide icons in sidebar.
 *
 * @see https://fumadocs.vercel.app/docs/headless/source-api
 * @see https://fumadocs.vercel.app/docs/mdx
 */

export const patientSource = loader({
  baseUrl: '/docs/patient',
  source: patient.toFumadocsSource(),
  i18n,
  plugins: [lucideIconsPlugin()],
});

export const expertSource = loader({
  baseUrl: '/docs/expert',
  source: expert.toFumadocsSource(),
  i18n,
  plugins: [lucideIconsPlugin()],
});

export const workspaceSource = loader({
  baseUrl: '/docs/workspace',
  source: workspace.toFumadocsSource(),
  i18n,
  plugins: [lucideIconsPlugin()],
});

export const developerSource = loader({
  baseUrl: '/docs/developer',
  source: developer.toFumadocsSource(),
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
