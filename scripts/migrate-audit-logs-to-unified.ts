/**
 * Migrate Audit Logs from Separate Database to Unified Schema
 *
 * This script migrates existing audit logs from the separate audit database
 * to the new unified schema with RLS protection.
 *
 * Key Operations:
 * 1. Map clerk_user_id to workos_user_id + org_id
 * 2. Migrate all audit logs preserving timestamps
 * 3. Validate data integrity
 * 4. Generate migration report
 *
 * Usage:
 * ```bash
 * # Dry run (no changes)
 * tsx scripts/migrate-audit-logs-to-unified.ts --dry-run
 *
 * # Execute migration
 * tsx scripts/migrate-audit-logs-to-unified.ts --execute
 *
 * # Execute with progress updates
 * tsx scripts/migrate-audit-logs-to-unified.ts --execute --verbose
 * ```
 *
 * IMPORTANT:
 * - Run this AFTER user migration (Clerk → WorkOS)
 * - Keep old audit DB for 6 months as backup
 * - Validate counts before decommissioning old DB
 */
import * as legacyAuditSchema from '@/drizzle/auditSchema';
import * as newSchema from '@/drizzle/schema-workos';
import { AuditLogsTable } from '@/drizzle/schema-workos';
import { neon } from '@neondatabase/serverless';
// import { eq } from 'drizzle-orm'; // TODO: Will be used for mapping queries
import { drizzle } from 'drizzle-orm/neon-http';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isExecute = args.includes('--execute');
const isVerbose = args.includes('--verbose');

if (!isDryRun && !isExecute) {
  console.error('❌ Error: Must specify --dry-run or --execute');
  console.log('Usage:');
  console.log('  tsx scripts/migrate-audit-logs-to-unified.ts --dry-run');
  console.log('  tsx scripts/migrate-audit-logs-to-unified.ts --execute');
  process.exit(1);
}

// Database connections
const legacyAuditSql = neon(process.env.AUDITLOG_DATABASE_URL!);
const legacyAuditDb = drizzle(legacyAuditSql, { schema: legacyAuditSchema });

// TODO: Will be used for user ID mapping queries
// const legacyAppSql = neon(process.env.DATABASE_URL_LEGACY!);
// const legacyAppDb = drizzle(legacyAppSql); // No schema needed for mapping query

const newSql = neon(process.env.DATABASE_URL!);
const newDb = drizzle(newSql, { schema: newSchema });

interface MigrationStats {
  totalLogs: number;
  migratedLogs: number;
  failedLogs: number;
  skippedLogs: number;
  errors: Array<{ logId: string; error: string }>;
}

/**
 * Get user mapping (Clerk → WorkOS + org_id)
 *
 * This requires that users have already been migrated to WorkOS
 */
async function getUserMapping(): Promise<
  Map<
    string,
    {
      workosUserId: string;
      email: string;
    }
  >
> {
  console.log('📋 Fetching user mapping (Clerk → WorkOS)...');

  // TODO: Implement actual user mapping logic
  // Query new database for user mapping
  // const _users = await newDb.query.UsersTable.findMany({
  //   columns: {
  //     workosUserId: true,
  //     email: true,
  //   },
  // });

  // We need to also get the clerkUserId from legacy DB for mapping
  // This assumes you have a migration_user_mapping table or similar
  // Adjust this query based on your actual migration approach

  const mapping = new Map();

  // TODO: Implement actual mapping logic based on your user migration approach
  // Option 1: If you kept a mapping table during user migration
  // Option 2: Match by email (if emails are unique and unchanged)
  // Option 3: Use a CSV/JSON mapping file

  console.log(`✅ Loaded ${mapping.size} user mappings`);
  return mapping;
}

/**
 * Migrate a single audit log entry
 */
