// Set to Node.js runtime for Stripe SDK
export const runtime = 'nodejs';

// Force dynamic response for webhooks
export const dynamic = 'force-dynamic';

// Allow longer processing time for webhook handling
export const maxDuration = 60;

// Body parsing is already disabled in app-router routes – no extra config needed
