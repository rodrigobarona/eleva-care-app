/**
 * @deprecated This file is deprecated. Import from '@/lib/integrations/novu' instead.
 *
 * This file now re-exports from the consolidated Novu utilities module.
 * All new code should import directly from '@/lib/integrations/novu'.
 *
 * Migration: Replace imports like this:
 *   import { triggerWorkflow } from '@/app/utils/novu';
 * With:
 *   import { triggerWorkflow } from '@/lib/integrations/novu';
 */

// Re-export everything from the consolidated module for backward compatibility
export {
  triggerWorkflow,
  updateSubscriber,
  getNovuStatus,
  runNovuDiagnostics,
  novu,
} from '@/lib/integrations/novu';

export type { TriggerWorkflowOptions } from '@/lib/integrations/novu';
