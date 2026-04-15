import { db } from '@/drizzle/db';
import { MeetingTable, PaymentTransferTable, UserTable } from '@/drizzle/schema';
import {
  PAYMENT_TRANSFER_STATUS_APPROVED,
  PAYMENT_TRANSFER_STATUS_COMPLETED,
  PAYMENT_TRANSFER_STATUS_DISPUTED,
  PAYMENT_TRANSFER_STATUS_FAILED,
  PAYMENT_TRANSFER_STATUS_PAID_OUT,
  PAYMENT_TRANSFER_STATUS_PENDING,
  PAYMENT_TRANSFER_STATUS_READY,
  PAYMENT_TRANSFER_STATUS_REFUNDED,
  type PaymentTransferStatus,
} from '@/lib/constants/payment-transfers';
import { getConnectAccountBalance, getConnectAccountPayouts } from '@/lib/integrations/stripe';
import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import 'server-only';
import type Stripe from 'stripe';

type MeetingPaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | null;

type PaymentTransferRecord = typeof PaymentTransferTable.$inferSelect;

type MeetingRecord = Pick<
  typeof MeetingTable.$inferSelect,
  | 'stripePaymentIntentId'
  | 'stripePaymentStatus'
  | 'stripeAmount'
  | 'stripeApplicationFeeAmount'
  | 'stripePayoutId'
  | 'startTime'
  | 'endTime'
  | 'guestName'
  | 'guestEmail'
  | 'eventId'
>;

export type EarningsStatusGroup = 'scheduled' | 'available' | 'paid_out' | 'refunded' | 'issue';

export type EarningsRecord = {
  transferId: number;
  paymentIntentId: string;
  checkoutSessionId: string;
  eventId: string;
  currency: string;
  grossAmount: number;
  netAmount: number;
  platformFeeAmount: number;
  paidAt: Date;
  sessionStartTime: Date;
  scheduledTransferTime: Date;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  payoutId: string | null;
  rawStatus: PaymentTransferStatus;
  customerPaymentStatus: MeetingPaymentStatus;
  statusGroup: EarningsStatusGroup;
  statusLabel: string;
};

export type EarningsSummary = {
  currency: string;
  totalSessions: number;
  totalCustomers: number;
  grossAmount: number;
  netAmount: number;
  platformFeeAmount: number;
  scheduledAmount: number;
  availableAmount: number;
  paidOutAmount: number;
  refundedAmount: number;
  issueAmount: number;
  nextPayoutDate: string | null;
};

export type EarningsMonthlySeriesItem = {
  month: number;
  label: string;
  grossAmount: number;
  netAmount: number;
  paidOutAmount: number;
};

export type EarningsCustomerBreakdownItem = {
  customerName: string;
  customerEmail: string;
  sessionsCount: number;
  grossAmount: number;
  netAmount: number;
  paidOutAmount: number;
  scheduledAmount: number;
  latestSessionDate: string;
};

export type StripeBalanceSummary = {
  availableAmount: number;
  pendingAmount: number;
  instantAvailableAmount: number;
  currency: string;
};

export type StripePayoutSnapshot = {
  id: string;
  amount: number;
  currency: string;
  arrivalDate: string | null;
  createdAt: string;
  status: string;
};

export type ExpertEarningsDashboardData = {
  filters: {
    year: number;
    month: number | null;
  };
  connectAccountId: string | null;
  yearSummary: EarningsSummary;
  periodSummary: EarningsSummary;
  monthlySeries: EarningsMonthlySeriesItem[];
  customerBreakdown: EarningsCustomerBreakdownItem[];
  sessionLedger: EarningsRecord[];
  stripeBalance: StripeBalanceSummary | null;
  recentPayouts: StripePayoutSnapshot[];
};

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const COUNTED_EARNINGS_STATUSES = new Set<PaymentTransferStatus>([
  PAYMENT_TRANSFER_STATUS_PENDING,
  PAYMENT_TRANSFER_STATUS_APPROVED,
  PAYMENT_TRANSFER_STATUS_READY,
  PAYMENT_TRANSFER_STATUS_COMPLETED,
  PAYMENT_TRANSFER_STATUS_PAID_OUT,
]);

