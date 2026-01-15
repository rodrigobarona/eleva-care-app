import { getLLMText } from '@/lib/get-llm-text';
import { getPortalSource, isValidPortal, type PortalKey } from '@/lib/source';
import { notFound } from 'next/navigation';

/**
 * LLM MDX Route Handler - Individual Page Access
 *
 * Provides individual documentation pages in MDX format for AI/LLM consumption.
 * AI agents can access any page by appending `.mdx` to the URL.
 *
 * **Purpose:**
 * - Allow AI agents to fetch specific pages as markdown
 * - Enable content negotiation via Accept header
 * - Support AI-powered tools that need raw markdown
 *
 * **Usage by AI Agents:**
 * GET /en/docs/patient/booking.mdx
 * GET /pt/docs/expert/getting-started/profile.mdx
 *
 * **Returns:**
 * Markdown content with:
 * - Page title and URL
 * - Full page content as processed markdown
 *
 * **Routing:**
 * This route is accessed via rewrite rules in proxy.ts:
 * /[locale]/docs/[portal]/[...slug] (Accept: text/markdown) → /llms.mdx/[locale]/docs/[portal]/[...slug]
 *
 * @see https://fumadocs.vercel.app/docs/integrations/llms
 */

interface RouteContext {
  params: Promise<{
    locale: string;
    portal: string;
    slug?: string[];
  }>;
}

// Cached forever for optimal performance
export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext) {
  const { locale, portal, slug } = await params;

  // Validate portal
  if (!isValidPortal(portal)) {
    notFound();
  }

  // Get page from appropriate source with locale
  const source = getPortalSource(portal);
  const page = source.getPage(slug, locale);

  if (!page) {
    notFound();
  }

  // Return page as LLM-friendly markdown
  const markdown = await getLLMText(page);

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Portal': portal,
      'X-Locale': locale,
      'X-Page-URL': page.url,
    },
  });
}

/**
 * Generate static params for all documentation pages across all portals and locales
 */
export function generateStaticParams() {
  const portals: PortalKey[] = ['patient', 'expert', 'workspace', 'developer'];
  const locales = ['en', 'es', 'pt', 'pt-BR'];
  const allParams: { locale: string; portal: string; slug?: string[] }[] = [];

  for (const locale of locales) {
    for (const portal of portals) {
      const source = getPortalSource(portal);
      const params = source.generateParams();

      for (const { slug } of params) {
        allParams.push({ locale, portal, slug });
      }
    }
  }

  return allParams;
}

