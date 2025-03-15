import { db } from '@/drizzle/db';
import { PaymentTransferTable } from '@/drizzle/schema';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * POST endpoint to manually approve a pending expert transfer
 * This can only be used by administrators and requires a valid transferId
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const user = await (await clerkClient()).users.getUser(userId);

    // Check if role is an array that includes 'admin' or 'superadmin'
    const userRoles = user.publicMetadata?.role as string[] | string | undefined;
    const isAdmin = Array.isArray(userRoles)
      ? userRoles.includes('admin') || userRoles.includes('superadmin')
      : userRoles === 'admin' || userRoles === 'superadmin';

    if (!isAdmin) {
      console.warn(`Non-admin user ${userId} attempted to approve transfer`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get transfer ID from request body
    const body = await request.json();
    const { transferId, notes } = body;

    if (!transferId || typeof transferId !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request. Transfer ID is required.' },
        { status: 400 },
      );
    }

    // Check if the transfer exists and is in PENDING status
    const transfer = await db.query.PaymentTransferTable.findFirst({
      where: eq(PaymentTransferTable.id, transferId),
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    if (transfer.status !== 'PENDING') {
      return NextResponse.json(
        {
          error: `Transfer cannot be approved because it is in ${transfer.status} status`,
          currentStatus: transfer.status,
        },
        { status: 400 },
      );
    }

    // Approve the transfer
    await db
      .update(PaymentTransferTable)
      .set({
        status: 'APPROVED',
        adminNotes: notes || null,
        adminUserId: userId,
        updated: new Date(),
      })
      .where(eq(PaymentTransferTable.id, transferId));

    console.log(`Admin ${userId} approved transfer ${transferId}`);

    return NextResponse.json({
      success: true,
      message: 'Transfer approved successfully',
      transferId,
    });
  } catch (error) {
    console.error('Error approving transfer:', error);
    return NextResponse.json(
      { error: 'Failed to approve transfer', details: (error as Error).message },
      { status: 500 },
    );
  }
}
