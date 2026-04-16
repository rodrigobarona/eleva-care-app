'use client';

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { EarningsMonthlySeriesItem } from '@/server/earnings';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const chartConfig = {
  paidOutAmount: {
    label: 'Paid out',
    color: 'var(--chart-1)',
  },
  upcomingAmount: {
    label: 'Upcoming',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig;

type EarningsChartProps = {
  data: EarningsMonthlySeriesItem[];
  currency: string;
  year: number;
};

export function EarningsChart({ data, currency, year }: EarningsChartProps) {
  const hasData = data.some((item) => item.netAmount > 0);

  if (!hasData) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No earnings recorded for this year yet.
      </div>
    );
  }

  const currencySymbol = currency === 'EUR' ? '€' : currency;

  const chartData = data.map((item) => ({
    ...item,
    upcomingAmount: Math.max(item.netAmount - item.paidOutAmount, 0),
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <BarChart
        accessibilityLayer
        data={chartData}
        margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={52}
          tickFormatter={(value: number) =>
            value > 0 ? `${currencySymbol}${(value / 100).toFixed(0)}` : ''
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="min-w-[180px]"
              labelFormatter={(label) => `${label} ${year}`}
              formatter={(value, name) => {
                const amount = Number(value) / 100;
                const displayLabel = name === 'paidOutAmount' ? 'Paid out' : 'Upcoming';
                return [
                  <span key={String(name)} className="tabular-nums">
                    {currencySymbol}
                    {amount.toFixed(2)}
                  </span>,
                  displayLabel,
                ];
              }}
            />
          }
        />
        <Bar
          dataKey="paidOutAmount"
          stackId="earnings"
          fill="var(--color-paidOutAmount)"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="upcomingAmount"
          stackId="earnings"
          fill="var(--color-upcomingAmount)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