function normalizeCurrency(currency: string | null | undefined) {
  return (currency || 'eur').toUpperCase();
}

export function getEarningsStatusGroup(
  transferStatus: PaymentTransferStatus,
  customerPaymentStatus: MeetingPaymentStatus,
): EarningsStatusGroup {
  if (customerPaymentStatus === 'refunded' || transferStatus === PAYMENT_TRANSFER_STATUS_REFUNDED) {
    return 'refunded';
  }

  if (
    customerPaymentStatus === 'failed' ||
    transferStatus === PAYMENT_TRANSFER_STATUS_FAILED ||
    transferStatus === PAYMENT_TRANSFER_STATUS_DISPUTED
  ) {
    return 'issue';
  }

  if (transferStatus === PAYMENT_TRANSFER_STATUS_PAID_OUT) {
    return 'paid_out';
  }

  if (transferStatus === PAYMENT_TRANSFER_STATUS_COMPLETED) {
    return 'available';
  }

  return 'scheduled';
}

export function getEarningsStatusLabel(statusGroup: EarningsStatusGroup) {
  switch (statusGroup) {
    case 'scheduled':
      return 'Scheduled for payout';
    case 'available':
      return 'Available in Stripe';
    case 'paid_out':
      return 'Paid out';
    case 'refunded':
      return 'Refunded';
    case 'issue':
      return 'Needs attention';
    default:
      return 'Scheduled for payout';
  }
}

export function buildEarningsRecords(
  transfers: PaymentTransferRecord[],
  meetingsByPaymentIntentId: Map<string, MeetingRecord>,
): EarningsRecord[] {
  return transfers.map((transfer) => {
    const meeting = meetingsByPaymentIntentId.get(transfer.paymentIntentId);
    const customerPaymentStatus = meeting?.stripePaymentStatus ?? null;
    const statusGroup = getEarningsStatusGroup(transfer.status, customerPaymentStatus);
    const grossAmount = meeting?.stripeAmount ?? transfer.amount + transfer.platformFee;
    const platformFeeAmount = meeting?.stripeApplicationFeeAmount ?? transfer.platformFee;

    return {
      transferId: transfer.id,
      paymentIntentId: transfer.paymentIntentId,
      checkoutSessionId: transfer.checkoutSessionId,
      eventId: transfer.eventId,
      currency: normalizeCurrency(transfer.currency),
      grossAmount,
      netAmount: transfer.amount,
      platformFeeAmount,
      paidAt: transfer.created,
      sessionStartTime: meeting?.startTime ?? transfer.sessionStartTime,
      scheduledTransferTime: transfer.scheduledTransferTime,
      customerName: meeting?.guestName ?? transfer.guestName ?? 'Client',
      customerEmail: meeting?.guestEmail ?? transfer.guestEmail ?? '',
      serviceName: transfer.serviceName ?? 'Session',
      payoutId: transfer.payoutId ?? meeting?.stripePayoutId ?? null,
      rawStatus: transfer.status,
      customerPaymentStatus,
      statusGroup,
      statusLabel: getEarningsStatusLabel(statusGroup),
    };
  });
}

function isCountedAsEarnings(record: EarningsRecord) {
  return COUNTED_EARNINGS_STATUSES.has(record.rawStatus) && record.statusGroup !== 'refunded';
}

function createEmptySummary(currency = 'EUR'): EarningsSummary {
  return {
    currency,
    totalSessions: 0,
    totalCustomers: 0,
    grossAmount: 0,
    netAmount: 0,
    platformFeeAmount: 0,
    scheduledAmount: 0,
    availableAmount: 0,
    paidOutAmount: 0,
    refundedAmount: 0,
    issueAmount: 0,
    nextPayoutDate: null,
  };
}

