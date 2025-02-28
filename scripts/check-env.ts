// Load environment variables 
import 'dotenv/config';

console.log('Checking environment variables...');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
// Print the first few characters if it exists (for security)
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 15) + '...');
}

// Print list of all env variables (without values for security)
console.log('\nAll environment variables:');
Object.keys(process.env).forEach(key => {
  console.log(`- ${key}`);
}); 