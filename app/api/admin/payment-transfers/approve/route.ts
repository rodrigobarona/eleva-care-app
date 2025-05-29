import { db } from '@/drizzle/db';
import { PaymentTransferTable } from '@/drizzle/schema';
import { adminAuthMiddleware } from '@/lib/auth/admin-middleware';
import {
  PAYMENT_TRANSFER_STATUS_APPROVED,
  PAYMENT_TRANSFER_STATUS_PENDING,
} from '@/lib/constants/payment-transfers';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * POST endpoint to manually approve a pending expert transfer
 * This can only be used by administrators and requires a valid transferId
 */
export async function POST(request: Request) {
  // Check admin authentication
  const authResponse = await adminAuthMiddleware();
  if (authResponse) return authResponse;

  try {
    const { transferId } = await request.json();

    if (!transferId || typeof transferId !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request. Transfer ID is required and must be a number.' },
        { status: 400 },
      );
    }

    // Check if the transfer exists and is in the correct status
    const transfer = await db.query.PaymentTransferTable.findFirst({
      where: eq(PaymentTransferTable.id, transferId),
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    if (transfer.status !== PAYMENT_TRANSFER_STATUS_PENDING) {
      return NextResponse.json(
        {
          error: 'Transfer cannot be approved',
          details: `Transfer is in status: ${transfer.status}, only PENDING transfers can be approved`,
        },
        { status: 400 },
      );
    }

    // Get userId for audit logging
    const { userId } = await auth();

    // Update transfer to approved status
    await db
      .update(PaymentTransferTable)
      .set({
        status: PAYMENT_TRANSFER_STATUS_APPROVED,
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
