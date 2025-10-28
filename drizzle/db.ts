import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

// Main database connection for core data (events, schedules, etc.)
// Use a placeholder URL during build if DATABASE_URL is not set
const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
