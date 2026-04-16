import { calculateApplicationFee } from '@/config/stripe';
import { db } from '@/drizzle/db';
import {
  MeetingTable,
  PackPurchaseTable,
  PaymentTransferTable,
  SessionPackTable,
  UserTable,
} from '@/drizzle/schema';
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
import { resolveMarketplaceAmounts } from '@/lib/payments/marketplace-amounts';
import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import 'server-only';

type MeetingPaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | null;

type PaymentTransferRecord = typeof PaymentTransferTable.$inferSelect;
type PackPurchaseDbRecord = typeof PackPurchaseTable.$inferSelect;
type PackPurchaseRecord = {
  id: string;
  packId: string;
  eventId: string;
  expertClerkUserId: string | null;
  buyerEmail: string;
  buyerName: string | null;
  packNameSnapshot: string | null;
  eventNameSnapshot: string | null;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  currency: string | null;
  grossAmount: number | null;
  platformFeeAmount: number | null;
  netAmount: number | null;
  status: PackPurchaseDbRecord['status'];
  maxRedemptions: number;
  createdAt: Date;
  packName: string;
  packCurrency: string;
  packPrice: number;
};

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

export type EarningsSourceType = 'session' | 'pack';

export type EarningsStatusGroup =
  | 'scheduled'
  | 'available'
  | 'paid_out'
  | 'refunded'
  | 'issue'
  | 'sale';

export type EarningsRecord = {
  id: string;
  sourceType: EarningsSourceType;
  transferId: number | null;
  packPurchaseId: string | null;
  paymentIntentId: string | null;
  checkoutSessionId: string | null;
  eventId: string;
  currency: string;
  grossAmount: number;
  netAmount: number;
  platformFeeAmount: number;
  paidAt: Date;
  activityDate: Date;
  sessionStartTime: Date | null;
  scheduledTransferTime: Date | null;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  sourceLabel: string;
  payoutId: string | null;
  rawStatus: string;
  customerPaymentStatus: MeetingPaymentStatus;
  statusGroup: EarningsStatusGroup;
  statusLabel: string;
};

export type EarningsSummary = {
  currency: string;
  totalLineItems: number;
  totalSessions: number;
  totalPackSales: number;
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
  sessionNetAmount: number;
  packNetAmount: number;
  paidOutAmount: number;
};

export type EarningsCustomerBreakdownItem = {
  customerName: string;
  customerEmail: string;
  totalLineItems: number;
  sessionsCount: number;
  packSalesCount: number;
  grossAmount: number;
  netAmount: number;
  paidOutAmount: number;
  scheduledAmount: number;
  latestActivityDate: string;
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
  earningsLedger: EarningsRecord[];
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
    case 'sale':
      return 'Pack sale recorded';
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
    const resolvedAmounts = resolveMarketplaceAmounts({
      actualGrossAmount: meeting?.stripeAmount,
      configuredGrossAmount: transfer.amount + transfer.platformFee,
      actualPlatformFeeAmount: meeting?.stripeApplicationFeeAmount,
      configuredPlatformFeeAmount: transfer.platformFee,
      configuredExpertAmount: transfer.amount,
    });

    return {
      id: `session-${transfer.id}`,
      sourceType: 'session',
      transferId: transfer.id,
      packPurchaseId: null,
      paymentIntentId: transfer.paymentIntentId,
      checkoutSessionId: transfer.checkoutSessionId,
      eventId: transfer.eventId,
      currency: normalizeCurrency(transfer.currency),
      grossAmount: resolvedAmounts.grossAmount,
      netAmount: resolvedAmounts.expertAmount,
      platformFeeAmount: resolvedAmounts.platformFeeAmount,
      paidAt: transfer.created,
      activityDate: meeting?.startTime ?? transfer.sessionStartTime,
      sessionStartTime: meeting?.startTime ?? transfer.sessionStartTime,
      scheduledTransferTime: transfer.scheduledTransferTime,
      customerName: meeting?.guestName ?? transfer.guestName ?? 'Client',
      customerEmail: meeting?.guestEmail ?? transfer.guestEmail ?? '',
      serviceName: transfer.serviceName ?? 'Session',
      sourceLabel: 'Session',
      payoutId: transfer.payoutId ?? meeting?.stripePayoutId ?? null,
      rawStatus: transfer.status,
      customerPaymentStatus,
      statusGroup,
      statusLabel: getEarningsStatusLabel(statusGroup),
    };
  });
}

