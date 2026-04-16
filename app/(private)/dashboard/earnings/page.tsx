import { EarningsChart } from '@/components/features/earnings/EarningsChart';
import { EarningsFilters } from '@/components/features/earnings/EarningsFilters';
import { EarningsStatusBadge } from '@/components/features/earnings/EarningsStatusBadge';
import { StripeConnectWidgets } from '@/components/features/earnings/StripeConnectWidgets';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { isExpert } from '@/lib/auth/roles.server';
import { generateCustomerId } from '@/lib/utils/customerUtils';
import { formatCurrency } from '@/lib/utils/formatters';
import { getExpertEarningsDashboardData } from '@/server/earnings';
import { auth } from '@clerk/nextjs/server';
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
    return String(year);
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

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateWithTime(date: Date) {
  return date.toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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
  const currency = data.periodSummary.currency;
  const upcomingAmount = data.periodSummary.scheduledAmount + data.periodSummary.availableAmount;
  const upcomingSessions = data.earningsLedger.filter(
    (entry) => entry.statusGroup === 'scheduled' || entry.statusGroup === 'available',
  );

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      {/* ── Hero header ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Earnings</h1>
            <EarningsFilters
              selectedYear={year}
              selectedMonth={month}
              availableYears={availableYears}
            />
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <Link href="/account/billing" className="underline-offset-4 hover:underline">
              Payout setup
            </Link>
            <Link href="/appointments" className="underline-offset-4 hover:underline">
              Bookings
            </Link>
          </div>
        </div>

        <div>
          <p className="text-4xl font-bold tracking-tight">
            {formatCurrency(data.periodSummary.netAmount, currency)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Net earnings{month ? ` for ${periodLabel}` : ` in ${year}`}
            {' · '}
            {data.periodSummary.totalSessions} sessions, {data.periodSummary.totalPackSales} packs,{' '}
            {data.periodSummary.totalCustomers} clients
          </p>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            Upcoming {formatCurrency(upcomingAmount, currency)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Paid out {formatCurrency(data.periodSummary.paidOutAmount, currency)}
          </span>
          {data.periodSummary.refundedAmount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
              Refunded {formatCurrency(data.periodSummary.refundedAmount, currency)}
            </span>
          )}
          <span className="text-muted-foreground">
            Client paid {formatCurrency(data.periodSummary.grossAmount, currency)}
            {' · '}Fee {formatCurrency(data.periodSummary.platformFeeAmount, currency)}
          </span>
        </div>
      </div>

      <Separator />

      {/* ── Tabbed content ── */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        {/* ── Performance tab ── */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly earnings in {year}</CardTitle>
              <CardDescription>
                Session revenue and pack sales distributed through the year.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EarningsChart data={data.monthlySeries} currency={currency} year={year} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent payouts</CardTitle>
                <CardDescription>Money that already reached your bank.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentPayouts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payouts yet.</p>
                ) : (
                  data.recentPayouts.slice(0, 3).map((payout) => {
                    const linkedSessions = data.earningsLedger.filter(
                      (entry) => entry.payoutId === payout.id,
                    );

                    return (
                      <div key={payout.id} className="rounded-md border text-sm">
                        <div className="flex items-center justify-between px-3 py-2">
                          <div>
                            <p className="font-medium">
                              {formatCurrency(payout.amount, payout.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Arrived{' '}
                              {payout.arrivalDate
                                ? formatShortDate(new Date(payout.arrivalDate))
                                : 'pending'}
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {payout.status}
                          </Badge>
                        </div>
                        {linkedSessions.length > 0 && (
                          <div className="border-t bg-muted/30 px-3 py-1.5">
                            {linkedSessions.map((session) => {
                              const patientId =
                                session.customerEmail && userId
                                  ? generateCustomerId(userId, session.customerEmail)
                                  : null;

                              return (
                                <div
                                  key={session.id}
                                  className="flex items-center justify-between gap-2 py-1 text-xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    {patientId ? (
                                      <Link
                                        href={`/appointments/patients/${patientId}`}
                                        className="font-medium underline-offset-4 hover:underline"
                                      >
                                        {session.customerName}
                                      </Link>
                                    ) : (
                                      <span className="font-medium">{session.customerName}</span>
                                    )}
                                    <span className="text-muted-foreground">
                                      {' · '}
                                      {session.serviceName}
                                      {session.sessionStartTime && (
                                        <>
                                          {' · '}
                                          {formatShortDate(new Date(session.sessionStartTime))}
                                        </>
                                      )}
                                    </span>
                                  </div>
                                  <span className="shrink-0 tabular-nums text-muted-foreground">
                                    {formatCurrency(session.netAmount, session.currency)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Upcoming</CardTitle>
                <CardDescription>Sessions on their way to your bank.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming payouts right now.</p>
                ) : (
                  upcomingSessions.slice(0, 5).map((session) => {
                    const patientId =
                      session.customerEmail && userId
                        ? generateCustomerId(userId, session.customerEmail)
                        : null;

                    return (
                      <div
                        key={session.id}
                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {patientId ? (
                              <Link
                                href={`/appointments/patients/${patientId}`}
                                className="underline-offset-4 hover:underline"
                              >
                                {session.customerName}
                              </Link>
                            ) : (
                              session.customerName
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.serviceName}
                            {session.sessionStartTime && (
                              <>
                                {' · '}
                                {formatShortDate(new Date(session.sessionStartTime))}
                              </>
                            )}
                            {session.scheduledTransferTime && (
                              <>
                                {' · Est. '}
                                {formatShortDate(new Date(session.scheduledTransferTime))}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-medium tabular-nums">
                            {formatCurrency(session.netAmount, session.currency)}
                          </p>
                          <EarningsStatusBadge
                            statusGroup={session.statusGroup}
                            label={session.statusLabel}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Activity tab (ledger) ── */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Earnings ledger</CardTitle>
              <CardDescription>
                Each session and pack sale with what the client paid, your net, and current status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.earningsLedger.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No earnings found for this period.
                </p>
              ) : (
                <TooltipProvider>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timeline</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Client paid</TableHead>
                        <TableHead className="text-right">You earn</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.earningsLedger.map((entry) => (
                        <TableRow key={entry.id} className="align-top">
                          <TableCell className="whitespace-nowrap text-sm">
                            {entry.sourceType === 'session' && entry.sessionStartTime ? (
                              <>
                                <p className="font-medium">
                                  {formatDateWithTime(new Date(entry.sessionStartTime))}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Booked {formatShortDate(new Date(entry.paidAt))}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {entry.statusGroup === 'paid_out' && entry.payoutId
                                    ? `Paid out · ${entry.payoutId.slice(0, 14)}…`
                                    : entry.scheduledTransferTime
                                      ? `Est. payout ${formatShortDate(new Date(entry.scheduledTransferTime))}`
                                      : 'Payout pending'}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="font-medium">
                                  Purchased {formatShortDate(new Date(entry.paidAt))}
                                </p>
                                <p className="text-xs text-muted-foreground">See Stripe payouts</p>
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  entry.sourceType === 'pack'
                                    ? 'bg-violet-50 text-violet-700'
                                    : 'bg-muted text-muted-foreground'
                                }
                              >
                                {entry.sourceType === 'pack' ? 'Pack' : 'Session'}
                              </Badge>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {entry.customerEmail ? (
                                    <Link
                                      href={`/appointments/patients/${generateCustomerId(userId, entry.customerEmail)}`}
                                      className="underline-offset-4 hover:underline"
                                    >
                                      {entry.customerName}
                                    </Link>
                                  ) : (
                                    entry.customerName
                                  )}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {entry.serviceName}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(entry.grossAmount, entry.currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default font-medium">
                                  {formatCurrency(entry.netAmount, entry.currency)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="text-xs">
                                Fee: {formatCurrency(entry.platformFeeAmount, entry.currency)}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-right">
                            <EarningsStatusBadge
                              statusGroup={entry.statusGroup}
                              label={entry.statusLabel}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TooltipProvider>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stripe payout widgets</CardTitle>
              <CardDescription>
                Live balance and payout history from your connected account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StripeConnectWidgets enabled={Boolean(data.connectAccountId)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Clients tab ── */}
        <TabsContent value="clients">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Clients in {periodLabel}</CardTitle>
              <CardDescription>
                Who paid you the most across sessions and pack sales.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.customerBreakdown.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No client earnings found for this period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Client paid</TableHead>
                      <TableHead className="text-right">You earn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.customerBreakdown.map((customer) => (
                      <TableRow key={customer.customerEmail || customer.customerName}>
                        <TableCell>
                          <p className="font-medium">
                            {customer.customerEmail ? (
                              <Link
                                href={`/appointments/patients/${generateCustomerId(userId, customer.customerEmail)}`}
                                className="underline-offset-4 hover:underline"
                              >
                                {customer.customerName}
                              </Link>
                            ) : (
                              customer.customerName
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {customer.customerEmail || 'No email'}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default tabular-nums">
                                  {customer.totalLineItems}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="text-xs">
                                {customer.sessionsCount} sessions, {customer.packSalesCount} packs
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(customer.grossAmount, currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(customer.netAmount, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
