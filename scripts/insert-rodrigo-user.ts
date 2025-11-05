#!/usr/bin/env tsx
/**
 * Insert Rodrigo's WorkOS user into database
 *
 * WorkOS IDs (from dashboard):
 * - Organization: org_01K978WVKETKD7T0BK8ZPVS5XT
 * - User: user_01K8QT17KX25XPHVQ4H1K0HTR7
 */
import { db } from '@/drizzle/db';
import { OrganizationsTable, UserOrgMembershipsTable, UsersTable } from '@/drizzle/schema-workos';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';

config();

async function insertRodrigoUser() {
  console.log('');
  console.log('🚀 Inserting Rodrigo Barona into Database');
  console.log('=========================================');
  console.log('');

  const workosUserId = 'user_01K8QT17KX25XPHVQ4H1K0HTR7';
  const workosOrgId = 'org_01K978WVKETKD7T0BK8ZPVS5XT';
  const email = 'rbarona@hey.com';
  const firstName = 'Rodrigo';
  const lastName = 'Barona';

  try {
    // Step 1: Check if user already exists
    console.log('🔍 Checking if user already exists...');
    const existingUser = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.email, email),
    });

    if (existingUser) {
      console.log('');
      console.log('⚠️  User already exists in database!');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   WorkOS ID: ${existingUser.workosUserId}`);
      console.log('');
      console.log('✅ Nothing to do!');
      console.log('');
      return;
    }

    // Step 2: Insert Organization
    console.log('🏢 Inserting organization...');
    const [org] = await db
      .insert(OrganizationsTable)
      .values({
        workosOrgId: workosOrgId,
        slug: `user-${workosUserId}`,
        name: "Rodrigo Barona's Account",
        type: 'expert_individual',
      })
      .returning();

    console.log(`✅ Organization inserted with ID: ${org.id}`);
    console.log('');

    // Step 3: Insert User
    console.log('👤 Inserting user...');
    await db.insert(UsersTable).values({
      workosUserId: workosUserId,
      email: email,
      firstName: firstName,
      lastName: lastName,
      stripeCustomerId: null,
      stripeConnectAccountId: null,
    });

    console.log('✅ User inserted');
    console.log('');

    // Step 4: Insert Membership
    console.log('🔗 Creating membership...');
    await db.insert(UserOrgMembershipsTable).values({
      workosUserId: workosUserId,
      orgId: org.id,
      role: 'owner',
      status: 'active',
    });

    console.log('✅ Membership created');
    console.log('');

    // Step 5: Verify
    console.log('🔍 Verifying setup...');
    const verification = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.email, email),
    });

    if (verification) {
      // Get membership separately
      const membership = await db.query.UserOrgMembershipsTable.findFirst({
        where: eq(UserOrgMembershipsTable.workosUserId, verification.workosUserId),
      });

      // Get organization separately
      const org = membership
        ? await db.query.OrganizationsTable.findFirst({
            where: eq(OrganizationsTable.id, membership.orgId),
          })
        : null;

      console.log('');
      console.log('✅ Verification Successful!');
      console.log('==========================');
      console.log('');
      console.log('User Details:');
      console.log(`  Email:      ${verification.email}`);
      console.log(`  Name:       ${verification.firstName} ${verification.lastName}`);
      console.log(`  WorkOS ID:  ${verification.workosUserId}`);
      console.log('');
      if (org) {
        console.log('Organization:');
        console.log(`  Name:       ${org.name}`);
        console.log(`  Slug:       ${org.slug}`);
        console.log(`  Type:       ${org.type}`);
        console.log(`  Role:       ${membership?.role}`);
        console.log('');
      }
    }

    console.log('🎉 Setup Complete!');
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('==============');
    console.log('1. Send magic auth link to test login');
    console.log('2. Create a test event');
    console.log('3. Test guest booking flow');
    console.log('4. Verify guest user auto-registration');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Error inserting user');
    console.error('');
    if (error instanceof Error) {
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
      }
    }
    console.error('');
    throw error;
  }
}

insertRodrigoUser()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
