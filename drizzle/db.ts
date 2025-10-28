import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

/**
 * Validates and retrieves the main database URL.
 * In production, this MUST be set to a valid Neon database URL.
 * In development/test, a placeholder is allowed for build-time operations.
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  const nodeEnv = process.env.NODE_ENV;
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

  // During build phase, allow placeholder (we don't actually connect to DB during build)
  if (isBuildPhase) {
    return url || 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
  }

  // In production runtime, the database URL MUST be configured
  if (nodeEnv === 'production') {
    if (!url) {
      throw new Error(
        'FATAL: DATABASE_URL is required in production environment. ' +
          'This is the main database for all core application data (events, schedules, profiles, etc.). ' +
          'Please configure DATABASE_URL in your environment variables.',
      );
    }
    if (url.includes('placeholder') || url.includes('localhost')) {
      throw new Error(
        'FATAL: DATABASE_URL contains a placeholder or localhost value in production. ' +
          'This is not allowed. Please configure a valid Neon database URL.',
      );
    }
  }

  // In non-production, allow placeholder for build/test environments
  return url || 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
}

// Main database connection for core data (events, schedules, etc.)
const databaseUrl = getDatabaseUrl();
const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
