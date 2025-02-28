// scripts/create-superadmin.ts
import { db } from '@/drizzle/db';
import { UserRoleTable } from '@/drizzle/schema';
import 'dotenv/config';

async function createSuperadmin() {
  const clerkUserId = process.argv[2];

  if (!clerkUserId) {
    console.error('Please provide a Clerk user ID as an argument');
    process.exit(1);
  }

  try {
    await db.insert(UserRoleTable).values({
      clerkUserId,
      role: 'superadmin',
      assignedBy: clerkUserId, // Self-assigned
    });

    console.log(`Successfully added superadmin role to user ${clerkUserId}`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating superadmin:', error);
    process.exit(1);
  }
}

createSuperadmin();
