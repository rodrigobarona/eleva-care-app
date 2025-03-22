#!/usr/bin/env node
/**
 * This script debugs environment variable loading issues
 * Run it with: node scripts/debug-env-loading.js
 */
// Import required packages
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

console.log('=============================================');
console.log('ENVIRONMENT VARIABLE LOADING DEBUG TOOL');
console.log('=============================================');

// Check different loading methods
console.log('\n1. CHECKING RAW ENVIRONMENT VARIABLES:');
console.log('-----------------------------------------');
console.log('QSTASH_TOKEN exists:', !!process.env.QSTASH_TOKEN);
console.log('QSTASH_CURRENT_SIGNING_KEY exists:', !!process.env.QSTASH_CURRENT_SIGNING_KEY);
console.log('QSTASH_NEXT_SIGNING_KEY exists:', !!process.env.QSTASH_NEXT_SIGNING_KEY);

// Try loading with dotenv
console.log('\n2. LOADING WITH DOTENV:');
console.log('-----------------------------------------');
try {
  const result = dotenv.config();

  if (result.error) {
    console.log('❌ Error loading .env file:', result.error.message);
    console.log('   Full error:', result.error);
  } else {
    console.log('✅ Dotenv loaded successfully');
    console.log(
      `Loaded from: ${result.parsed ? `${Object.keys(result.parsed).length} variables` : 'No variables found'}`,
    );

    // Check again after loading
    console.log('QSTASH_TOKEN exists after dotenv:', !!process.env.QSTASH_TOKEN);
    console.log(
      'QSTASH_CURRENT_SIGNING_KEY exists after dotenv:',
      !!process.env.QSTASH_CURRENT_SIGNING_KEY,
    );
    console.log(
      'QSTASH_NEXT_SIGNING_KEY exists after dotenv:',
      !!process.env.QSTASH_NEXT_SIGNING_KEY,
    );
  }
} catch (error) {
  console.log('❌ Exception loading dotenv:', error.message);
}

// Try loading with dotenv and specific path
console.log('\n3. LOADING WITH SPECIFIC ENV FILE PATH:');
console.log('-----------------------------------------');

// Check if .env file exists
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists at:', envPath);

  try {
    // Read the file directly to check content (without revealing secrets)
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    // Check if specific variables exist in the file
    const hasQstashToken = lines.some((line) => line.trim().startsWith('QSTASH_TOKEN='));
    const hasCurrentKey = lines.some((line) =>
      line.trim().startsWith('QSTASH_CURRENT_SIGNING_KEY='),
    );
    const hasNextKey = lines.some((line) => line.trim().startsWith('QSTASH_NEXT_SIGNING_KEY='));

    console.log('QSTASH_TOKEN defined in .env file:', hasQstashToken);
    console.log('QSTASH_CURRENT_SIGNING_KEY defined in .env file:', hasCurrentKey);
    console.log('QSTASH_NEXT_SIGNING_KEY defined in .env file:', hasNextKey);

    // Attempt to load using specific path
    const result = dotenv.config({ path: envPath });

    if (result.error) {
      console.log('❌ Error loading specific .env file:', result.error.message);
    } else {
      console.log('✅ Specific .env file loaded successfully');

      // Check again after loading specific file
      console.log('QSTASH_TOKEN exists after specific load:', !!process.env.QSTASH_TOKEN);
      console.log(
        'QSTASH_CURRENT_SIGNING_KEY exists after specific load:',
        !!process.env.QSTASH_CURRENT_SIGNING_KEY,
      );
      console.log(
        'QSTASH_NEXT_SIGNING_KEY exists after specific load:',
        !!process.env.QSTASH_NEXT_SIGNING_KEY,
      );
    }
  } catch (error) {
    console.log('❌ Error reading or parsing .env file:', error.message);
  }
} else {
  console.log('❌ .env file NOT found at:', envPath);

  // Check for other potential env files
  const envFiles = ['.env.local', '.env.development', '.env.production'];
  for (const file of envFiles) {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ Found alternative env file: ${file}`);
    }
  }
}

// Check for environment differences
console.log('\n4. ENVIRONMENT INFO:');
console.log('-----------------------------------------');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current working directory:', process.cwd());
console.log('Script directory:', __dirname);
console.log('Is running in production mode:', process.env.NODE_ENV === 'production');
console.log('Is running in development mode:', process.env.NODE_ENV === 'development');
console.log('Is running in test mode:', process.env.NODE_ENV === 'test');

// Provide some suggestions
console.log('\n=============================================');
console.log('RECOMMENDATIONS:');
console.log('=============================================');
console.log('1. Make sure your .env file is in the root directory of your project');
console.log(
  '2. Ensure the variable names match exactly: QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY',
);
console.log('3. Check for any whitespace issues in your .env file');
console.log(
  '4. For production deployment, set these variables in your deployment environment (Vercel, etc.)',
);
console.log('5. Run the following command to check environment variables:');
console.log('   npm run qstash:check');
console.log('=============================================');
