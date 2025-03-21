#!/usr/bin/env node

/**
 * This script checks if QStash environment variables are properly loaded
 * Run it with: node scripts/check-qstash-env.js
 */

// Load environment variables
require('dotenv').config();

console.log('🔍 Checking QStash environment variables:');
console.log('-----------------------------------------');

// Check QStash token
const token = process.env.QSTASH_TOKEN;
console.log(`QSTASH_TOKEN: ${token ? '✅ Available' : '❌ Missing'}`);
if (token) {
  // Only show first few characters and hide the rest
  const maskedToken = `${token.substring(0, 10)}...${token.substring(token.length - 5)}`;
  console.log(`  Value: ${maskedToken}`);
}

// Check signing keys
const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
console.log(`QSTASH_CURRENT_SIGNING_KEY: ${currentKey ? '✅ Available' : '❌ Missing'}`);
if (currentKey) {
  const maskedKey = `${currentKey.substring(0, 8)}...${currentKey.substring(currentKey.length - 3)}`;
  console.log(`  Value: ${maskedKey}`);
}

const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;
console.log(`QSTASH_NEXT_SIGNING_KEY: ${nextKey ? '✅ Available' : '❌ Missing'}`);
if (nextKey) {
  const maskedKey = `${nextKey.substring(0, 8)}...${nextKey.substring(nextKey.length - 3)}`;
  console.log(`  Value: ${maskedKey}`);
}

// Check URL
const url = process.env.QSTASH_URL;
console.log(`QSTASH_URL: ${url ? '✅ Available' : '⚠️ Optional but missing'}`);
if (url) {
  console.log(`  Value: ${url}`);
}

// Check APP_URL
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
console.log(`NEXT_PUBLIC_APP_URL: ${appUrl ? '✅ Available' : '⚠️ Recommended but missing'}`);
if (appUrl) {
  console.log(`  Value: ${appUrl}`);
}

console.log('-----------------------------------------');
console.log('📋 Environment check summary:');

// Determine if all required variables are present
const allRequiredPresent = token && currentKey && nextKey;
if (allRequiredPresent) {
  console.log('✅ All required QStash environment variables are present!');
} else {
  console.log('❌ Some required QStash environment variables are missing!');
  console.log('   Please check your .env file and make sure it contains:');
  console.log('   - QSTASH_TOKEN');
  console.log('   - QSTASH_CURRENT_SIGNING_KEY');
  console.log('   - QSTASH_NEXT_SIGNING_KEY');
}

// Add to package.json
console.log('\n📌 Add the following to your package.json scripts:');
console.log('   "qstash:check": "node scripts/check-qstash-env.js"');
