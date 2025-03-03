import { addProfilePublishedStatus } from '../drizzle/migrations/add-profile-published-status';

/**
 * Script to rename the isPublished column to published in the profiles table
 */
async function main() {
  console.log('Starting profile published field migration...');

  try {
    const result = await addProfilePublishedStatus();

    if (result.success) {
      console.log('✅ Successfully renamed profile published field');
    } else {
      console.error('❌ Failed to rename profile published field:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error during migration:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
