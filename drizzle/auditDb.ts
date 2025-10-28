import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as auditSchema from './auditSchema';

/**
 * Validates and retrieves the audit database URL.
 * In production, this MUST be set to a valid Neon database URL.
 * In development/test, a placeholder is allowed.
 */
function getAuditDatabaseUrl(): string {
  const url = process.env.AUDITLOG_DATABASE_URL;
  const nodeEnv = process.env.NODE_ENV;
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

  // During build phase, allow placeholder (we don't actually connect to DB during build)
  if (isBuildPhase) {
    return url || 'postgresql://placeholder:placeholder@localhost:5432/placeholder_audit';
  }

  // In production runtime, the audit database URL MUST be configured
  if (nodeEnv === 'production') {
    if (!url) {
      throw new Error(
        'FATAL: AUDITLOG_DATABASE_URL is required in production environment. ' +
          'Audit logging is critical for compliance and security. ' +
          'Please configure AUDITLOG_DATABASE_URL in your environment variables.',
      );
    }
    if (url.includes('placeholder') || url.includes('localhost')) {
      throw new Error(
        'FATAL: AUDITLOG_DATABASE_URL contains a placeholder or localhost value in production. ' +
          'This is not allowed. Please configure a valid Neon database URL.',
      );
    }
  }

  // In non-production, allow placeholder for build/test environments
  return url || 'postgresql://placeholder:placeholder@localhost:5432/placeholder_audit';
}

// Separate audit log database connection
const auditDatabaseUrl = getAuditDatabaseUrl();
const auditSql = neon(auditDatabaseUrl);
export const auditDb = drizzle(auditSql, { schema: auditSchema });
