import { getLLMText } from '@/lib/get-llm-text';
import {
  patientSource,
  expertSource,
  workspaceSource,
  developerSource,
} from '@/lib/source';

/**
 * LLM Full Documentation Route
 *
 * Provides a complete text dump of all documentation for AI/LLM consumption.
 * This route is cached forever (revalidate: false) for optimal performance.
 *
 * **Purpose:**
 * - Enable AI agents to read and understand all documentation in one request
 * - Provide context for AI-powered search and question answering
 * - Improve SEO by making content easily crawlable
 *
 * **Usage by AI Agents:**
 * GET /llms-full.txt
 *
 * **Returns:**
 * Plain text containing all documentation pages in the format:
 * ```
 * # Page Title (URL)
 * [page content]
 *
 * # Another Page (URL)
 * [page content]
 * ```
 *
 * @see https://fumadocs.vercel.app/docs/integrations/llms
 */

// Cached forever for optimal performance
export const revalidate = false;

export async function GET() {
  // Collect all pages from all documentation portals
  const allPages = [
    ...patientSource.getPages(),
    ...expertSource.getPages(),
    ...workspaceSource.getPages(),
    ...developerSource.getPages(),
  ];

  // Convert all pages to LLM-friendly text format
  const scan = allPages.map(getLLMText);
  const scanned = await Promise.all(scan);

  // Return as plain text with double newlines between pages
  return new Response(scanned.join('\n\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

