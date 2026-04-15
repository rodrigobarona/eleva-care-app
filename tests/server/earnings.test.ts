import {
  buildCustomerBreakdown,
  buildEarningsRecords,
  buildEarningsSummary,
  buildMonthlySeries,
  getEarningsStatusGroup,
} from '@/server/earnings';
import { describe, expect, it } from '@jest/globals';

describe('expert earnings aggregation', () => {
  const meetingMap = new Map([
    [
      'pi_scheduled',
      {
        stripePaymentIntentId: 'pi_scheduled',
        stripePaymentStatus: 'succeeded',
        stripeAmount: 10000,
        stripeApplicationFeeAmount: 1500,
        stripePayoutId: null,
        startTime: new Date('2026-03-04T10:00:00.000Z'),
        endTime: new Date('2026-03-04T11:00:00.000Z'),
        guestName: 'Alice',
        guestEmail: 'alice@example.com',
        eventId: 'event-1',
      },
    ],
    [
      'pi_paid_out',
      {
        stripePaymentIntentId: 'pi_paid_out',
        stripePaymentStatus: 'succeeded',
        stripeAmount: 12000,
        stripeApplicationFeeAmount: 1800,
        stripePayoutId: 'po_123',
        startTime: new Date('2026-03-10T10:00:00.000Z'),
        endTime: new Date('2026-03-10T11:00:00.000Z'),
        guestName: 'Alice',
        guestEmail: 'alice@example.com',
        eventId: 'event-2',
      },
    ],
    [
      'pi_refunded',
      {
        stripePaymentIntentId: 'pi_refunded',
        stripePaymentStatus: 'refunded',
        stripeAmount: 9000,
        stripeApplicationFeeAmount: 1350,
        stripePayoutId: null,
        startTime: new Date('2026-03-18T10:00:00.000Z'),
        endTime: new Date('2026-03-18T11:00:00.000Z'),
        guestName: 'Bruno',
        guestEmail: 'bruno@example.com',
        eventId: 'event-3',
      },
    ],
  ]);

  const records = buildEarningsRecords(
    [
      {
        id: 1,
        paymentIntentId: 'pi_scheduled',
        checkoutSessionId: 'cs_1',
        eventId: 'event-1',
        expertConnectAccountId: 'acct_1',
        expertClerkUserId: 'user_1',
        amount: 8500,
        currency: 'eur',
        platformFee: 1500,
        sessionStartTime: new Date('2026-03-04T10:00:00.000Z'),
        scheduledTransferTime: new Date('2026-03-05T10:00:00.000Z'),
        status: 'READY',
        transferId: null,
        payoutId: null,
        stripeErrorCode: null,
        stripeErrorMessage: null,
        retryCount: 0,
        requiresApproval: false,
        adminUserId: null,
        adminNotes: null,
        notifiedAt: null,
        guestName: 'Alice',
        guestEmail: 'alice@example.com',
        serviceName: 'Nutrition Session',
        created: new Date('2026-03-01T10:00:00.000Z'),
        updated: new Date('2026-03-01T10:00:00.000Z'),
      },
      {
        id: 2,
        paymentIntentId: 'pi_paid_out',
        checkoutSessionId: 'cs_2',
        eventId: 'event-2',
        expertConnectAccountId: 'acct_1',
        expertClerkUserId: 'user_1',
        amount: 10200,
        currency: 'eur',
        platformFee: 1800,
        sessionStartTime: new Date('2026-03-10T10:00:00.000Z'),
        scheduledTransferTime: new Date('2026-03-11T10:00:00.000Z'),
        status: 'PAID_OUT',
        transferId: 'tr_1',
        payoutId: 'po_123',
        stripeErrorCode: null,
        stripeErrorMessage: null,
        retryCount: 0,
        requiresApproval: false,
        adminUserId: null,
        adminNotes: null,
        notifiedAt: null,
        guestName: 'Alice',
        guestEmail: 'alice@example.com',
        serviceName: 'Breathwork Session',
        created: new Date('2026-03-08T10:00:00.000Z'),
        updated: new Date('2026-03-08T10:00:00.000Z'),
      },
      {
        id: 3,
        paymentIntentId: 'pi_refunded',
        checkoutSessionId: 'cs_3',
        eventId: 'event-3',
        expertConnectAccountId: 'acct_1',
        expertClerkUserId: 'user_1',
        amount: 7650,
        currency: 'eur',
        platformFee: 1350,
        sessionStartTime: new Date('2026-03-18T10:00:00.000Z'),
        scheduledTransferTime: new Date('2026-03-19T10:00:00.000Z'),
        status: 'COMPLETED',
        transferId: 'tr_2',
        payoutId: null,
        stripeErrorCode: null,
        stripeErrorMessage: null,
        retryCount: 0,
        requiresApproval: false,
        adminUserId: null,
        adminNotes: null,
        notifiedAt: null,
        guestName: 'Bruno',
        guestEmail: 'bruno@example.com',
        serviceName: 'Coaching Session',
        created: new Date('2026-03-15T10:00:00.000Z'),
        updated: new Date('2026-03-15T10:00:00.000Z'),
      },
    ] as any,
    meetingMap as any,
  );

  it('maps transfer and meeting states into expert-friendly status groups', () => {
    expect(getEarningsStatusGroup('READY', 'succeeded')).toBe('scheduled');
    expect(getEarningsStatusGroup('COMPLETED', 'succeeded')).toBe('available');
    expect(getEarningsStatusGroup('PAID_OUT', 'succeeded')).toBe('paid_out');
    expect(getEarningsStatusGroup('COMPLETED', 'refunded')).toBe('refunded');
    expect(getEarningsStatusGroup('FAILED', 'failed')).toBe('issue');
  });

  it('builds summaries excluding refunded sessions from active earnings totals', () => {
    const summary = buildEarningsSummary(records);

    expect(summary.totalSessions).toBe(2);
    expect(summary.totalCustomers).toBe(1);
    expect(summary.grossAmount).toBe(22000);
    expect(summary.netAmount).toBe(18700);
    expect(summary.platformFeeAmount).toBe(3300);
    expect(summary.scheduledAmount).toBe(8500);
    expect(summary.availableAmount).toBe(0);
    expect(summary.paidOutAmount).toBe(10200);
    expect(summary.refundedAmount).toBe(7650);
    expect(summary.nextPayoutDate).toBe('2026-03-05T10:00:00.000Z');
  });

  it('aggregates customer and monthly views from the same record set', () => {
    const customerBreakdown = buildCustomerBreakdown(records);
    const monthlySeries = buildMonthlySeries(records, 2026);

    expect(customerBreakdown).toHaveLength(1);
    expect(customerBreakdown[0]).toMatchObject({
      customerName: 'Alice',
      sessionsCount: 2,
      grossAmount: 22000,
      netAmount: 18700,
      paidOutAmount: 10200,
      scheduledAmount: 8500,
    });

    expect(monthlySeries[2]).toMatchObject({
      month: 3,
      netAmount: 18700,
      paidOutAmount: 10200,
      grossAmount: 22000,
    });
  });
});