export function buildPackEarningsRecords(purchases: PackPurchaseRecord[]): EarningsRecord[] {
  return purchases.map((purchase) => {
    const grossAmount = purchase.grossAmount ?? purchase.packPrice;
    const platformFeeAmount =
      purchase.platformFeeAmount ?? calculateApplicationFee(purchase.packPrice);
    const netAmount = purchase.netAmount ?? Math.max(grossAmount - platformFeeAmount, 0);
    const activityDate = purchase.createdAt;
    const serviceName = purchase.packNameSnapshot ?? purchase.packName ?? 'Session pack';

    return {
      id: `pack-${purchase.id}`,
      sourceType: 'pack',
      transferId: null,
      packPurchaseId: purchase.id,
      paymentIntentId: purchase.stripePaymentIntentId,
      checkoutSessionId: purchase.stripeSessionId,
      eventId: purchase.eventId,
      currency: normalizeCurrency(purchase.currency ?? purchase.packCurrency),
      grossAmount,
      netAmount,
      platformFeeAmount,
      paidAt: purchase.createdAt,
      activityDate,
      sessionStartTime: null,
      scheduledTransferTime: null,
      customerName: purchase.buyerName ?? purchase.buyerEmail ?? 'Client',
      customerEmail: purchase.buyerEmail,
      serviceName,
      sourceLabel: 'Pack sale',
      payoutId: null,
      rawStatus: purchase.status,
      customerPaymentStatus: null,
      statusGroup: 'sale',
      statusLabel: getEarningsStatusLabel('sale'),
    };
  });
}

function isCountedAsEarnings(record: EarningsRecord) {
  if (record.sourceType === 'pack') {
    return record.statusGroup === 'sale';
  }

  return (
    COUNTED_EARNINGS_STATUSES.has(record.rawStatus as PaymentTransferStatus) &&
    record.statusGroup !== 'refunded'
  );
}

function createEmptySummary(currency = 'EUR'): EarningsSummary {
  return {
    currency,
    totalLineItems: 0,
    totalSessions: 0,
    totalPackSales: 0,
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

  summary.totalLineItems = countedRecords.length;
  summary.totalSessions = countedRecords.filter((record) => record.sourceType === 'session').length;
  summary.totalPackSales = countedRecords.filter((record) => record.sourceType === 'pack').length;
  summary.totalCustomers = customerEmails.size;

  for (const record of records) {
    if (isCountedAsEarnings(record)) {
      summary.grossAmount += record.grossAmount;
      summary.netAmount += record.netAmount;
      summary.platformFeeAmount += record.platformFeeAmount;
    }

    if (record.statusGroup === 'scheduled') {
      summary.scheduledAmount += record.netAmount;
      const scheduledTransferTime = record.scheduledTransferTime?.toISOString();
      if (
        scheduledTransferTime &&
        (!summary.nextPayoutDate || scheduledTransferTime < summary.nextPayoutDate)
      ) {
        summary.nextPayoutDate = scheduledTransferTime;
      }
    }

    if (record.statusGroup === 'available') {
      summary.availableAmount += record.netAmount;
      const scheduledTransferTime = record.scheduledTransferTime?.toISOString();
      if (
        scheduledTransferTime &&
        (!summary.nextPayoutDate || scheduledTransferTime < summary.nextPayoutDate)
      ) {
        summary.nextPayoutDate = scheduledTransferTime;
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
    sessionNetAmount: 0,
    packNetAmount: 0,
    paidOutAmount: 0,
  }));

  for (const record of records) {
    if (record.activityDate.getUTCFullYear() !== year || !isCountedAsEarnings(record)) {
      continue;
    }

    const monthIndex = record.activityDate.getUTCMonth();
    months[monthIndex].grossAmount += record.grossAmount;
    months[monthIndex].netAmount += record.netAmount;

    if (record.sourceType === 'pack') {
      months[monthIndex].packNetAmount += record.netAmount;
    } else {
      months[monthIndex].sessionNetAmount += record.netAmount;
    }

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
        totalLineItems: 1,
        sessionsCount: record.sourceType === 'session' ? 1 : 0,
        packSalesCount: record.sourceType === 'pack' ? 1 : 0,
        grossAmount: record.grossAmount,
        netAmount: record.netAmount,
        paidOutAmount: record.statusGroup === 'paid_out' ? record.netAmount : 0,
        scheduledAmount:
          record.statusGroup === 'scheduled' || record.statusGroup === 'available'
            ? record.netAmount
            : 0,
        latestActivityDate: record.activityDate.toISOString(),
      });
      continue;
    }

    existing.totalLineItems += 1;
    existing.packSalesCount += record.sourceType === 'pack' ? 1 : 0;
    existing.sessionsCount += record.sourceType === 'session' ? 1 : 0;
    existing.grossAmount += record.grossAmount;
    existing.netAmount += record.netAmount;
    existing.paidOutAmount += record.statusGroup === 'paid_out' ? record.netAmount : 0;
    existing.scheduledAmount +=
      record.statusGroup === 'scheduled' || record.statusGroup === 'available'
        ? record.netAmount
        : 0;

    if (record.activityDate.toISOString() > existing.latestActivityDate) {
      existing.latestActivityDate = record.activityDate.toISOString();
    }
  }

  return [...customerMap.values()].toSorted((left, right) => right.netAmount - left.netAmount);
}

