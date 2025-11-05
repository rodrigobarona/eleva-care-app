/**
 * Setup Test Expert User
 *
 * Sets up rbarona@hey.com as a top expert with complete onboarding
 *
 * Usage: pnpm tsx scripts/setup-test-expert.ts
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';

import { db } from '../drizzle/db';
import {
  ExpertSetupTable,
  UserOrgMembershipsTable,
  UserPreferencesTable,
  UsersTable,
} from '../drizzle/schema-workos';

const TEST_EMAIL = 'rbarona@hey.com';

async function setupTestExpert() {
  console.log('🚀 Setting up test expert user...\n');

  try {
    // 1. Find user
    console.log(`1. Looking up user: ${TEST_EMAIL}`);
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.email, TEST_EMAIL),
    });

    if (!user) {
      console.error(`❌ User not found with email: ${TEST_EMAIL}`);
      console.error('   Please ensure the user exists in the database first.');
      process.exit(1);
    }

    console.log(`   ✅ Found user: ${user.firstName} ${user.lastName}`);
    console.log(`   WorkOS User ID: ${user.workosUserId}`);
    console.log(`   Current role: ${user.role}\n`);

    // 2. Update user role to expert_top
    console.log('2. Updating user role to expert_top...');
    await db
      .update(UsersTable)
      .set({
        role: 'expert_top',
        updatedAt: new Date(),
      })
      .where(eq(UsersTable.workosUserId, user.workosUserId));

    console.log('   ✅ Role updated to expert_top\n');

    // 3. Get user's organization
    console.log('3. Getting user organization...');
    const membership = await db.query.UserOrgMembershipsTable.findFirst({
      where: eq(UserOrgMembershipsTable.workosUserId, user.workosUserId),
    });

    if (!membership) {
      console.warn('   ⚠️  No organization membership found');
      console.warn('   Creating records without org_id');
    } else {
      console.log(`   ✅ Organization ID: ${membership.orgId}\n`);
    }

    // 4. Create/update expert setup
    console.log('4. Setting up expert onboarding (all steps complete)...');

    // Check if setup exists
    const existingSetup = await db.query.ExpertSetupTable.findFirst({
      where: eq(ExpertSetupTable.workosUserId, user.workosUserId),
    });

    if (existingSetup) {
      console.log('   Updating existing setup record...');
      await db
        .update(ExpertSetupTable)
        .set({
          profileCompleted: true,
          availabilityCompleted: true,
          eventsCompleted: true,
          identityCompleted: true,
          paymentCompleted: true,
          googleAccountCompleted: true,
          setupComplete: true,
          setupCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ExpertSetupTable.workosUserId, user.workosUserId));
    } else {
      console.log('   Creating new setup record...');
      await db.insert(ExpertSetupTable).values({
        workosUserId: user.workosUserId,
        orgId: membership?.orgId || null,
        profileCompleted: true,
        availabilityCompleted: true,
        eventsCompleted: true,
        identityCompleted: true,
        paymentCompleted: true,
        googleAccountCompleted: true,
        setupComplete: true,
        setupCompletedAt: new Date(),
      });
    }

    console.log('   ✅ All onboarding steps marked complete\n');

    // 5. Create/update user preferences
    console.log('5. Setting up user preferences...');

    // Check if preferences exist
    const existingPrefs = await db.query.UserPreferencesTable.findFirst({
      where: eq(UserPreferencesTable.workosUserId, user.workosUserId),
    });

    if (existingPrefs) {
      console.log('   User preferences already exist');
    } else {
      console.log('   Creating default preferences...');
      await db.insert(UserPreferencesTable).values({
        workosUserId: user.workosUserId,
        orgId: membership?.orgId || null,
        securityAlerts: true,
        newDeviceAlerts: false,
        emailNotifications: true,
        inAppNotifications: true,
        unusualTimingAlerts: true,
        locationChangeAlerts: true,
        theme: 'light',
        language: 'en',
      });
    }

    console.log('   ✅ User preferences configured\n');

    // 6. Verify changes
    console.log('6. Verifying changes...');

    const updatedUser = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, user.workosUserId),
    });

    const setup = await db.query.ExpertSetupTable.findFirst({
      where: eq(ExpertSetupTable.workosUserId, user.workosUserId),
    });

    const prefs = await db.query.UserPreferencesTable.findFirst({
      where: eq(UserPreferencesTable.workosUserId, user.workosUserId),
    });

    console.log('\n📊 Summary:');
    console.log('─────────────────────────────────────────');
    console.log(`Email:              ${updatedUser?.email}`);
    console.log(`Name:               ${updatedUser?.firstName} ${updatedUser?.lastName}`);
    console.log(`Role:               ${updatedUser?.role}`);
    console.log(`WorkOS User ID:     ${updatedUser?.workosUserId}`);
    console.log(`\nExpert Setup:`);
    console.log(`  Profile:          ${setup?.profileCompleted ? '✅' : '❌'}`);
    console.log(`  Availability:     ${setup?.availabilityCompleted ? '✅' : '❌'}`);
    console.log(`  Events:           ${setup?.eventsCompleted ? '✅' : '❌'}`);
    console.log(`  Identity:         ${setup?.identityCompleted ? '✅' : '❌'}`);
    console.log(`  Payment:          ${setup?.paymentCompleted ? '✅' : '❌'}`);
    console.log(`  Google Account:   ${setup?.googleAccountCompleted ? '✅' : '❌'}`);
    console.log(`  Setup Complete:   ${setup?.setupComplete ? '✅' : '❌'}`);
    console.log(`\nUser Preferences:`);
    console.log(`  Theme:            ${prefs?.theme}`);
    console.log(`  Language:         ${prefs?.language}`);
    console.log(`  Email Alerts:     ${prefs?.emailNotifications ? '✅' : '❌'}`);
    console.log('─────────────────────────────────────────\n');

    console.log('✅ Test expert setup complete!\n');
    console.log('🚀 You can now test:');
    console.log('   • Visit /setup page (should show all complete)');
    console.log('   • Test expert dashboard features');
    console.log('   • Test role-based access controls');
    console.log('   • Test getUserRoles() utility');
    console.log('   • Test checkExpertSetupStatus() action\n');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupTestExpert()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
