/**
 * Backfill Script: Mark existing users as having received welcome email
 *
 * This script sets welcomeEmailSentAt for all existing users to prevent
 * them from receiving duplicate welcome emails after the fix deployment.
 *
 * Run with: pnpm tsx scripts/backfill-welcome-emails.ts
 */
// Load environment variables
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import 'dotenv/config';
import { isNull, sql } from 'drizzle-orm';

async function backfillWelcomeEmails() {
  console.log('🔄 Starting backfill for welcome email tracking...\n');

  try {
    // Step 1: Count users without welcomeEmailSentAt
    const usersWithoutTimestamp = await db
      .select({ count: sql<number>`count(*)` })
      .from(UserTable)
      .where(isNull(UserTable.welcomeEmailSentAt));

    const totalToBackfill = Number(usersWithoutTimestamp[0]?.count || 0);
    console.log(`📊 Found ${totalToBackfill} users without welcome email timestamp\n`);

    if (totalToBackfill === 0) {
      console.log('✅ All users already have welcome email timestamps. Nothing to do!');
      return;
    }

    // Step 2: Show what will be updated
    console.log('📋 Sample of users to be updated:');
    const sampleUsers = await db
      .select({
        clerkUserId: UserTable.clerkUserId,
        email: UserTable.email,
        createdAt: UserTable.createdAt,
        welcomeEmailSentAt: UserTable.welcomeEmailSentAt,
      })
      .from(UserTable)
      .where(isNull(UserTable.welcomeEmailSentAt))
      .limit(5);

    sampleUsers.forEach((user) => {
      console.log(`  - ${user.email} (created: ${user.createdAt?.toISOString().split('T')[0]})`);
    });
    console.log('');

    // Step 3: Backfill existing users (created more than 1 day ago)
    // We assume any user created more than 1 day ago has already been welcomed
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const backfillResult = await db
      .update(UserTable)
      .set({
        welcomeEmailSentAt: sql`${UserTable.createdAt}`,
      })
      .where(sql`${UserTable.createdAt} < ${oneDayAgo} AND ${UserTable.welcomeEmailSentAt} IS NULL`)
      .returning({ clerkUserId: UserTable.clerkUserId });

    const backfilledCount = backfillResult.length;
    console.log(`✅ Successfully backfilled ${backfilledCount} users\n`);

    // Step 4: Handle recent users (created in last 24 hours)
    const recentUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(UserTable)
      .where(
        sql`${UserTable.createdAt} >= ${oneDayAgo} AND ${UserTable.welcomeEmailSentAt} IS NULL`,
      );

    const recentUsersCount = Number(recentUsersResult[0]?.count || 0);

    if (recentUsersCount > 0) {
      console.log(`ℹ️  Note: ${recentUsersCount} user(s) created in last 24 hours`);
      console.log(`   These will receive welcome emails normally through the workflow`);
      console.log('');
    }

    // Step 5: Verify the backfill
    console.log('🔍 Verification:\n');

    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(UserTable);

    const usersWithTimestamp = await db
      .select({ count: sql<number>`count(*)` })
      .from(UserTable)
      .where(sql`${UserTable.welcomeEmailSentAt} IS NOT NULL`);

    const total = Number(totalUsers[0]?.count || 0);
    const withTimestamp = Number(usersWithTimestamp[0]?.count || 0);
    const percentage = total > 0 ? ((withTimestamp / total) * 100).toFixed(2) : '0';

    console.log(`  Total users: ${total}`);
    console.log(`  Users with welcome timestamp: ${withTimestamp} (${percentage}%)`);
    console.log(`  Users without timestamp: ${total - withTimestamp}`);
    console.log('');

    console.log('✅ Backfill completed successfully!\n');
    console.log('📝 Summary:');
    console.log(`  - Backfilled: ${backfilledCount} existing users`);
    console.log(`  - Recent users: ${recentUsersCount} (will get welcome emails normally)`);
    console.log(`  - Coverage: ${percentage}% of all users now have timestamps`);
    console.log('');
    console.log('🎉 All existing users are now protected from duplicate welcome emails!');
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    throw error;
  }
}

// Run the backfill
backfillWelcomeEmails()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