function aggregateBalanceAmounts(entries: Array<{ currency: string; amount: number }>) {
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

  return records.filter((record) => record.activityDate.getUTCMonth() + 1 === month);
}

async function getPackPurchasesForExpert({
  clerkUserId,
  startDate,
  endDate,
}: {
  clerkUserId: string;
  startDate: Date;
  endDate: Date;
}): Promise<PackPurchaseRecord[]> {
  return db
    .select({
      id: PackPurchaseTable.id,
      packId: PackPurchaseTable.packId,
      eventId: SessionPackTable.eventId,
      expertClerkUserId: PackPurchaseTable.expertClerkUserId,
      buyerEmail: PackPurchaseTable.buyerEmail,
      buyerName: PackPurchaseTable.buyerName,
      packNameSnapshot: PackPurchaseTable.packNameSnapshot,
      eventNameSnapshot: PackPurchaseTable.eventNameSnapshot,
      stripeSessionId: PackPurchaseTable.stripeSessionId,
      stripePaymentIntentId: PackPurchaseTable.stripePaymentIntentId,
      currency: PackPurchaseTable.currency,
      grossAmount: PackPurchaseTable.grossAmount,
      platformFeeAmount: PackPurchaseTable.platformFeeAmount,
      netAmount: PackPurchaseTable.netAmount,
      status: PackPurchaseTable.status,
      maxRedemptions: PackPurchaseTable.maxRedemptions,
      createdAt: PackPurchaseTable.createdAt,
      packName: SessionPackTable.name,
      packCurrency: SessionPackTable.currency,
      packPrice: SessionPackTable.price,
    })
    .from(PackPurchaseTable)
    .innerJoin(SessionPackTable, eq(PackPurchaseTable.packId, SessionPackTable.id))
    .where(
      and(
        eq(SessionPackTable.clerkUserId, clerkUserId),
        gte(PackPurchaseTable.createdAt, startDate),
        lt(PackPurchaseTable.createdAt, endDate),
      ),
    );
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

  const packPurchases = await getPackPurchasesForExpert({
    clerkUserId,
    startDate,
    endDate,
  });

  const meetingsByPaymentIntentId = new Map(
    meetings
      .filter((meeting) => Boolean(meeting.stripePaymentIntentId))
      .map((meeting) => [meeting.stripePaymentIntentId!, meeting]),
  );

  const sessionRecords = buildEarningsRecords(transfers, meetingsByPaymentIntentId);
  const packRecords = buildPackEarningsRecords(packPurchases);
  const yearRecords = [...sessionRecords, ...packRecords];
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
    earningsLedger: periodRecords.toSorted(
      (left, right) => right.activityDate.getTime() - left.activityDate.getTime(),
    ),
    stripeBalance,
    recentPayouts,
  };
}
