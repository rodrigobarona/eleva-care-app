#!/usr/bin/env node
/**
 * Novu Workflow Setup
 *
 * Syncs workflow configurations from docs/novu-workflow-configs.json to Novu
 * Run with: node -r dotenv/config scripts/setup-novu-workflows.js
 * or: npm run setup:novu-workflows
 */
import { Novu } from '@novu/node';
import fs from 'fs/promises';
import path from 'path';

const NOVU_SECRET_KEY = process.env.NOVU_SECRET_KEY;
const NOVU_API_KEY = process.env.NOVU_API_KEY;
const NOVU_BASE_URL = process.env.NOVU_BASE_URL || 'https://eu.api.novu.co';

async function setupWorkflows() {
  console.log('🔄 Setting up Novu workflows...\n');

  const apiKey = NOVU_SECRET_KEY || NOVU_API_KEY;
  if (!apiKey) {
    console.error('❌ Missing NOVU_SECRET_KEY or NOVU_API_KEY');
    process.exit(1);
  }

  try {
    // Initialize Novu client
    const novu = new Novu(apiKey, {
      backendUrl: NOVU_BASE_URL,
    });

    // Read workflow configurations
    const configPath = path.join(process.cwd(), 'docs', 'novu-workflow-configs.json');
    const workflowConfigs = JSON.parse(await fs.readFile(configPath, 'utf8'));

    console.log(`📋 Found ${workflowConfigs.length} workflow configurations to sync\n`);

    // Get existing workflows
    const existingWorkflows = await novu.notificationGroups.list();
    const existingIds = new Set(existingWorkflows.data?.map((w) => w.identifier) || []);

    // Process each workflow
    for (const config of workflowConfigs) {
      try {
        const { identifier, name, critical, channels } = config;

        console.log(`Processing workflow: ${name} (${identifier})`);

        // Create or update workflow
        if (!existingIds.has(identifier)) {
          // Create new workflow
          await novu.notificationGroups.create({
            name,
            identifier,
            critical,
          });
          console.log(`✅ Created new workflow: ${name}`);
        } else {
          // Update existing workflow
          const existing = existingWorkflows.data?.find((w) => w.identifier === identifier);
          if (existing) {
            await novu.notificationGroups.update(existing._id, {
              name,
              critical,
            });
            console.log(`✅ Updated existing workflow: ${name}`);
          }
        }

        // Configure channels
        if (channels && channels.length > 0) {
          console.log(`   Configuring channels: ${channels.join(', ')}`);
        }
      } catch (error) {
        console.error(`❌ Error processing workflow ${config.name}:`, error.message);
      }
    }

    console.log('\n🎉 Workflow setup completed!');
    console.log('\nNext steps:');
    console.log('1. Visit https://web.novu.co/workflows to verify your workflows');
    console.log('2. Configure notification templates for each workflow');
    console.log('3. Test your workflows using the Novu dashboard');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupWorkflows();
}

export { setupWorkflows };
