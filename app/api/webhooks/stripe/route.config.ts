// Set to Node.js runtime for Stripe SDK
export const runtime = 'nodejs';

// Force dynamic response for webhooks
export const dynamic = 'force-dynamic';

// Allow longer processing time for webhook handling
export const maxDuration = 60;

// Critical: Disable body parsing so we get the raw request body for signature verification
export const bodyParser = false;
