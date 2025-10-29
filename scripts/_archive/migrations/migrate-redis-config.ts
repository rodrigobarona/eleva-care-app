#!/usr/bin/env tsx
/**
 * Migration script for Redis environment variables
 * Helps migrate from legacy KV_REST_API_* to unified UPSTASH_REDIS_* variables
 *
 * Note: Legacy variables have been removed from the codebase, but this script
 * remains useful for users upgrading who still have legacy .env files.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Color console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

interface EnvFile {
  path: string;
  content: string;
  lines: string[];
}

class RedisMigrator {
  private envFiles: EnvFile[] = [];
  private foundLegacyVars = false;
  private foundUnifiedVars = false;

  constructor() {
    this.loadEnvFiles();
  }

  private loadEnvFiles() {
    const envFilePaths = [
      '.env',
      '.env.local',
      '.env.development',
      '.env.production',
      '.env.example',
    ];

    for (const filePath of envFilePaths) {
      const fullPath = join(process.cwd(), filePath);
      if (existsSync(fullPath)) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          this.envFiles.push({
            path: filePath,
            content,
            lines,
          });
          logInfo(`Found env file: ${filePath}`);
        } catch (error) {
          logWarning(`Could not read ${filePath}: ${error}`);
        }
      }
    }

    if (this.envFiles.length === 0) {
      logWarning('No .env files found in the current directory');
    }
  }

  private analyzeEnvFiles() {
    logInfo('Analyzing environment files...');

    for (const envFile of this.envFiles) {
      logInfo(`\nAnalyzing ${envFile.path}:`);

      const legacyVars = envFile.lines.filter(
        (line) => line.includes('KV_REST_API_URL') || line.includes('KV_REST_API_TOKEN'),
      );

      const unifiedVars = envFile.lines.filter(
        (line) =>
          line.includes('UPSTASH_REDIS_REST_URL') || line.includes('UPSTASH_REDIS_REST_TOKEN'),
      );

      if (legacyVars.length > 0) {
        this.foundLegacyVars = true;
        log(`  📦 Legacy variables found:`, colors.yellow);
        legacyVars.forEach((line) => log(`    ${line.trim()}`));
      }

      if (unifiedVars.length > 0) {
        this.foundUnifiedVars = true;
        log(`  🆕 Unified variables found:`, colors.green);
        unifiedVars.forEach((line) => log(`    ${line.trim()}`));
      }

      if (legacyVars.length === 0 && unifiedVars.length === 0) {
        log(`  ✨ No Redis variables found`);
      }
    }
  }

  private performMigration(dryRun: boolean = true) {
    if (!this.foundLegacyVars) {
      if (this.foundUnifiedVars) {
        logSuccess('Already using unified Redis configuration! No migration needed.');
      } else {
        logInfo(
          'No Redis configuration found. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN when ready.',
        );
      }
      return;
    }

    logInfo(
      `\n${dryRun ? '🔍 DRY RUN:' : '🚀 MIGRATING:'} Converting legacy to unified Redis variables...`,
    );

    for (const envFile of this.envFiles) {
      const originalLines = [...envFile.lines];
      const newLines: string[] = [];
      let modified = false;

      for (const line of originalLines) {
        if (line.includes('KV_REST_API_URL=')) {
          const newLine = line.replace('KV_REST_API_URL=', 'UPSTASH_REDIS_REST_URL=');
          newLines.push(newLine);

          // Comment out the old line
          newLines.push(`# DEPRECATED: ${line.trim()}`);

          modified = true;
          log(`    ${line.trim()} → ${newLine.trim()}`, colors.yellow);
        } else if (line.includes('KV_REST_API_TOKEN=')) {
          const newLine = line.replace('KV_REST_API_TOKEN=', 'UPSTASH_REDIS_REST_TOKEN=');
          newLines.push(newLine);

          // Comment out the old line
          newLines.push(`# DEPRECATED: ${line.trim()}`);

          modified = true;
          log(`    ${line.trim()} → ${newLine.trim()}`, colors.yellow);
        } else if (line.includes('KV_REST_API_READ_ONLY_TOKEN=')) {
          // This token is no longer needed in unified config
          newLines.push(`# DEPRECATED (no longer needed): ${line.trim()}`);
          modified = true;
          log(`    ${line.trim()} → DEPRECATED (no longer needed)`, colors.yellow);
        } else {
          newLines.push(line);
        }
      }

      if (modified) {
        const newContent = newLines.join('\n');

        if (!dryRun) {
          try {
            writeFileSync(join(process.cwd(), envFile.path), newContent);
            logSuccess(`Updated ${envFile.path}`);
          } catch (error) {
            logError(`Failed to update ${envFile.path}: ${error}`);
          }
        } else {
          logInfo(`Would update ${envFile.path}`);
        }
      }
    }
  }

  public run() {
    log(`${colors.bold}🔄 Redis Configuration Migration Tool${colors.reset}\n`);

    this.analyzeEnvFiles();

    if (this.foundLegacyVars) {
      logWarning('\n📋 Migration Summary:');
      log('  • KV_REST_API_URL → UPSTASH_REDIS_REST_URL');
      log('  • KV_REST_API_TOKEN → UPSTASH_REDIS_REST_TOKEN');
      log('  • KV_REST_API_READ_ONLY_TOKEN → DEPRECATED (removed)');

      logInfo('\n🔍 Running dry run first...');
      this.performMigration(true);

      logInfo('\n🤔 Ready to perform actual migration?');
      logInfo('Run with --apply flag to perform the migration:');
      log(`${colors.bold}npm run migrate-redis --apply${colors.reset}`);

      if (process.argv.includes('--apply')) {
        logInfo('\n🚀 Performing actual migration...');
        this.performMigration(false);

        logSuccess('\n✅ Migration completed!');
        logInfo('\nNext steps:');
        log('1. Update your production environment variables');
        log('2. Verify the application still works correctly');
        log('3. Remove the commented DEPRECATED lines when ready');
      }
    }

    logInfo('\n📚 For more information, see: docs/redis-unified-implementation.md');
  }
}

// Run the migration
const migrator = new RedisMigrator();
migrator.run();
