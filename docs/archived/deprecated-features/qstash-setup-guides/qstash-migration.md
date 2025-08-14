# QStash Migration: From Vercel Cron Jobs to Upstash QStash

This document explains the migration from Vercel Cron Jobs to Upstash QStash for the Eleva Care application.

## Why the Migration?

Vercel's Free Tier limits the number of cron jobs to one per day. Our application requires multiple scheduled jobs running at different intervals:

1. Process tasks - daily at 4 AM
2. Process expert transfers - every 2 hours
3. Check upcoming payouts - daily at noon

Upstash QStash provides a more flexible solution with a generous free tier:

- 500 requests per day
- 3 retries per request
- 1MB max message size
- 15 minutes HTTP timeout

## How It Works

### Architecture

1. **QStash Client** - A utility that provides functions to schedule jobs in QStash
2. **QStash API Endpoint** - A verification endpoint that validates incoming QStash requests
3. **Existing Cron Endpoint** - Modified to accept requests from both QStash and legacy API keys

```
┌─────────┐         ┌───────────┐         ┌─────────────────┐
│ QStash  │ ─────► │  /api/     │ ─────► │ /api/cron/      │
│ Service │         │  qstash/   │         │ [job-endpoint] │
└─────────┘         └───────────┘         └─────────────────┘
    ▲                                             ▲
    │                                             │
    │                 ┌───────────┐               │
    └─────────────── │ Schedule  │ ──────────────┘
                      │ Setup     │
                      └───────────┘
```

### Key Components

1. **QStash Client** (`lib/qstash.ts`)
   - Initializes the QStash client with the provided token
   - Provides functions to schedule, list, and delete recurring jobs

2. **QStash API Endpoint** (`app/api/qstash/route.ts`)
   - Verifies incoming requests from QStash using the signature
   - Forwards requests to the appropriate endpoint

3. **Setup Script** (`scripts/setup-qstash.js`)
   - Sets up all required QStash schedules during deployment
   - Lists existing schedules and creates new ones as needed

4. **Cron Endpoints** (Modified to accept QStash requests)
   - Updated to validate requests from QStash
   - Added POST methods to handle QStash's HTTP POST mechanism

5. **Verification Endpoints**
   - `/api/admin/verify-qstash` - Admin endpoint to check QStash configuration
   - `/api/healthcheck` - Simple endpoint for testing QStash messaging

## Configuration

The QStash configuration uses the following environment variables:

```
# Required for sending
QSTASH_URL="https://qstash.upstash.io"
QSTASH_TOKEN="your-token"

# Required for receiving/verification
QSTASH_CURRENT_SIGNING_KEY="sig_xxx"
QSTASH_NEXT_SIGNING_KEY="sig_xxx"
```

## Deployment Process

The migration includes automatic setup during deployment:

1. The `postbuild` script in package.json runs `scripts/setup-qstash.js`
2. This script creates all necessary schedules in QStash
3. Vercel cron jobs are disabled by setting `crons: []` in vercel.json

## Manual Operations

### Setup QStash Schedules

To manually set up or update QStash schedules:

```
npm run qstash:setup
```

### Test Endpoints

To manually test endpoints:

```
# Verify QStash configuration
curl -X GET https://eleva-care-app.vercel.app/api/admin/verify-qstash

# Send a test message via QStash
curl -X POST https://eleva-care-app.vercel.app/api/admin/verify-qstash

# Check health status
curl -X GET https://eleva-care-app.vercel.app/api/healthcheck
```

### Verification

To verify that QStash is working correctly:

1. Check the QStash configuration:
   ```
   curl -X GET https://eleva-care-app.vercel.app/api/admin/verify-qstash
   ```
2. Send a test message:
   ```
   curl -X POST https://eleva-care-app.vercel.app/api/admin/verify-qstash
   ```
3. Verify that scheduled jobs are running by checking logs in Vercel or application logs.

## Troubleshooting

Common issues and solutions:

1. **Missing Environment Variables**: Ensure all required QStash environment variables are set.

2. **Incorrect URL**: Verify the BASE_URL is correctly set in `lib/setup-qstash-schedules.ts`.

3. **Type Errors**: Make sure interval values match the supported types ('1h', '2h', '6h', '12h', '24h').

4. **Signature Verification Errors**: Check that QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY are correctly set.

## Rollback Strategy

If issues arise with QStash, we can roll back to Vercel cron jobs by:

1. Restoring the cron configuration in `vercel.json`
2. Removing the QStash verification step from the cron endpoints
3. Deleting all QStash schedules

## Monitoring

Monitor QStash execution in the Upstash dashboard and in your application logs.
