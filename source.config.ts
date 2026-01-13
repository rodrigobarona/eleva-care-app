import { defineCollections, defineDocs, frontmatterSchema } from 'fumadocs-mdx/config';
import { z } from 'zod';

/**
 * Fumadocs Content Collections Configuration
 *
 * This file defines all content collections for the Eleva Care platform:
 * - Documentation portals (Patient, Expert, Clinic, Developer) - Use Fumadocs UI
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
 * Clinic Portal
 * Documentation for B2B organizations managing multiple experts
 */
export const { docs: clinicDocs, meta: clinicMeta } = defineDocs({
  dir: 'src/content/docs/clinic',
});

/**
 * Developer API Documentation
 * Documentation for API integration partners
 */
export const { docs: developerDocs, meta: developerMeta } = defineDocs({
  dir: 'src/content/docs/developer',
});

// =============================================================================
// MARKETING COLLECTIONS (Fumadocs Core - Headless)
// =============================================================================

/**
 * Marketing Pages Schema
 * Extended frontmatter for SEO and OG metadata
 */
const marketingSchema = frontmatterSchema.extend({
  og: z
    .object({
      title: z.string(),
      description: z.string(),
      siteName: z.string().optional(),
    })
    .optional(),
});

/**
 * Marketing Pages Collection
 * About, become-expert, for-organizations, evidence-based-care, history
 */
export const marketing = defineCollections({
  type: 'doc',
  dir: 'src/content/marketing',
  schema: marketingSchema,
});

// =============================================================================
// LEGAL COLLECTIONS (Fumadocs Core - Headless)
// =============================================================================

/**
 * Legal Documents Schema
 * Extended frontmatter with effective date
 */
const legalSchema = frontmatterSchema.extend({
  effectiveDate: z.string().optional(),
});

/**
 * Legal Documents Collection
 * Privacy, terms, cookie, payment-policies, expert-agreement
 */
export const legal = defineCollections({
  type: 'doc',
  dir: 'src/content/legal',
  schema: legalSchema,
});

// =============================================================================
// TRUST CENTER COLLECTIONS (Fumadocs Core - Headless)
// =============================================================================

/**
 * Trust Documents Schema
 * Extended frontmatter with last updated date
 */
const trustSchema = frontmatterSchema.extend({
  lastUpdated: z.string().optional(),
});

/**
 * Trust Center Collection
 * DPA, security documentation
 */
export const trust = defineCollections({
  type: 'doc',
  dir: 'src/content/trust',
  schema: trustSchema,
});
