import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as auditSchema from './auditSchema';

// Separate audit log database connection
const auditSql = neon(process.env.AUDITLOG_DATABASE_URL ?? '');
export const auditDb = drizzle(auditSql, { schema: auditSchema });