export function buildEarningsSummary(records: EarningsRecord[]): EarningsSummary {
  const currency = records[0]?.currency ?? 'EUR';
  const summary = createEmptySummary(currency);
  const countedRecords = records.filter(isCountedAsEarnings);
  const customerEmails = new Set(
    countedRecords.map((record) => record.customerEmail || record.customerName),
  );

  summary.totalSessions = countedRecords.length;
  summary.totalCustomers = customerEmails.size;

  for (const record of records) {
    if (isCountedAsEarnings(record)) {
      summary.grossAmount += record.grossAmount;
      summary.netAmount += record.netAmount;
      summary.platformFeeAmount += record.platformFeeAmount;
    }

    if (record.statusGroup === 'scheduled') {
      summary.scheduledAmount += record.netAmount;
      if (
        !summary.nextPayoutDate ||
        record.scheduledTransferTime.toISOString() < summary.nextPayoutDate
      ) {
        summary.nextPayoutDate = record.scheduledTransferTime.toISOString();
      }
    }

    if (record.statusGroup === 'available') {
      summary.availableAmount += record.netAmount;
      if (
        !summary.nextPayoutDate ||
        record.scheduledTransferTime.toISOString() < summary.nextPayoutDate
      ) {
        summary.nextPayoutDate = record.scheduledTransferTime.toISOString();
      }
    }

    if (record.statusGroup === 'paid_out') {
      summary.paidOutAmount += record.netAmount;
    }

    if (record.statusGroup === 'refunded') {
      summary.refundedAmount += record.netAmount;
    }

    if (record.statusGroup === 'issue') {
      summary.issueAmount += record.netAmount;
    }
  }

  return summary;
}

export function buildMonthlySeries(
  records: EarningsRecord[],
  year: number,
): EarningsMonthlySeriesItem[] {
  const months = MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    grossAmount: 0,
    netAmount: 0,
    paidOutAmount: 0,
  }));

  for (const record of records) {
    if (record.sessionStartTime.getUTCFullYear() !== year || !isCountedAsEarnings(record)) {
      continue;
    }

    const monthIndex = record.sessionStartTime.getUTCMonth();
    months[monthIndex].grossAmount += record.grossAmount;
    months[monthIndex].netAmount += record.netAmount;

    if (record.statusGroup === 'paid_out') {
      months[monthIndex].paidOutAmount += record.netAmount;
    }
  }

  return months;
}

export function buildCustomerBreakdown(records: EarningsRecord[]): EarningsCustomerBreakdownItem[] {
  const customerMap = new Map<string, EarningsCustomerBreakdownItem>();

  for (const record of records) {
    if (!isCountedAsEarnings(record)) {
      continue;
    }

    const key = record.customerEmail || record.customerName;
    const existing = customerMap.get(key);

    if (!existing) {
      customerMap.set(key, {
        customerName: record.customerName,
        customerEmail: record.customerEmail,
        sessionsCount: 1,
        grossAmount: record.grossAmount,
        netAmount: record.netAmount,
        paidOutAmount: record.statusGroup === 'paid_out' ? record.netAmount : 0,
        scheduledAmount:
          record.statusGroup === 'scheduled' || record.statusGroup === 'available'
            ? record.netAmount
            : 0,
        latestSessionDate: record.sessionStartTime.toISOString(),
      });
      continue;
    }

    existing.sessionsCount += 1;
    existing.grossAmount += record.grossAmount;
    existing.netAmount += record.netAmount;
    existing.paidOutAmount += record.statusGroup === 'paid_out' ? record.netAmount : 0;
    existing.scheduledAmount +=
      record.statusGroup === 'scheduled' || record.statusGroup === 'available'
        ? record.netAmount
        : 0;

    if (record.sessionStartTime.toISOString() > existing.latestSessionDate) {
      existing.latestSessionDate = record.sessionStartTime.toISOString();
    }
  }

  return [...customerMap.values()].toSorted((left, right) => right.netAmount - left.netAmount);
}

function aggregateBalanceAmounts(entries: Stripe.ApiList<Stripe.Balance.BalanceAmount>) {
  return entries.reduce<Record<string, number>>((result, entry) => {
    const currency = normalizeCurrency(entry.currency);
    result[currency] = (result[currency] || 0) + entry.amount;
    return result;
  }, {});
}

function getPrimaryCurrency(
  records: EarningsRecord[],
  balanceCurrencyMap?: Record<string, number>,
) {
  if (records[0]?.currency) {
    return records[0].currency;
  }

  if (balanceCurrencyMap) {
    const [firstCurrency] = Object.keys(balanceCurrencyMap);
    if (firstCurrency) {
      return firstCurrency;
    }
  }

  return 'EUR';
}

