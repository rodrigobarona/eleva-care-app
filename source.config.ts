import {
  defineCollections,
  defineConfig,
  defineDocs,
  frontmatterSchema,
} from 'fumadocs-mdx/config';
import { z } from 'zod';

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
 * - Documentation portals (Patient, Expert, Organization, Developer) - Use Fumadocs UI
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
 * Organization Portal
 * Documentation for B2B organizations (clinics, wellness centers, employers)
 * Aligns with the "For Organizations" marketing philosophy
 */
export const { docs: organizationDocs, meta: organizationMeta } = defineDocs({
  dir: 'src/content/docs/organization',
});

/**
 * Developer API Documentation
 * Documentation for API integration partners
 */
export const { docs: developerDocs, meta: developerMeta } = defineDocs({
  dir: 'src/content/docs/developer',
});

// =============================================================================
// MARKETING COLLECTIONS - DISABLED
// =============================================================================
// Marketing pages use native Next.js MDX imports with custom components
// (About, become-expert, for-organizations, etc.)
// This approach is preferred because:
// 1. Heavy use of custom React components (TeamSection, BeliefsSection, etc.)
// 2. Complex layouts that don't fit the documentation pattern
// 3. Native MDX imports work well with Turbopack
//
// To enable Fumadocs for marketing in the future, create src/content/marketing/
// with proper frontmatter and update the pages to use marketingSource.

// Placeholder exports to satisfy source.ts imports
// These will return empty arrays since the directories don't exist
export const marketing = defineCollections({
  type: 'doc',
  dir: 'src/content/_placeholder/marketing', // Non-existent, returns empty
  schema: frontmatterSchema,
});

export const legal = defineCollections({
  type: 'doc',
  dir: 'src/content/_placeholder/legal', // Non-existent, returns empty
  schema: frontmatterSchema,
});

export const trust = defineCollections({
  type: 'doc',
  dir: 'src/content/_placeholder/trust', // Non-existent, returns empty
  schema: frontmatterSchema,
});
