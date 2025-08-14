#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');

async function getNgrokUrl() {
  return new Promise((resolve) => {
    exec('curl -s http://localhost:4040/api/tunnels', (error, stdout) => {
      if (error) {
        resolve(null);
      } else {
        try {
          const tunnels = JSON.parse(stdout);
          const publicUrl = tunnels.tunnels?.[0]?.public_url;
          resolve(publicUrl);
        } catch {
          resolve(null);
        }
      }
    });
  });
}

async function syncNovuDev() {
  console.log('🔍 Checking for ngrok tunnel...');

  let ngrokUrl = await getNgrokUrl();

  if (!ngrokUrl) {
    console.log('❌ No ngrok tunnel found.');
    console.log('📋 To use this script, follow these steps:');
    console.log('');
    console.log('1. Terminal 1: Start your dev server');
    console.log('   pnpm run dev');
    console.log('');
    console.log('2. Terminal 2: Start ngrok tunnel');
    console.log('   npx ngrok http 3000');
    console.log('');
    console.log('3. Terminal 3: Run this script again');
    console.log('   pnpm run novu:dev:sync');
    console.log('');
    console.log('Or run the auto version: pnpm run novu:sync:dev:auto');
    process.exit(1);
  }

  console.log(`✅ Found ngrok tunnel: ${ngrokUrl}`);
  console.log('🔄 Syncing Novu workflows...');

  // Set environment variable and run sync
  process.env.NGROK_URL = ngrokUrl;

  const syncCommand = spawn(
    'bash',
    [
      '-c',
      `source .env && npx novu@latest sync --bridge-url "${ngrokUrl}/api/novu" --secret-key "$NOVU_SECRET_KEY" --api-url "$NOVU_BASE_URL"`,
    ],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
    },
  );

  syncCommand.on('close', (code) => {
    if (code === 0) {
      console.log('🎉 Novu workflows synced successfully!');
    } else {
      console.log('❌ Sync failed with exit code:', code);
    }
    process.exit(code);
  });

  syncCommand.on('error', (error) => {
    console.error('❌ Error running sync:', error.message);
    process.exit(1);
  });
}

if (require.main === module) {
  syncNovuDev();
}

module.exports = { syncNovuDev, getNgrokUrl };
