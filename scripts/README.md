# Scripts Directory

This directory contains reusable utility scripts for the Eleva Care application.

## Directory Structure

```
scripts/
├── utilities/              # Reusable utility scripts
└── README.md             # This file
```

## Active Utility Scripts

### Cache Management

**`utilities/cache-manager.ts`** - Unified cache management utility

- Clear Clerk user cache by environment
- Check Redis health status
- View cache statistics
- Clear all cache entries

```bash
# Clear Clerk cache for development
pnpm tsx scripts/utilities/cache-manager.ts clear-clerk --env=development

# Check Redis health
pnpm tsx scripts/utilities/cache-manager.ts health

# View cache statistics
pnpm tsx scripts/utilities/cache-manager.ts stats
```

### QStash Management

**`utilities/qstash-manager.js`** - Manage QStash scheduled jobs

- Schedule all configured cron jobs
- List existing schedules
- Clean up old schedules
- Monitor schedule health

```bash
# Schedule all jobs
node scripts/utilities/qstash-manager.js schedule

# List all schedules
node scripts/utilities/qstash-manager.js list

# Show statistics
node scripts/utilities/qstash-manager.js stats
```

**`utilities/update-qstash-schedules.ts`** - Update QStash schedules using configuration

```bash
# Update all schedules
pnpm tsx scripts/utilities/update-qstash-schedules.ts
```

### PostHog Management

**`utilities/setup-posthog-dashboards.js`** - Set up PostHog dashboards and insights

```bash
node scripts/utilities/setup-posthog-dashboards.js
```

**`utilities/validate-posthog-permissions.js`** - Validate PostHog API permissions

```bash
node scripts/utilities/validate-posthog-permissions.js
```

### Health Checks

**`utilities/test-betterstack-health.sh`** - Test BetterStack health endpoint integration

```bash
bash scripts/utilities/test-betterstack-health.sh
```

**`utilities/test-health-endpoints.sh`** - Test all application health endpoints

```bash
bash scripts/utilities/test-health-endpoints.sh
```

### Environment & Debugging

**`utilities/check-qstash-env.js`** - Verify QStash environment variables

```bash
node scripts/utilities/check-qstash-env.js
```

**`utilities/debug-env-loading.js`** - Debug environment variable loading

```bash
node scripts/utilities/debug-env-loading.js
```

**`utilities/setup-env-vars.js`** - Set up required environment variables

```bash
node scripts/utilities/setup-env-vars.js
```

## Best Practices

### Creating New Scripts

1. **Determine if it's reusable or one-time:**
   - Reusable → Place in `utilities/`
   - One-time → Run once, then delete (document in MIGRATION_SUMMARY.md if significant)

2. **Follow naming conventions:**
   - Utilities: `<action>-<resource>.ts` (e.g., `cache-manager.ts`)
   - Migrations: `migrate-<what>.ts` (e.g., `migrate-redis-config.ts`)
   - Fixes: `fix-<issue>.ts` or `cleanup-<issue>.ts`

3. **Include documentation:**
   - Add header comment with purpose, usage, and examples
   - Update this README with the new script

4. **Use TypeScript for Node.js scripts:**
   - Use `.ts` extension
   - Run with `pnpm tsx scripts/<script-name>.ts`
   - Use `.js` only for legacy scripts or when TypeScript is not needed

5. **Add to package.json:**
   - Add convenient npm scripts for frequently used utilities

### Running Scripts

**TypeScript scripts:**

```bash
pnpm tsx scripts/utilities/<script-name>.ts
```

**JavaScript scripts:**

```bash
node scripts/utilities/<script-name>.js
```

**Shell scripts:**

```bash
bash scripts/utilities/<script-name>.sh
```

### Environment Variables

Most scripts require environment variables. Ensure your `.env` or `.env.local` file is properly configured:

```env
# Required for Redis/Cache scripts
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Required for QStash scripts
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...

# Required for PostHog scripts
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...

# Required for Stripe scripts
STRIPE_SECRET_KEY=...
```

## Script Lifecycle

1. **Development** - Create script in `utilities/` or root
2. **Testing** - Test thoroughly before running in production
3. **Execution** - Run the script as needed
4. **Cleanup** - If one-time use, delete after completion and document in MIGRATION_SUMMARY.md
5. **Documentation** - Update README and remove from npm scripts if applicable

## Troubleshooting

### Script won't run

- Ensure all required environment variables are set
- Check file permissions (`chmod +x script-name.sh` for shell scripts)
- Verify dependencies are installed (`pnpm install`)

### Redis connection errors

- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- Check Redis health: `pnpm tsx scripts/utilities/cache-manager.ts health`

### QStash errors

- Verify `QSTASH_TOKEN` and signing keys
- Check environment: `node scripts/utilities/check-qstash-env.js`

### TypeScript errors

- Ensure `tsx` is installed: `pnpm add -D tsx`
- Check tsconfig.json is properly configured

## Contributing

When adding new scripts:

1. Place in `utilities/` directory
2. Follow naming conventions and best practices
3. Include comprehensive documentation
4. Update this README
5. Add npm script to package.json if frequently used
6. Test thoroughly before committing
7. If one-time use: Delete after execution and document in MIGRATION_SUMMARY.md

## Related Documentation

- [Redis Implementation](../docs/02-core-systems/06-caching-redis.md)
- [QStash Integration](../docs/02-core-systems/11-qstash-integration.md)
- [Environment Variables](../docs/01-getting-started/02-environment-variables.md)
- [PostHog Analytics](../docs/02-core-systems/14-analytics-posthog.md)
