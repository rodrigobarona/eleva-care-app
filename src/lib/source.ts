import { loader } from 'fumadocs-core/source';
import {
  patientDocs,
  expertDocs,
  clinicDocs,
  developerDocs,
  marketing,
  legal,
  trust,
} from 'fumadocs-mdx:collections/server';
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
  source: patientDocs.toFumadocsSource(),
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
  source: expertDocs.toFumadocsSource(),
  i18n,
});

/**
 * Clinic Portal Source
 *
 * Documentation for B2B organizations.
 * Routes: /docs/clinic/*
 */
export const clinicSource = loader({
  baseUrl: '/docs/clinic',
  source: clinicDocs.toFumadocsSource(),
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
  source: developerDocs.toFumadocsSource(),
  i18n,
});

// =============================================================================
// MARKETING PAGES (Fumadocs Core - Headless)
// =============================================================================

/**
 * Marketing Pages Source
 *
 * About, become-expert, for-organizations, etc.
 * Uses Eleva Care custom components via mdx-components.tsx
 * Routes: /about, /become-expert, etc.
 */
export const marketingSource = loader({
  baseUrl: '/',
  source: marketing.toFumadocsSource(),
  i18n,
});

// =============================================================================
// LEGAL & TRUST (Fumadocs Core - Headless)
// =============================================================================

/**
 * Legal Documents Source
 *
 * Privacy, terms, cookie policy, etc.
 * Routes: /legal/*
 */
export const legalSource = loader({
  baseUrl: '/legal',
  source: legal.toFumadocsSource(),
  i18n,
});

/**
 * Trust Center Source
 *
 * DPA, security documentation
 * Routes: /trust/*
 */
export const trustSource = loader({
  baseUrl: '/trust',
  source: trust.toFumadocsSource(),
  i18n,
});

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
  clinic: clinicSource,
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

