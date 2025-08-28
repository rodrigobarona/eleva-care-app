#!/usr/bin/env node

/**
 * Test script for OG image generation
 * Run with: node scripts/test-og-images.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const testUrls = [
  // Profile image test
  `${BASE_URL}/api/og/image?type=profile&name=Dr.%20Sarah%20Johnson&username=sarah-johnson&headline=Women's%20Health%20Specialist&specialties=Pregnancy%20Care&specialties=Postpartum%20Support`,

  // Generic image test
  `${BASE_URL}/api/og/image?type=generic&title=About%20Eleva%20Care&description=Expert%20Healthcare%20for%20Women%20-%20Comprehensive%20care%20throughout%20your%20journey&variant=secondary`,

  // Event image test
  `${BASE_URL}/api/og/image?type=event&title=Pregnancy%20Consultation&expertName=Dr.%20Sarah%20Johnson&duration=45%20minutes&price=$150`,
];

console.log('🎨 Testing OG Image Generation');
console.log('================================\n');

console.log('Test these URLs in your browser after starting the dev server:\n');

testUrls.forEach((url, index) => {
  const type = url.includes('type=profile')
    ? 'Profile'
    : url.includes('type=generic')
      ? 'Generic'
      : 'Event';

  console.log(`${index + 1}. ${type} Image:`);
  console.log(`   ${url}\n`);
});

console.log('💡 Tips:');
console.log('- Start your dev server: pnpm dev');
console.log('- Open the URLs above in your browser');
console.log('- Images should generate dynamically with Eleva Care branding');
console.log('- Check the Network tab to see caching headers');
console.log('- Images are cached for 1 hour with stale-while-revalidate for 24 hours\n');

console.log('🔧 Debugging:');
console.log('- Check console for any font loading errors');
console.log('- Verify all logo files exist in /public/');
console.log('- Test different parameters to see dynamic generation');
