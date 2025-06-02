import { workflows } from '@/config/novu/workflows';
import { Client as NovuFrameworkClient } from '@novu/framework';
import { serve } from '@novu/framework/next';

/**
 * Novu Bridge Endpoint
 *
 * This endpoint serves as a bridge between Novu Cloud and our application.
 * It handles incoming webhook requests and manages notification workflows.
 *
 * Authentication is handled via NOVU_SECRET_KEY in the Authorization header.
 */

// Create Novu Framework client with authentication
const client = new NovuFrameworkClient({
  secretKey: process.env.NOVU_SECRET_KEY,
  strictAuthentication: true, // Enforce authentication
});

// Create route handlers for Novu bridge
const { GET, POST } = serve({
  client,
  workflows,
});

// Export route handlers for Next.js API routes
export { GET, POST };
