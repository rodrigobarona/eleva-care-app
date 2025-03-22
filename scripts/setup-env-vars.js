#!/usr/bin/env node
/**
 * This script helps set up environment variables for QStash
 * Run it with: node scripts/setup-env-vars.js
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Target environment files
const rootDir = path.resolve(__dirname, '..');
const envFile = path.join(rootDir, '.env');
const envLocalFile = path.join(rootDir, '.env.local');

console.log('=============================================');
console.log('QSTASH ENVIRONMENT SETUP UTILITY');
console.log('=============================================');
console.log('\nThis utility will help you set up the required environment variables for QStash.');

/**
 * Prompt user for input with a question
 * @param {string} question
 * @returns {Promise<string>}
 */
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Get an environment variable from existing env files or prompt user
 * @param {string} varName Name of the environment variable
 * @param {string} description Description of the variable
 * @param {boolean} required Whether the variable is required
 * @returns {Promise<string|null>}
 */
async function getOrPromptEnvVar(varName, description, required = true) {
  // First check if it's already in the environment
  if (process.env[varName]) {
    console.log(`✅ ${varName} is already set in the environment`);
    return process.env[varName];
  }

  // Try to read from .env files
  let existingValue = null;

  // Check .env file
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    const match = new RegExp(`${varName}=(.*)`, 'i').exec(envContent);
    if (match && match[1]) {
      existingValue = match[1].trim();
      console.log(`✅ Found ${varName} in .env file`);
    }
  }

  // Check .env.local file
  if (!existingValue && fs.existsSync(envLocalFile)) {
    const envLocalContent = fs.readFileSync(envLocalFile, 'utf8');
    const match = new RegExp(`${varName}=(.*)`, 'i').exec(envLocalContent);
    if (match && match[1]) {
      existingValue = match[1].trim();
      console.log(`✅ Found ${varName} in .env.local file`);
    }
  }

  // If still not found and required, prompt user
  if (!existingValue && required) {
    console.log(`\n${description}`);
    existingValue = await prompt(`Enter ${varName}: `);

    if (!existingValue && required) {
      console.log(`❌ ${varName} is required and cannot be empty`);
      return getOrPromptEnvVar(varName, description, required);
    }
  }

  return existingValue;
}

/**
 * Write environment variables to .env.local file
 * @param {Object} variables Object with variable names and values
 */
function writeEnvLocalFile(variables) {
  let content = '';

  // If file already exists, read it first
  if (fs.existsSync(envLocalFile)) {
    content = fs.readFileSync(envLocalFile, 'utf8');
  }

  // Update or add each variable
  for (const [name, value] of Object.entries(variables)) {
    if (!value) continue;

    // Check if variable already exists in the file
    const regex = new RegExp(`^${name}=.*`, 'm');
    if (regex.test(content)) {
      // Replace existing variable
      content = content.replace(regex, `${name}=${value}`);
    } else {
      // Add new variable
      content += `\n${name}=${value}`;
    }
  }

  // Write to file
  fs.writeFileSync(envLocalFile, content.trim() + '\n');
  console.log(`✅ Updated ${envLocalFile} with QStash environment variables`);
}

/**
 * Main function
 */
async function main() {
  try {
    // Collect QStash environment variables
    const qstashToken = await getOrPromptEnvVar(
      'QSTASH_TOKEN',
      'QStash Token is required for sending messages. You can find it in your Upstash QStash dashboard.',
    );

    const qstashCurrentSigningKey = await getOrPromptEnvVar(
      'QSTASH_CURRENT_SIGNING_KEY',
      'QStash Current Signing Key is required for verifying incoming messages. You can find it in your Upstash QStash dashboard.',
    );

    const qstashNextSigningKey = await getOrPromptEnvVar(
      'QSTASH_NEXT_SIGNING_KEY',
      'QStash Next Signing Key is required for verifying incoming messages. You can find it in your Upstash QStash dashboard.',
    );

    // Optional QStash URL
    const qstashUrl = await getOrPromptEnvVar(
      'QSTASH_URL',
      'QStash URL is the endpoint for the QStash API.',
      false,
    );

    // Write variables to .env.local
    const variables = {
      QSTASH_TOKEN: qstashToken,
      QSTASH_CURRENT_SIGNING_KEY: qstashCurrentSigningKey,
      QSTASH_NEXT_SIGNING_KEY: qstashNextSigningKey,
    };

    // Only add URL if provided
    if (qstashUrl) {
      variables.QSTASH_URL = qstashUrl;
    }

    writeEnvLocalFile(variables);

    console.log('\n=============================================');
    console.log('✅ QStash environment setup complete!');
    console.log('=============================================');
    console.log('\nYou can now run the following commands:');
    console.log('- npm run qstash:check - Verify QStash environment variables');
    console.log('- npm run qstash:update - Update QStash schedules');
    console.log('=============================================');
  } catch (error) {
    console.error('❌ Error setting up QStash environment:', error);
  } finally {
    rl.close();
  }
}

// Run main function
main();
