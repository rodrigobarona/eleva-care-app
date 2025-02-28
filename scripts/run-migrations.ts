// Load environment variables first
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

// Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigrations() {
  console.log('Running migrations...');

  try {
    // Create a direct postgres connection
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    const client = postgres(connectionString);

    // Try to run enum fix script if it exists
    const fixScriptPath = path.join(process.cwd(), 'drizzle/migrations/fix-day-enum.sql');

    if (fs.existsSync(fixScriptPath)) {
      console.log('Applying enum fix...');
      const fixScript = fs.readFileSync(fixScriptPath, 'utf8');

      try {
        // Execute the fix script directly
        await client.unsafe(fixScript);
        console.log('Enum fix applied successfully.');
      } catch {
        // Ignore error if enum already exists
        console.log('Enum already exists, continuing with migrations...');
      }
    } else {
      console.log('Skipping enum fix (file not found)');
    }

    // Run our schema alignment migration
    const alignScriptPath = path.join(process.cwd(), 'drizzle/migrations/align-schema-with-db.sql');

    if (fs.existsSync(alignScriptPath)) {
      console.log('Applying schema alignment migration...');
      const alignScript = fs.readFileSync(alignScriptPath, 'utf8');

      try {
        // Execute the alignment script
        await client.unsafe(alignScript);
        console.log('Schema alignment migration applied successfully.');
      } catch (alignError) {
        console.error('Error applying schema alignment:', alignError);
        throw alignError;
      }
    }

    // Get all migration files except the initial one that creates the enum
    const migrationsFolder = path.join(process.cwd(), 'drizzle/migrations');
    const migrationFiles = fs
      .readdirSync(migrationsFolder)
      .filter(
        (file) =>
          file.endsWith('.sql') &&
          !file.startsWith('0000_') && // Skip the initial migration
          file !== 'fix-day-enum.sql' && // Skip our fix script
          file !== 'align-schema-with-db.sql', // Skip our alignment script
      )
      .sort();

    console.log(`Found ${migrationFiles.length} migrations to apply:`, migrationFiles);

    // Apply each migration manually
    for (const file of migrationFiles) {
      console.log(`Applying migration: ${file}`);
      const migrationContent = fs.readFileSync(path.join(migrationsFolder, file), 'utf8');

      try {
        await client.unsafe(migrationContent);
        console.log(`Successfully applied: ${file}`);
      } catch (error) {
        console.error(`Error applying migration ${file}:`, error);
        throw error;
      }
    }

    console.log('Migrations completed successfully!');

    // Close the connection
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();
