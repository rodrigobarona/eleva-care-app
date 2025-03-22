#!/usr/bin/env node
/**
 * This script tests the QStash connection by sending a test message
 * Run it with: node scripts/test-qstash-connection.js
 */
// Load environment variables
// Import QStash client
import { Client } from '@upstash/qstash';
import dotenv from 'dotenv';

dotenv.config();

// Make sure QStash token is available
if (!process.env.QSTASH_TOKEN) {
  console.error('❌ QSTASH_TOKEN environment variable is not set.');
  console.error('Run npm run qstash:env to set up QStash environment variables.');
  process.exit(1);
}

// Create a QStash client
const client = new Client({
  token: process.env.QSTASH_TOKEN,
});

console.log('🔌 Testing QStash connection...');

// Try to list QStash schedules
async function testConnection() {
  try {
    console.log('Fetching QStash schedules...');
    const schedules = await client.schedules.list();

    console.log('✅ Successfully connected to QStash!');
    console.log(`Found ${schedules.length} schedules:`);

    if (schedules.length > 0) {
      schedules.forEach((schedule, index) => {
        console.log(`${index + 1}. ID: ${schedule.id || schedule.scheduleId}`);
        console.log(`   Destination: ${schedule.url || schedule.destination}`);
        console.log(`   Schedule: ${schedule.cron || schedule.interval}`);
      });
    } else {
      console.log('No schedules found. You can create them with npm run qstash:update');
    }

    // Try to send a test message
    console.log('\n📨 Sending test message to QStash...');

    // Use health endpoint or another simple endpoint that exists
    const destination = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL.split(',')[0]}/api/healthcheck`
      : 'https://eleva.care/api/healthcheck';

    const result = await client.publishJSON({
      url: destination,
      body: {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'test-qstash-connection.js',
      },
    });

    console.log('✅ Test message sent successfully!');
    console.log(`Message ID: ${result.messageId}`);
    console.log(`Destination: ${destination}`);

    console.log('\n🎉 QStash is properly configured and working!');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to QStash:', error.message);
    if (error.message.includes('unauthorized')) {
      console.error('This is likely due to an invalid QStash token.');
      console.error('Please check your QSTASH_TOKEN environment variable.');
    }
    return false;
  }
}

// Run the test
testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
