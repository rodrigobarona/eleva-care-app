import { createFromSource } from 'fumadocs-core/search/server';
import {
  patientSource,
  expertSource,
  clinicSource,
  developerSource,
} from '@/lib/source';

/**
 * Unified Documentation Search API
 *
 * This endpoint provides full-text search across all documentation portals:
 * - Patient Help Center
 * - Expert Resources
 * - Clinic Portal (coming soon)
 * - Developer Docs (coming soon)
 *
 * Query Parameters:
 * - query: Search string
 * - tag: Optional tag filter (e.g., 'patient', 'expert', 'clinic', 'developer')
 * - locale: Optional locale filter (e.g., 'en', 'es', 'pt', 'pt-BR')
 *
 * @example
 * GET /api/search?query=booking&tag=patient&locale=en
 *
 * @see https://fumadocs.vercel.app/docs/headless/search
 */

// Combine all documentation sources for unified search
const allSources = [patientSource, expertSource, clinicSource, developerSource];

// Create search handlers for each source with locale support
const searchHandlers = allSources.map((source) =>
  createFromSource(source, {
    // Configure language for search algorithm based on locale
    localeMap: {
      en: { language: 'english' },
      es: { language: 'spanish' },
      pt: { language: 'portuguese' },
      'pt-BR': { language: 'portuguese' },
    },
  })
);

/**
 * GET handler for search requests
 *
 * Searches across all documentation portals and returns combined results
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';
  const tag = searchParams.get('tag');
  const locale = searchParams.get('locale') || 'en';

  // If a specific tag/portal is requested, search only that source
  if (tag) {
    const sourceIndex = {
      patient: 0,
      expert: 1,
      clinic: 2,
      developer: 3,
    }[tag];

    if (sourceIndex !== undefined && searchHandlers[sourceIndex]) {
      return searchHandlers[sourceIndex].GET(request);
    }
  }

  // For unified search, query all sources and combine results
  try {
    const results = await Promise.all(
      searchHandlers.map(async (handler, index) => {
        try {
          const response = await handler.GET(request);
          const data = await response.json();
          // Add source tag to each result
          const sourceTag = ['patient', 'expert', 'clinic', 'developer'][index];
          return (data.results || []).map((result: Record<string, unknown>) => ({
            ...result,
            source: sourceTag,
          }));
        } catch {
          return [];
        }
      })
    );

    // Flatten and sort results by relevance (assuming score is provided)
    const flatResults = results
      .flat()
      .sort((a, b) => ((b.score as number) || 0) - ((a.score as number) || 0))
      .slice(0, 20); // Limit to 20 results

    return Response.json({
      results: flatResults,
      query,
      locale,
    });
  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}