async function migrateAuditLog(
  log: typeof legacyAuditSchema.auditLogs.$inferSelect,
  userMapping: Map<string, { workosUserId: string; email: string }>,
  stats: MigrationStats,
): Promise<void> {
  try {
    // Get user mapping
    const user = userMapping.get(log.clerkUserId);

    if (!user) {
      stats.skippedLogs++;
      stats.errors.push({
        logId: log.id.toString(),
        error: `No user mapping found for clerkUserId: ${log.clerkUserId}`,
      });
      return;
    }

    // Insert into new unified schema
    if (isExecute) {
      // TODO: Get orgId from UserOrgMembershipsTable
      // For now, orgId is nullable during migration
      await newDb.insert(newSchema.AuditLogsTable).values({
        workosUserId: user.workosUserId,
        orgId: null, // TODO: Populate from UserOrgMembershipsTable after migration
        action: log.action as any, // Cast to AuditEventAction
        resourceType: log.resourceType as any, // Cast to AuditResourceType
        resourceId: log.resourceId || undefined,
        oldValues: log.oldValues || undefined,
        newValues: log.newValues || undefined,
        ipAddress: log.ipAddress || undefined,
        userAgent: log.userAgent || undefined,
        metadata: null, // Legacy logs don't have metadata
        createdAt: log.createdAt || new Date(), // Preserve original timestamp!
      });
    }

    stats.migratedLogs++;

    if (isVerbose && stats.migratedLogs % 100 === 0) {
      console.log(`  ⏳ Migrated ${stats.migratedLogs} logs...`);
    }
  } catch (error) {
    stats.failedLogs++;
    stats.errors.push({
      logId: log.id.toString(),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Main migration function
 */
async function migrateLogs() {
  console.log('\n🚀 Audit Log Migration: Separate DB → Unified Schema');
  console.log('═══════════════════════════════════════════════════════\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE: No changes will be made\n');
  } else {
    console.log('⚠️  EXECUTE MODE: Changes will be written to database\n');
  }

  const stats: MigrationStats = {
    totalLogs: 0,
    migratedLogs: 0,
    failedLogs: 0,
    skippedLogs: 0,
    errors: [],
  };

  try {
    // Step 1: Get user mapping
    const userMapping = await getUserMapping();

    if (userMapping.size === 0) {
      console.error('❌ Error: No user mappings found');
      console.error('   Make sure users have been migrated to WorkOS first!');
      process.exit(1);
    }

    // Step 2: Fetch all audit logs from legacy DB
    console.log('📋 Fetching audit logs from legacy database...');
    const legacyLogs = await legacyAuditDb.query.auditLogs.findMany({
      orderBy: (logs, { asc }) => [asc(logs.createdAt)],
    });

    stats.totalLogs = legacyLogs.length;
    console.log(`✅ Found ${stats.totalLogs} audit logs to migrate\n`);

    if (stats.totalLogs === 0) {
      console.log('✅ No audit logs to migrate');
      return;
    }

    // Step 3: Migrate logs in batches
    console.log('🔄 Migrating audit logs...');
    const batchSize = 100;

    for (let i = 0; i < legacyLogs.length; i += batchSize) {
      const batch = legacyLogs.slice(i, i + batchSize);

      await Promise.all(batch.map((log) => migrateAuditLog(log, userMapping, stats)));

      if (isVerbose) {
        const progress = Math.min(((i + batchSize) / stats.totalLogs) * 100, 100);
        console.log(`  📊 Progress: ${progress.toFixed(1)}%`);
      }
    }

    // Step 4: Validation
    if (isExecute) {
      console.log('\n🔍 Validating migration...');

      const newLogsCount = await newDb.$count(AuditLogsTable);
      console.log(`  📊 New database audit logs: ${newLogsCount}`);
      console.log(`  📊 Expected count: ${stats.migratedLogs}`);

      if (newLogsCount !== stats.migratedLogs) {
        console.warn('⚠️  Warning: Audit log counts do not match!');
      }
    }

    // Step 5: Print summary
    console.log('\n📊 Migration Summary');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total logs processed:  ${stats.totalLogs}`);
    console.log(`✅ Successfully migrated: ${stats.migratedLogs}`);
    console.log(`⏭️  Skipped (no mapping):  ${stats.skippedLogs}`);
    console.log(`❌ Failed:                ${stats.failedLogs}`);
    console.log('═══════════════════════════════════════════════════════\n');

    if (stats.errors.length > 0) {
      console.log('❌ Errors encountered:');
      stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. Log ID ${error.logId}: ${error.error}`);
      });
      console.log('');
    }

    if (isDryRun) {
      console.log('✅ Dry run complete - no changes made');
      console.log('   Run with --execute to apply changes\n');
    } else {
      console.log('✅ Migration complete!');
      console.log('   Next steps:');
      console.log('   1. Verify audit logs in new database');
      console.log('   2. Test audit logging with new system');
      console.log('   3. Keep legacy audit DB for 6 months as backup');
      console.log('   4. Update environment variables to remove AUDITLOG_DATABASE_URL\n');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrateLogs()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
