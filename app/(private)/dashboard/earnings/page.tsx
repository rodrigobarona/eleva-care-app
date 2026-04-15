import { EarningsFilters } from '@/components/features/earnings/EarningsFilters';
import { EarningsStatusBadge } from '@/components/features/earnings/EarningsStatusBadge';
import { StripeConnectWidgets } from '@/components/features/earnings/StripeConnectWidgets';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { isExpert } from '@/lib/auth/roles.server';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';
import { type EarningsSummary, getExpertEarningsDashboardData } from '@/server/earnings';
import { auth } from '@clerk/nextjs/server';
import { AlertCircle, ArrowRight, CalendarClock, CreditCard, Wallet } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function parseYear(value: string | string[] | undefined) {
  const currentYear = new Date().getUTCFullYear();
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw || '', 10);

  if (Number.isNaN(parsed)) {
    return currentYear;
  }

  return Math.min(Math.max(parsed, 2024), currentYear + 1);
}

function parseMonth(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 12) {
    return null;
  }

  return parsed;
}

function getPeriodLabel(year: number, month: number | null) {
  if (!month) {
    return `All earnings in ${year}`;
  }

  return `${MONTH_LABELS[month - 1]} ${year}`;
}

function buildAvailableYears(selectedYear: number) {
  const currentYear = new Date().getUTCFullYear();
  const years = new Set<number>([
    currentYear,
    currentYear - 1,
    currentYear - 2,
    currentYear - 3,
    selectedYear,
  ]);
  return [...years].filter((year) => year >= 2024).toSorted((left, right) => right - left);
}

