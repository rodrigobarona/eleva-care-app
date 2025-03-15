import { db } from '@/drizzle/db';
import { PaymentTransferTable } from '@/drizzle/schema';
import { isAdmin } from '@/lib/auth/roles.server';
import { auth } from '@clerk/nextjs/server';
import { and, asc, desc, eq, gte, like, lte, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// Define valid filter parameters
type FilterParams = {
  status?: string;
  expertId?: string;
  startDate?: string;
  endDate?: string;
  eventId?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

/**
 * GET endpoint to list and filter payment transfers
 * This can only be used by administrators
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role using the centralized isAdmin function
    const userIsAdmin = await isAdmin();

    if (!userIsAdmin) {
      console.warn(`Non-admin user ${userId} attempted to access payment transfers`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters: FilterParams = {
      status: searchParams.get('status') || undefined,
      expertId: searchParams.get('expertId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      eventId: searchParams.get('eventId') || undefined,
      sortBy: searchParams.get('sortBy') || 'scheduledTransferTime',
      sortDirection: (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc',
      page: Number.parseInt(searchParams.get('page') || '1', 10),
      limit: Math.min(Number.parseInt(searchParams.get('limit') || '20', 10), 50), // Cap at 50
    };

    // Build query conditions
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(PaymentTransferTable.status, filters.status));
    }

    if (filters.expertId) {
      conditions.push(eq(PaymentTransferTable.expertClerkUserId, filters.expertId));
    }

    if (filters.eventId) {
      conditions.push(like(PaymentTransferTable.eventId, `%${filters.eventId}%`));
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      if (!Number.isNaN(startDate.getTime())) {
        conditions.push(gte(PaymentTransferTable.scheduledTransferTime, startDate));
      }
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      if (!Number.isNaN(endDate.getTime())) {
        conditions.push(lte(PaymentTransferTable.scheduledTransferTime, endDate));
      }
    }

    // Calculate pagination
    const offset = ((filters.page ?? 1) - 1) * (filters.limit ?? 20);

    // Get count of total records matching filter
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(PaymentTransferTable)
      .where(conditions.length ? and(...conditions) : undefined);

    const totalCount = countResult[0]?.count || 0;

    // Determine sort column and direction
    const getSortColumn = () => {
      switch (filters.sortBy) {
        case 'amount':
          return PaymentTransferTable.amount;
        case 'created':
          return PaymentTransferTable.created;
        case 'status':
          return PaymentTransferTable.status;
        case 'sessionStartTime':
          return PaymentTransferTable.sessionStartTime;
        default:
          return PaymentTransferTable.scheduledTransferTime;
      }
    };

    // Get paginated results with sorting
    const transfers = await db.query.PaymentTransferTable.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: filters.sortDirection === 'asc' ? asc(getSortColumn()) : desc(getSortColumn()),
      offset,
      limit: filters.limit,
    });

    return NextResponse.json({
      data: transfers,
      pagination: {
        total: totalCount,
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        totalPages: Math.ceil(totalCount / (filters.limit ?? 20)),
      },
    });
  } catch (error) {
    console.error('Error fetching payment transfers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment transfers', details: (error as Error).message },
      { status: 500 },
    );
  }
}

/**
 * PATCH endpoint to update a payment transfer
 * This can only be used by administrators
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin access
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role using the centralized isAdmin function
    const userIsAdmin = await isAdmin();

    if (!userIsAdmin) {
      console.warn(`Non-admin user ${userId} attempted to update payment transfer`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get transfer ID and update data from request body
    const body = await request.json();
    const { transferId, requiresApproval, adminNotes } = body;

    if (!transferId || typeof transferId !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request. Transfer ID is required.' },
        { status: 400 },
      );
    }

    // Check if the transfer exists
    const transfer = await db.query.PaymentTransferTable.findFirst({
      where: eq(PaymentTransferTable.id, transferId),
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Only allow updates to certain fields
    const updates: Record<string, unknown> = {
      updated: new Date(),
      adminUserId: userId,
    };

    if (typeof requiresApproval === 'boolean') {
      updates.requiresApproval = requiresApproval;
    }

    if (adminNotes !== undefined) {
      updates.adminNotes = adminNotes;
    }

    // Update the transfer
    await db
      .update(PaymentTransferTable)
      .set(updates)
      .where(eq(PaymentTransferTable.id, transferId));

    console.log(`Admin ${userId} updated transfer ${transferId}`);

    return NextResponse.json({
      success: true,
      message: 'Transfer updated successfully',
      transferId,
    });
  } catch (error) {
    console.error('Error updating transfer:', error);
    return NextResponse.json(
      { error: 'Failed to update transfer', details: (error as Error).message },
      { status: 500 },
    );
  }
}
