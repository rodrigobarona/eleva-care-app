import { ENV_CONFIG } from '@/config/env';
import { workflows } from '@/config/novu';
import { Client as NovuFrameworkClient } from '@novu/framework';
import { serve } from '@novu/framework/next';

// Create explicit Novu Framework client for Next.js 15 compatibility
const client = new NovuFrameworkClient({
  secretKey: ENV_CONFIG.NOVU_SECRET_KEY!,
  strictAuthentication: false, // Allows flexible authentication for development
});

console.log('[Novu] Bridge endpoint initialized with', workflows.length, 'workflows');

// Export the handlers for the Novu framework
// The serve function automatically handles GET, POST, and OPTIONS methods
export const { GET, POST, OPTIONS } = serve({
  client,
  workflows,
});
