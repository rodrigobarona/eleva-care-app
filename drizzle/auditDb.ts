import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as auditSchema from './auditSchema';

// Separate audit log database connection
// Use a placeholder URL during build if AUDITLOG_DATABASE_URL is not set
const auditDatabaseUrl =
  process.env.AUDITLOG_DATABASE_URL ||
  'postgresql://placeholder:placeholder@localhost:5432/placeholder_audit';
const auditSql = neon(auditDatabaseUrl);
export const auditDb = drizzle(auditSql, { schema: auditSchema });
