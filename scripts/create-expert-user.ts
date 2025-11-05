#!/usr/bin/env tsx
/**
 * Create Expert User in WorkOS
 *
 * Creates a new expert user with:
 * - WorkOS user account
 * - Personal organization (org-per-user model)
 * - Owner membership
 * - Database records
 *
 * Usage:
 *   pnpm tsx scripts/create-expert-user.ts
 */
// Load environment variables FIRST
// Import database modules
import { db } from '@/drizzle/db';
import { OrganizationsTable, UserOrgMembershipsTable, UsersTable } from '@/drizzle/schema-workos';
// Initialize WorkOS client inline (after env check)
import { WorkOS } from '@workos-inc/node';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';

config();

// Verify environment variables are loaded
if (!process.env.WORKOS_API_KEY) {
  console.error('❌ WORKOS_API_KEY not found in environment');
  console.error('Please add it to your .env file');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  console.error('Please add it to your .env file');
  process.exit(1);
}

const workos = new WorkOS(process.env.WORKOS_API_KEY);

interface ExpertUserParams {
  email: string;
  firstName: string;
  lastName: string;
  emailVerified?: boolean;
}

async function createExpertUser(params: ExpertUserParams) {
  const { email, firstName, lastName, emailVerified = true } = params;

  console.log('');
  console.log('🚀 Creating Expert User in WorkOS');
  console.log('==================================');
  console.log(`Email: ${email}`);
  console.log(`Name: ${firstName} ${lastName}`);
  console.log('');

  try {
    // Step 1: Check if user already exists
    console.log('🔍 Checking if user already exists...');
    const existingUser = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.email, email),
    });

    if (existingUser) {
      console.log('');
      console.log('⚠️  User already exists!');
      console.log('');
      console.log('User Details:');
      console.log(`  - WorkOS ID: ${existingUser.workosUserId}`);
      console.log(`  - Email: ${existingUser.email}`);
      console.log(`  - Name: ${existingUser.firstName} ${existingUser.lastName}`);
      console.log('');

      // Get their organization
      const membership = await db.query.UserOrgMembershipsTable.findFirst({
        where: eq(UserOrgMembershipsTable.workosUserId, existingUser.workosUserId),
      });

      if (membership) {
        // Query organization separately
        const org = await db.query.OrganizationsTable.findFirst({
          where: eq(OrganizationsTable.id, membership.orgId),
        });

        console.log('Organization:');
        console.log(`  - ID: ${membership.orgId}`);
        if (org) {
          console.log(`  - Name: ${org.name}`);
          console.log(`  - Slug: ${org.slug}`);
        }
        console.log('');
      }

      console.log('✅ User is ready to use!');
      console.log('');
      return {
        userId: existingUser.workosUserId,
        email: existingUser.email,
        organizationId: membership?.orgId,
      };
    }

    // Step 2: Create WorkOS user
    console.log('📝 Creating WorkOS user account...');
    const workosUser = await workos.userManagement.createUser({
      email,
      firstName,
      lastName,
      emailVerified,
      metadata: {
        userType: 'expert',
        createdVia: 'migration_script',
        createdAt: new Date().toISOString(),
      },
    });
    console.log(`✅ WorkOS user created: ${workosUser.id}`);

    // Step 3: Create personal organization
    const orgSlug = `user-${workosUser.id}`;
    const orgName = `${firstName} ${lastName}'s Account`;

    console.log('🏢 Creating personal organization...');
    const workosOrg = await workos.organizations.createOrganization({
      name: orgName,
      domainData: [], // No domain verification for individual experts
    });
    console.log(`✅ Organization created: ${workosOrg.id}`);

    // Step 4: Insert organization into database
    console.log('💾 Saving organization to database...');
    const [org] = await db
      .insert(OrganizationsTable)
      .values({
        workosOrgId: workosOrg.id,
        slug: orgSlug,
        name: orgName,
        type: 'expert_individual', // Expert organization type
      })
      .returning();
    console.log(`✅ Organization saved with internal ID: ${org.id}`);

    // Step 5: Insert user into database
    console.log('💾 Saving user to database...');
    await db.insert(UsersTable).values({
      workosUserId: workosUser.id,
      email,
      firstName,
      lastName,
      // Stripe fields will be added later when expert connects Stripe
      stripeCustomerId: null,
      stripeConnectAccountId: null,
    });
    console.log('✅ User saved to database');

    // Step 6: Create WorkOS membership
    console.log('🔗 Creating organization membership in WorkOS...');
    await workos.userManagement.createOrganizationMembership({
      userId: workosUser.id,
      organizationId: workosOrg.id,
      roleSlug: 'owner',
    });
    console.log('✅ WorkOS membership created');

    // Step 7: Insert membership into database
    console.log('💾 Saving membership to database...');
    await db.insert(UserOrgMembershipsTable).values({
      workosUserId: workosUser.id,
      orgId: org.id,
      role: 'owner',
      status: 'active',
    });
    console.log('✅ Membership saved to database');

    console.log('');
    console.log('🎉 Expert user created successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('===========');
    console.log(`WorkOS User ID:      ${workosUser.id}`);
    console.log(`Email:               ${email}`);
    console.log(`Name:                ${firstName} ${lastName}`);
    console.log(`Organization ID:     ${org.id}`);
    console.log(`Organization Name:   ${orgName}`);
    console.log(`Organization Slug:   ${orgSlug}`);
    console.log(`Role:                owner`);
    console.log('');
    console.log('✅ User can now:');
    console.log('   - Log in to the dashboard');
    console.log('   - Create events');
    console.log('   - Accept bookings');
    console.log('   - Connect Stripe for payments');
    console.log('');

    return {
      userId: workosUser.id,
      email,
      organizationId: org.id,
    };
  } catch (error) {
    console.error('');
    console.error('❌ Failed to create expert user');
    console.error('');
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('');
      if (error.stack) {
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('Unknown error:', error);
    }
    console.error('');
    throw error;
  }
}

// Main execution
async function main() {
  const expert: ExpertUserParams = {
    email: 'rbarona@hey.com',
    firstName: 'Rodrigo',
    lastName: 'Barona',
    emailVerified: true, // Set to true for test/migrated users
  };

  await createExpertUser(expert);

  console.log('');
  console.log('🎯 Next Steps:');
  console.log('===============');
  console.log('1. Log in to WorkOS dashboard to verify user');
  console.log('2. Send magic auth link to user:');
  console.log(`   pnpm tsx scripts/send-magic-link.ts ${expert.email}`);
  console.log('3. User can log in and set up their profile');
  console.log('4. User can create events and start accepting bookings');
  console.log('');
}

main()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
