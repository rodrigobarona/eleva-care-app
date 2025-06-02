import { workflows } from '@/config/novu';
import { serve } from '@novu/framework/next';

/**
 * Novu Bridge Endpoint
 *
 * This endpoint serves as a bridge between Novu Cloud and our application.
 * It handles incoming webhook requests and manages notification workflows.
 */

// Create route handlers for Novu bridge
const { GET, POST } = serve({
  workflows,
});

// Export route handlers for Next.js API routes
export { GET, POST };
