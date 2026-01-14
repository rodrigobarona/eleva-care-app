import type { InferPageType } from 'fumadocs-core/source';
import type {
  patientSource,
  expertSource,
  workspaceSource,
  developerSource,
} from '@/lib/source';

/**
 * Get LLM-Friendly Text from Fumadocs Page
 *
 * Converts a Fumadocs page into static MDX content optimized for Large Language Models.
 * This enables AI agents to understand and reference your documentation effectively.
 *
 * The processed markdown includes:
 * - Page title and URL
 * - All content rendered as plain MDX (no JSX components)
 * - Proper formatting for AI consumption
 *
 * @param page - Any page from patient, expert, workspace, or developer sources
 * @returns Formatted markdown string with title, URL, and content
 *
 * @example
 * ```ts
 * const page = patientSource.getPage(['booking']);
 * if (page) {
 *   const llmText = await getLLMText(page);
 *   // Returns:
 *   // # Booking Appointments (/docs/patient/booking)
 *   // [processed markdown content]
 * }
 * ```
 *
 * @see https://fumadocs.vercel.app/docs/integrations/llms
 */
export async function getLLMText(
  page: InferPageType<
    typeof patientSource | typeof expertSource | typeof workspaceSource | typeof developerSource
  >,
) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}

