import { loader } from 'fumadocs-core/source';
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
 * This file exports source loaders for each content collection.
 * Each loader provides:
 * - getPage(slug, locale) - Get a single page
 * - getPages(locale) - Get all pages for a locale
 * - pageTree - Navigation tree for sidebar
 * - generateParams() - Static params for SSG
 *
 * @see https://fumadocs.vercel.app/docs/headless/source-api
 */

// =============================================================================
// DOCUMENTATION PORTALS (Fumadocs UI)
// =============================================================================

/**
 * Patient Help Center Source
 *
 * Documentation for end users who book appointments.
 * Routes: /docs/patient/*
 */
export const patientSource = loader({
  baseUrl: '/docs/patient',
  source: toFumadocsSource(patientDocs, patientMeta),
  i18n,
});

/**
 * Expert Resources Source
 *
 * Documentation for healthcare professionals.
 * Routes: /docs/expert/*
 */
export const expertSource = loader({
  baseUrl: '/docs/expert',
  source: toFumadocsSource(expertDocs, expertMeta),
  i18n,
});

/**
 * Workspace Portal Source
 *
 * Documentation for workspace management (clinics, wellness centers, employers).
 * Internal: "Workspace" | Marketing: "For Organizations"
 * Routes: /docs/workspace/*
 */
export const workspaceSource = loader({
  baseUrl: '/docs/workspace',
  source: toFumadocsSource(workspaceDocs, workspaceMeta),
  i18n,
});

/**
 * Developer API Documentation Source
 *
 * Documentation for API integration partners.
 * Routes: /docs/developer/*
 */
export const developerSource = loader({
  baseUrl: '/docs/developer',
  source: toFumadocsSource(developerDocs, developerMeta),
  i18n,
});

// =============================================================================
// NOTE: MARKETING, LEGAL & TRUST USE NATIVE MDX IMPORTS
// =============================================================================
// These content types use native Next.js MDX imports instead of Fumadocs:
// - Marketing: Heavy custom component usage (TeamSection, BeliefsSection, etc.)
// - Legal: Simple MDX with standard prose styling
// - Trust: Simple MDX with standard prose styling
//
// See: src/app/(marketing)/[locale]/about/page.tsx for the pattern
// See: src/app/(marketing)/[locale]/legal/[document]/page.tsx for legal
// See: src/app/(marketing)/[locale]/trust/[document]/page.tsx for trust
// =============================================================================

// =============================================================================
// PERSONA MAP (for dynamic routing)
// =============================================================================

/**
 * Map of persona identifiers to their source loaders
 * Used for dynamic [persona] routes
 */
export const personaSources = {
  patient: patientSource,
  expert: expertSource,
  workspace: workspaceSource,
  developer: developerSource,
} as const;

export type PersonaKey = keyof typeof personaSources;

/**
 * Get source loader by persona key
 */
export function getPersonaSource(persona: string) {
  return personaSources[persona as PersonaKey];
}

/**
 * Check if a string is a valid persona key
 */
export function isValidPersona(persona: string): persona is PersonaKey {
  return persona in personaSources;
}