function filterRecordsForPeriod(records: EarningsRecord[], month: number | null) {
  if (!month) {
    return records;
  }

  return records.filter((record) => record.sessionStartTime.getUTCMonth() + 1 === month);
}

export async function getExpertEarningsDashboardData({
  clerkUserId,
  year,
  month,
}: {
  clerkUserId: string;
  year: number;
  month: number | null;
}): Promise<ExpertEarningsDashboardData> {
  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year + 1, 0, 1));

  const user = await db.query.UserTable.findFirst({
    where: eq(UserTable.clerkUserId, clerkUserId),
    columns: {
      stripeConnectAccountId: true,
    },
  });

  const transfers = await db.query.PaymentTransferTable.findMany({
    where: and(
      eq(PaymentTransferTable.expertClerkUserId, clerkUserId),
      gte(PaymentTransferTable.sessionStartTime, startDate),
      lt(PaymentTransferTable.sessionStartTime, endDate),
    ),
    orderBy: (table, { desc }) => [desc(table.sessionStartTime)],
  });

  const paymentIntentIds = transfers
    .map((transfer) => transfer.paymentIntentId)
    .filter((paymentIntentId): paymentIntentId is string => Boolean(paymentIntentId));

  const meetings = paymentIntentIds.length
    ? await db.query.MeetingTable.findMany({
        where: inArray(MeetingTable.stripePaymentIntentId, paymentIntentIds),
        columns: {
          stripePaymentIntentId: true,
          stripePaymentStatus: true,
          stripeAmount: true,
          stripeApplicationFeeAmount: true,
          stripePayoutId: true,
          startTime: true,
          endTime: true,
          guestName: true,
          guestEmail: true,
          eventId: true,
        },
      })
    : [];

  const meetingsByPaymentIntentId = new Map(
    meetings
      .filter((meeting) => Boolean(meeting.stripePaymentIntentId))
      .map((meeting) => [meeting.stripePaymentIntentId!, meeting]),
  );

  const yearRecords = buildEarningsRecords(transfers, meetingsByPaymentIntentId);
  const periodRecords = filterRecordsForPeriod(yearRecords, month);

  let stripeBalance: StripeBalanceSummary | null = null;
  let recentPayouts: StripePayoutSnapshot[] = [];

  if (user?.stripeConnectAccountId) {
    const [balance, payouts] = await Promise.all([
      getConnectAccountBalance(user.stripeConnectAccountId),
      getConnectAccountPayouts(user.stripeConnectAccountId),
    ]);

    const availableByCurrency = aggregateBalanceAmounts(balance.available);
    const pendingByCurrency = aggregateBalanceAmounts(balance.pending);
    const instantAvailableByCurrency = balance.instant_available
      ? aggregateBalanceAmounts(balance.instant_available)
      : {};
    const primaryCurrency = getPrimaryCurrency(yearRecords, availableByCurrency);

    stripeBalance = {
      currency: primaryCurrency,
      availableAmount: availableByCurrency[primaryCurrency] ?? 0,
      pendingAmount: pendingByCurrency[primaryCurrency] ?? 0,
      instantAvailableAmount: instantAvailableByCurrency[primaryCurrency] ?? 0,
    };

    recentPayouts = payouts.data.slice(0, 5).map((payout) => ({
      id: payout.id,
      amount: payout.amount,
      currency: normalizeCurrency(payout.currency),
      arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
      createdAt: new Date(payout.created * 1000).toISOString(),
      status: payout.status,
    }));
  }

  return {
    filters: {
      year,
      month,
    },
    connectAccountId: user?.stripeConnectAccountId ?? null,
    yearSummary: buildEarningsSummary(yearRecords),
    periodSummary: buildEarningsSummary(periodRecords),
    monthlySeries: buildMonthlySeries(yearRecords, year),
    customerBreakdown: buildCustomerBreakdown(periodRecords),
    sessionLedger: periodRecords.toSorted(
      (left, right) => right.sessionStartTime.getTime() - left.sessionStartTime.getTime(),
    ),
    stripeBalance,
    recentPayouts,
  };
}
