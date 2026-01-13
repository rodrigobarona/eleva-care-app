import { defineConfig, defineDocs } from 'fumadocs-mdx/config';

/**
 * Global MDX Configuration
 * Configure remark/rehype plugins and other MDX options
 */
export default defineConfig({
  mdxOptions: {
    // Add remark-gfm for GitHub Flavored Markdown support
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

/**
 * Fumadocs Content Collections Configuration
 *
 * This file defines all content collections for the Eleva Care platform:
 * - Documentation portals (Patient, Expert, Workspace, Developer) - Use Fumadocs UI
 * - Marketing pages - Use Fumadocs Core (headless) with Eleva components
 * - Legal documents - Use Fumadocs Core (headless)
 * - Trust center - Use Fumadocs Core (headless)
 */

// =============================================================================
// DOCUMENTATION COLLECTIONS (Fumadocs UI)
// =============================================================================

/**
 * Patient Help Center
 * Documentation for end users who book appointments
 */
export const { docs: patientDocs, meta: patientMeta } = defineDocs({
  dir: 'src/content/docs/patient',
});

/**
 * Expert Resources
 * Documentation for healthcare professionals (Community and Top Experts)
 */
export const { docs: expertDocs, meta: expertMeta } = defineDocs({
  dir: 'src/content/docs/expert',
});

/**
 * Workspace Portal
 * Documentation for workspace management (clinics, wellness centers, employers)
 * Internal terminology: "Workspace" (e.g., "Dr. Patricia's workspace")
 * Marketing terminology: "For Organizations" (external sales/SEO)
 */
export const { docs: workspaceDocs, meta: workspaceMeta } = defineDocs({
  dir: 'src/content/docs/workspace',
});

/**
 * Developer API Documentation
 * Documentation for API integration partners
 */
export const { docs: developerDocs, meta: developerMeta } = defineDocs({
  dir: 'src/content/docs/developer',
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