function SummaryCard({
  title,
  amount,
  description,
}: {
  title: string;
  amount: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{amount}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function SummaryBreakdown({ summary }: { summary: EarningsSummary }) {
  return (
    <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
      <p>Client paid: {formatCurrency(summary.grossAmount, summary.currency)}</p>
      <p>Your net earnings: {formatCurrency(summary.netAmount, summary.currency)}</p>
      <p>Platform fee: {formatCurrency(summary.platformFeeAmount, summary.currency)}</p>
      <p>
        Sessions / pack sales / clients: {summary.totalSessions} / {summary.totalPackSales} /{' '}
        {summary.totalCustomers}
      </p>
    </div>
  );
}

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const { userId } = await auth();

  if (!userId) {
    redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);
  }

  if (!(await isExpert())) {
    redirect(`${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}`);
  }

  const year = parseYear(resolvedSearchParams.year);
  const month = parseMonth(resolvedSearchParams.month);
  const data = await getExpertEarningsDashboardData({
    clerkUserId: userId,
    year,
    month,
  });

  const availableYears = buildAvailableYears(year);
  const periodLabel = getPeriodLabel(year, month);
  const selectedPeriodPending =
    data.periodSummary.scheduledAmount + data.periodSummary.availableAmount;

  return (
    <div className="container space-y-8 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Earnings</h1>
          <p className="max-w-3xl text-muted-foreground">
            Track what clients have paid across sessions and pack sales, what you earned on each
            line item, what is still on the way, and what has already reached your bank account.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" asChild>
            <Link href="/account/billing">Manage payout setup</Link>
          </Button>
          <Button asChild>
            <Link href="/appointments">
              Review bookings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <CardTitle>{periodLabel}</CardTitle>
            <CardDescription>
              Use the filters to review earnings by month while keeping your yearly totals in view.
            </CardDescription>
          </div>
          <EarningsFilters
            selectedYear={year}
            selectedMonth={month}
            availableYears={availableYears}
          />
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Selected period"
          amount={formatCurrency(data.periodSummary.netAmount, data.periodSummary.currency)}
          description={`Net earnings for ${periodLabel.toLowerCase()}.`}
        />
        <SummaryCard
          title="This year"
          amount={formatCurrency(data.yearSummary.netAmount, data.yearSummary.currency)}
          description={`Net earnings across all ${year} sessions and pack sales.`}
        />
        <SummaryCard
          title="Upcoming payout"
          amount={formatCurrency(selectedPeriodPending, data.periodSummary.currency)}
          description="Session earnings marked as scheduled or available before they reach your bank."
        />
        <SummaryCard
          title="Paid out"
          amount={formatCurrency(data.periodSummary.paidOutAmount, data.periodSummary.currency)}
          description="Amounts already marked as paid out to your bank."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What this means</CardTitle>
          <CardDescription>
            A quick split between what the client paid, what you keep, and what is already out.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SummaryBreakdown summary={data.periodSummary} />
          {data.periodSummary.refundedAmount > 0 || data.periodSummary.issueAmount > 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Adjustments detected</AlertTitle>
              <AlertDescription>
                Refunded:{' '}
                {formatCurrency(data.periodSummary.refundedAmount, data.periodSummary.currency)}.
                Needs attention:{' '}
                {formatCurrency(data.periodSummary.issueAmount, data.periodSummary.currency)}.
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Monthly earnings</CardTitle>
            <CardDescription>
              See how session revenue and pack sales are distributed through the year.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.monthlySeries.every((item) => item.netAmount === 0) ? (
              <p className="text-sm text-muted-foreground">
                No paid session earnings recorded for this year yet.
              </p>
            ) : (
              data.monthlySeries.map((item) => {
                const maxAmount = Math.max(
                  ...data.monthlySeries.map((entry) => entry.netAmount),
                  1,
                );
                const width = `${Math.max((item.netAmount / maxAmount) * 100, item.netAmount > 0 ? 8 : 0)}%`;

                return (
                  <div key={item.month} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.label}</span>
                      <div className="text-right text-muted-foreground">
                        <p>{formatCurrency(item.netAmount, data.yearSummary.currency)}</p>
                        <p className="text-xs">
                          Sessions{' '}
                          {formatCurrency(item.sessionNetAmount, data.yearSummary.currency)}
                          {' · '}Packs{' '}
                          {formatCurrency(item.packNetAmount, data.yearSummary.currency)}
                        </p>
                        <p className="text-xs">
                          Paid out {formatCurrency(item.paidOutAmount, data.yearSummary.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-eleva-primary" style={{ width }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Stripe balance snapshot
              </CardTitle>
              <CardDescription>
                Live balance information from your connected Stripe account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {data.stripeBalance ? (
                <>
                  <div className="flex items-center justify-between">
                    <span>Available now</span>
                    <span className="font-medium">
                      {formatCurrency(
                        data.stripeBalance.availableAmount,
                        data.stripeBalance.currency,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pending in Stripe</span>
                    <span className="font-medium">
                      {formatCurrency(
                        data.stripeBalance.pendingAmount,
                        data.stripeBalance.currency,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Instant payout eligible</span>
                    <span className="font-medium">
                      {formatCurrency(
                        data.stripeBalance.instantAvailableAmount,
                        data.stripeBalance.currency,
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Finish your billing setup to see live Stripe balance data here.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Recent payouts
              </CardTitle>
              <CardDescription>Your latest Stripe payout events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentPayouts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Stripe payouts found yet.</p>
              ) : (
                data.recentPayouts.map((payout) => (
                  <div key={payout.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium">
                        {formatCurrency(payout.amount, payout.currency)}
                      </span>
                      <span className="capitalize text-muted-foreground">{payout.status}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Created {formatDateTime(new Date(payout.createdAt))}
                    </p>
                    <p className="text-muted-foreground">
                      Arrival{' '}
                      {payout.arrivalDate
                        ? formatDateTime(new Date(payout.arrivalDate))
                        : 'Pending'}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Clients in {periodLabel}</CardTitle>
            <CardDescription>
              Who paid you the most across sessions and pack sales, plus how much is still on the
              way.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.customerBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No customer earnings found for the selected period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Packs</TableHead>
                    <TableHead className="text-right">Client paid</TableHead>
                    <TableHead className="text-right">You earn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.customerBreakdown.map((customer) => (
                    <TableRow key={customer.customerEmail || customer.customerName}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {customer.customerEmail || 'No email'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{customer.sessionsCount}</TableCell>
                      <TableCell className="text-right">{customer.packSalesCount}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(customer.grossAmount, data.periodSummary.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <p>{formatCurrency(customer.netAmount, data.periodSummary.currency)}</p>
                          <p className="text-xs text-muted-foreground">
                            Paid out{' '}
                            {formatCurrency(customer.paidOutAmount, data.periodSummary.currency)}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Earnings ledger</CardTitle>
            <CardDescription>
              A line-by-line view of sessions and pack sales, what the client paid, and payout
              timing when it is available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.earningsLedger.length === 0 ? (
              <p className="text-sm text-muted-foreground">No earnings found for this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Client paid</TableHead>
                    <TableHead className="text-right">You earn</TableHead>
                    <TableHead>Payout timing</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.earningsLedger.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.sourceLabel}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.serviceName}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.sourceType === 'session' && entry.sessionStartTime
                              ? formatDateTime(new Date(entry.sessionStartTime))
                              : `Purchased ${formatDateTime(new Date(entry.activityDate))}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            Paid {formatDateTime(new Date(entry.paidAt))}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(entry.grossAmount, entry.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <p>{formatCurrency(entry.netAmount, entry.currency)}</p>
                          <p className="text-xs text-muted-foreground">
                            Fee {formatCurrency(entry.platformFeeAmount, entry.currency)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {entry.scheduledTransferTime ? (
                            <p>{formatDateTime(new Date(entry.scheduledTransferTime))}</p>
                          ) : (
                            <p>See Stripe balance and payouts</p>
                          )}
                          {entry.payoutId ? (
                            <p className="text-xs">Payout ID: {entry.payoutId}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <EarningsStatusBadge
                          statusGroup={entry.statusGroup}
                          label={entry.statusLabel}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Stripe payout widgets
            </CardTitle>
            <CardDescription>
              Live connected account widgets for balance visibility and payout history.
            </CardDescription>
          </div>
          {data.connectAccountId ? null : (
            <Button variant="outline" asChild>
              <Link href="/account/billing">Connect Stripe</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <StripeConnectWidgets enabled={Boolean(data.connectAccountId)} />
        </CardContent>
      </Card>
    </div>
  );
}
