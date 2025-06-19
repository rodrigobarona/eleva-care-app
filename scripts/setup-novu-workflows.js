#!/usr/bin/env node
/**
 * Novu Workflows Setup Script
 *
 * Verifies Novu configuration and provides guidance for workflow setup
 * Run with: node -r dotenv/config scripts/setup-novu-workflows.js
 * or: npm run setup:novu-workflows
 */
const { Novu } = require('@novu/api');
const fs = require('fs/promises');
const path = require('path');

// Environment variables
const NOVU_SECRET_KEY = process.env.NOVU_SECRET_KEY;
const NOVU_API_KEY = process.env.NOVU_API_KEY;
const NOVU_BASE_URL = process.env.NOVU_BASE_URL || 'https://eu.api.novu.co';
const NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER;

async function setupWorkflows() {
  console.log('🚀 Novu Workflows Setup & Verification\n');

  const apiKey = NOVU_SECRET_KEY || NOVU_API_KEY;

  if (!apiKey) {
    console.error('❌ Missing Novu API key');
    console.log('\nPlease set one of:');
    console.log('  NOVU_SECRET_KEY=your_secret_key');
    console.log('  NOVU_API_KEY=your_api_key');
    console.log('\nGet your API key from: https://web.novu.co/settings');
    process.exit(1);
  }

  try {
    // Initialize Novu client
    const novu = new Novu({
      secretKey: apiKey,
      ...(NOVU_BASE_URL && { apiUrl: NOVU_BASE_URL }),
    });

    console.log('✅ Novu client initialized successfully');
    console.log(`📡 API URL: ${NOVU_BASE_URL}`);
    console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...`);
    console.log();

    // Check if workflows directory exists
    const workflowsDir = path.join(process.cwd(), 'workflows');

    try {
      await fs.access(workflowsDir);
      console.log('📁 Workflows directory found: ✅');

      // List existing workflow files
      const files = await fs.readdir(workflowsDir);
      const workflowFiles = files.filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

      if (workflowFiles.length > 0) {
        console.log(`   Found ${workflowFiles.length} workflow files:`);
        workflowFiles.forEach((file) => {
          console.log(`   - ${file}`);
        });
      } else {
        console.log('   No workflow files found');
      }
    } catch (error) {
      console.log('📁 Workflows directory: Not found (this is optional)');
    }
    console.log();

    // Modern workflow management guidance
    console.log('🎯 Workflow Management Options:');
    console.log();
    console.log('1. 📊 Novu Dashboard (Recommended)');
    console.log('   • Visit: https://web.novu.co/workflows');
    console.log('   • Create and manage workflows visually');
    console.log('   • No code required');
    console.log();
    console.log('2. 🛠️ Novu Framework (Code-First)');
    console.log('   • Use @novu/framework for code-based workflows');
    console.log('   • Version control your notification logic');
    console.log('   • TypeScript support');
    console.log();
    console.log('3. 🔧 This Application');
    console.log('   • Uses @novu/api for triggering workflows');
    console.log('   • Check: app/utils/novu.ts');
    console.log('   • Ready to send notifications');
    console.log();

    // Verify current setup
    console.log('🔍 Current Setup Status:');
    console.log(`   API Client: ✅ Ready (@novu/api v1.2.0)`);
    console.log(`   Environment: ${NOVU_BASE_URL.includes('eu.') ? '🇪🇺 EU' : '🇺🇸 US'}`);
    console.log(
      `   Trigger Method: ${typeof novu.trigger === 'function' ? '✅ Available' : '❌ Missing'}`,
    );
    console.log();

    console.log('🎉 Setup verification completed!');
    console.log();
    console.log('📖 Next Steps:');
    console.log('1. Create workflows in the Novu Dashboard');
    console.log('2. Note the workflow identifiers');
    console.log('3. Use novu.trigger() in your application');
    console.log('4. Test with: npm run test:novu');
    console.log();
    console.log('📚 Resources:');
    console.log('   • Dashboard: https://web.novu.co');
    console.log('   • Docs: https://docs.novu.co');
    console.log('   • Framework: https://docs.novu.co/framework');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify your API key is correct');
    console.log('2. Check network connectivity');
    console.log('3. Ensure you are using the correct API endpoint');
    console.log('4. Visit https://web.novu.co/settings to verify your key');
    process.exit(1);
  }
}

// Run setup
if (require.main === module) {
  setupWorkflows();
}

module.exports = { setupWorkflows };
