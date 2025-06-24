#!/usr/bin/env node
/**
 * Clean Novu Workflows Script
 *
 * Deletes all existing workflows from Novu Cloud to prepare for a fresh sync
 * USE WITH CAUTION - This will permanently delete all workflows
 */

require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const NOVU_SECRET_KEY = process.env.NOVU_SECRET_KEY;
const NOVU_BASE_URL = process.env.NOVU_BASE_URL || 'https://eu.api.novu.co';

console.log('🧹 Novu Workflow Cleanup Tool\n');

if (!NOVU_SECRET_KEY) {
  console.error('❌ Missing NOVU_SECRET_KEY in environment variables');
  process.exit(1);
}

async function listAllWorkflows() {
  try {
    const response = await fetch(`${NOVU_BASE_URL}/v1/workflows`, {
      method: 'GET',
      headers: {
        Authorization: `ApiKey ${NOVU_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('❌ Failed to fetch workflows:', error.message);
    return [];
  }
}

async function deleteWorkflow(workflowId) {
  try {
    const response = await fetch(`${NOVU_BASE_URL}/v1/workflows/${workflowId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `ApiKey ${NOVU_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Failed to delete workflow ${workflowId}:`, error.message);
    return false;
  }
}

async function cleanAllWorkflows() {
  console.log('🔍 Fetching existing workflows...\n');

  const workflows = await listAllWorkflows();

  if (workflows.length === 0) {
    console.log('✅ No workflows found. Your account is already clean!');
    return;
  }

  console.log(`📋 Found ${workflows.length} workflows to delete:\n`);
  workflows.forEach((workflow, index) => {
    console.log(`   ${index + 1}. ${workflow.name} (${workflow._id})`);
  });

  console.log('\n⚠️  WARNING: This will permanently delete ALL workflows!');
  console.log('⚠️  This action cannot be undone!');
  console.log('\n📝 To proceed, you need to manually confirm...\n');

  // Check if --force flag is provided
  const forceFlag = process.argv.includes('--force');

  if (!forceFlag) {
    console.log('💡 To run the deletion, use: pnpm novu:clean --force');
    console.log('💡 Or manually delete workflows from: https://web.novu.co/workflows');
    return;
  }

  console.log('🚀 Starting deletion process...\n');

  let deleted = 0;
  let failed = 0;

  for (const workflow of workflows) {
    process.stdout.write(`   Deleting "${workflow.name}"... `);

    const success = await deleteWorkflow(workflow._id);

    if (success) {
      console.log('✅ Deleted');
      deleted++;
    } else {
      console.log('❌ Failed');
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log('\n📊 Cleanup Summary:');
  console.log(`   ✅ Successfully deleted: ${deleted} workflows`);
  console.log(`   ❌ Failed to delete: ${failed} workflows`);

  if (deleted > 0) {
    console.log('\n🎉 Cleanup completed! You can now run a fresh sync:');
    console.log('   pnpm novu:sync');
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage:');
  console.log('  pnpm novu:clean        # List workflows (safe preview)');
  console.log('  pnpm novu:clean --force # Actually delete all workflows');
  console.log('  pnpm novu:clean --help  # Show this help');
  process.exit(0);
}

cleanAllWorkflows().catch(console.error);
